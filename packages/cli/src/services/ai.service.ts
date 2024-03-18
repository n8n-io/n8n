import { Service } from 'typedi';
import config from '@/config';
import type { INodeType, N8nAIProviderType, NodeError } from 'n8n-workflow';
import { ApplicationError, jsonParse } from 'n8n-workflow';
import { debugErrorPromptTemplate } from '@/services/ai/prompts/debugError';
import type { BaseMessageLike } from '@langchain/core/messages';
import { AIProviderOpenAI } from '@/services/ai/providers/openai';
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { summarizeNodeTypeProperties } from '@/services/ai/utils/summarizeNodeTypeProperties';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import type { z } from 'zod';
import { retrieveOpenAPIServicePromptTemplate } from '@/services/ai/prompts/retrieveOpenAPIService';
import { retrieveOpenAPIServiceSchema } from '@/services/ai/schemas/retrieveOpenAPIService';
import openAPIServices from '@/services/ai/resources/openapi-services.json';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import { merge } from 'lodash';
import {
	generateCurlCommandFallbackPromptTemplate,
	generateCurlCommandPromptTemplate,
} from '@/services/ai/prompts/generateCurl';
import { generateCurlSchema } from '@/services/ai/schemas/generateCurl';

interface OpenAPIService {
	service: string;
	resource?: string;
	host?: string;
	title: string;
	description: string;
	securityDefinitions?: Record<string, string>;
	components?: {
		securitySchemes?: Record<string, string>;
	};
}

function isN8nAIProviderType(value: string): value is N8nAIProviderType {
	return ['openai'].includes(value);
}

@Service()
export class AIService {
	private providerType: N8nAIProviderType = 'unknown';

	public provider: AIProviderOpenAI;

	public pinecone: Pinecone;

	private jsonOutputParser = new JsonOutputFunctionsParser();

	constructor() {
		const providerName = config.getEnv('ai.provider');

		if (isN8nAIProviderType(providerName)) {
			this.providerType = providerName;
		}

		if (this.providerType === 'openai') {
			const openAIApiKey = config.getEnv('ai.openAI.apiKey');
			const openAIModelName = config.getEnv('ai.openAI.model');

			console.log('openAIApiKey:', openAIApiKey);
			console.log('openAIModelName:', openAIModelName);

			if (openAIApiKey) {
				this.provider = new AIProviderOpenAI({ openAIApiKey, modelName: openAIModelName });
			}
		}

		const pineconeApiKey = config.getEnv('ai.pinecone.apiKey');
		if (pineconeApiKey) {
			this.pinecone = new Pinecone({
				apiKey: pineconeApiKey,
			});
		}
	}

	async prompt(messages: BaseMessageLike[], options?: BaseChatModelCallOptions) {
		return await this.provider.invoke(messages, options);
	}

	async debugError(error: NodeError, nodeType?: INodeType) {
		if (!this.provider) {
			throw new ApplicationError('No AI provider has been configured.');
		}

		const chain = debugErrorPromptTemplate.pipe(this.provider.model);
		const result = await chain.invoke({
			nodeType: nodeType?.description.displayName ?? 'n8n Node',
			error: JSON.stringify(error),
			properties: JSON.stringify(
				summarizeNodeTypeProperties(nodeType?.description.properties ?? []),
			),
			documentationUrl: nodeType?.description.documentationUrl ?? 'https://docs.n8n.io',
		});

		return this.provider.mapResponse(result);
	}

	async generateCurl(serviceName: string, serviceRequest: string) {
		if (!this.provider) {
			throw new ApplicationError('No AI provider has been configured.');
		}

		if (!this.pinecone) {
			return await this.generateCurlGeneric(serviceName, serviceRequest);
		}

		const services = openAPIServices as OpenAPIService[];
		const servicesListForPrompt = services
			.map((service) =>
				[
					service.service,
					service.resource ?? '',
					service.title ?? '',
					service.description ?? '',
				].join(' | '),
			)
			.join('\n');

		const retrieveOpenAPIServiceChain = retrieveOpenAPIServicePromptTemplate
			.pipe(this.provider.modelWithOutputParser(retrieveOpenAPIServiceSchema))
			.pipe(this.jsonOutputParser);
		const openAPIService = (await retrieveOpenAPIServiceChain.invoke({
			services: servicesListForPrompt,
			serviceName,
			serviceRequest,
		})) as z.infer<typeof retrieveOpenAPIServiceSchema>;

		const matchedOpenAPIService = services.find(
			(service) =>
				service.service === openAPIService.service && service.resource === openAPIService.resource,
		);

		if (openAPIService.service === 'unknown' || !matchedOpenAPIService) {
			return await this.generateCurlGeneric(serviceName, serviceRequest);
		}

		const pcIndex = this.pinecone.Index('openapi');

		const vectorStore = await PineconeStore.fromExistingIndex(this.provider.embeddings, {
			namespace: 'apiPaths',
			pineconeIndex: pcIndex,
		});

		const matchedDocuments = await vectorStore.similaritySearch(serviceRequest, 4, {
			service: openAPIService.service,
			resource: openAPIService.resource,
		});

		const aggregatedPaths = matchedDocuments.reduce((acc, document) => {
			const pageData = jsonParse(document.pageContent);

			return merge(acc, pageData);
		}, {});

		const openApiDefinition = {
			...matchedOpenAPIService,
			paths: aggregatedPaths,
		};

		console.log('openApiDefinition:', JSON.stringify(openApiDefinition, null, 2));

		const generateCurlChain = generateCurlCommandPromptTemplate
			.pipe(this.provider.modelWithOutputParser(generateCurlSchema))
			.pipe(this.jsonOutputParser);
		return (await generateCurlChain.invoke({
			openApi: JSON.stringify(openApiDefinition),
			serviceName,
			serviceRequest,
		})) as z.infer<typeof generateCurlSchema>;
	}

	async generateCurlGeneric(serviceName: string, serviceRequest: string) {
		if (!this.provider) {
			throw new ApplicationError('No AI provider has been configured.');
		}

		const generateCurlFallbackChain = generateCurlCommandFallbackPromptTemplate
			.pipe(this.provider.modelWithOutputParser(generateCurlSchema))
			.pipe(this.jsonOutputParser);
		return (await generateCurlFallbackChain.invoke({
			serviceName,
			serviceRequest,
		})) as z.infer<typeof generateCurlSchema>;
	}
}
