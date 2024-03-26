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
import type { z } from 'zod';
import { retrieveServicePromptTemplate } from '@/services/ai/prompts/retrieveService';
import { retrieveServiceSchema } from '@/services/ai/schemas/retrieveService';
import apiKnowledgebase from '@/services/ai/resources/api-knowledgebase.json';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import {
	generateCurlCommandFallbackPromptTemplate,
	generateCurlCommandPromptTemplate,
} from '@/services/ai/prompts/generateCurl';
import { generateCurlSchema } from '@/services/ai/schemas/generateCurl';
import { PineconeStore } from '@langchain/pinecone';

interface APIKnowledgebaseService {
	id: string;
	title: string;
	description?: string;
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

		const services = apiKnowledgebase as unknown as APIKnowledgebaseService[];
		const servicesListForPrompt = services
			.slice(0, 240)
			.map((service) => [service.id, service.title ?? '', service.description ?? ''].join(' | '))
			.join('\n');

		const retrieveServiceChain = retrieveServicePromptTemplate
			.pipe(this.provider.modelWithOutputParser(retrieveServiceSchema))
			.pipe(this.jsonOutputParser);

		const matchedService = (await retrieveServiceChain.invoke({
			services: servicesListForPrompt,
			serviceName,
			serviceRequest,
		})) as z.infer<typeof retrieveServiceSchema>;

		const matchedServiceEntry = services.find((service) => service.id === matchedService.id);
		if (matchedService.id === 'unknown' || !matchedService.id || !matchedServiceEntry) {
			console.log("Didn't match any service");
			return await this.generateCurlGeneric(serviceName, serviceRequest);
		} else {
			console.log('Matched service', matchedServiceEntry);
		}

		const pcIndex = this.pinecone.Index('api-knowledgebase');
		const vectorStore = await PineconeStore.fromExistingIndex(this.provider.embeddings, {
			namespace: 'endpoints',
			pineconeIndex: pcIndex,
		});

		const matchedDocuments = await vectorStore.similaritySearch(serviceRequest, 4, {
			id: matchedService.id,
		});

		const aggregatedDocuments = matchedDocuments.reduce<unknown[]>((acc, document) => {
			const pageData = jsonParse(document.pageContent);

			acc.push(pageData);

			return acc;
		}, []);

		const generateCurlChain = generateCurlCommandPromptTemplate
			.pipe(this.provider.modelWithOutputParser(generateCurlSchema))
			.pipe(this.jsonOutputParser);
		return (await generateCurlChain.invoke({
			endpoints: JSON.stringify(aggregatedDocuments),
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
