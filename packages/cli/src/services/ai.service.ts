import { Service } from 'typedi';
import config from '@/config';
import type { N8nAIProviderType } from 'n8n-workflow';
import { ApplicationError, jsonParse } from 'n8n-workflow';
import type { BaseMessageLike } from '@langchain/core/messages';
import { AIProviderOpenAI } from '@/services/ai/providers/openai';
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { Pinecone } from '@pinecone-database/pinecone';
import type { z } from 'zod';
import apiKnowledgebase from '@/services/ai/resources/api-knowledgebase.json';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import {
	generateCurlCommandFallbackPromptTemplate,
	generateCurlCommandPromptTemplate,
} from '@/services/ai/prompts/generateCurl';
import { generateCurlSchema } from '@/services/ai/schemas/generateCurl';
import { PineconeStore } from '@langchain/pinecone';
import Fuse from 'fuse.js';
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
		if (!this.provider) {
			throw new ApplicationError('No AI provider has been configured.');
		}

		return await this.provider.invoke(messages, options);
	}

	validateCurl(result: { curl: string }) {
		if (!result.curl.startsWith('curl')) {
			throw new ApplicationError(
				'The generated HTTP Request Node parameters format is incorrect. Please adjust your request and try again.',
			);
		}

		result.curl = result.curl
			/*
			 * Replaces placeholders like `{VALUE}` or `{{VALUE}}` with quoted placeholders `"{VALUE}"` or `"{{VALUE}}"`,
			 * ensuring that the placeholders are properly formatted within the curl command.
			 * - ": a colon followed by a double quote and a space
			 * - ( starts a capturing group
			 *   - \{\{ two opening curly braces
			 *   - [A-Za-z0-9_]+ one or more alphanumeric characters or underscores
			 *   - }} two closing curly braces
			 *   - | OR
			 *   - \{ an opening curly brace
			 *   - [A-Za-z0-9_]+ one or more alphanumeric characters or underscores
			 *   - } a closing curly brace
			 * - ) ends the capturing group
			 * - /g performs a global search and replace
			 *
			 */
			.replace(/": (\{\{[A-Za-z0-9_]+}}|\{[A-Za-z0-9_]+})/g, '": "$1"') // Fix for placeholders `curl -d '{ "key": {VALUE} }'`
			/*
			 * Removes the rogue curly bracket at the end of the curl command if it is present.
			 * It ensures that the curl command is properly formatted and doesn't have an extra closing curly bracket.
			 * - ( starts a capturing group
			 *   - -d flag in the curl command
			 *   - ' a single quote
			 *   - [^']+ one or more characters that are not a single quote
			 *   - ' a single quote
			 * - ) ends the capturing group
			 * - } a closing curly bracket
			 */
			.replace(/(-d '[^']+')}/, '$1'); // Fix for rogue curly bracket `curl -d '{ "key": "value" }'}`

		return result;
	}

	async generateCurl(serviceName: string, serviceRequest: string) {
		this.checkRequirements();

		if (!this.pinecone) {
			return await this.generateCurlGeneric(serviceName, serviceRequest);
		}

		const fuse = new Fuse(apiKnowledgebase as unknown as APIKnowledgebaseService[], {
			threshold: 0.25,
			useExtendedSearch: true,
			keys: ['id', 'title'],
		});

		const matchedServices = fuse
			.search(serviceName.replace(/ +/g, '|'))
			.map((result) => result.item);

		if (matchedServices.length === 0) {
			return await this.generateCurlGeneric(serviceName, serviceRequest);
		}

		const pcIndex = this.pinecone.Index('api-knowledgebase');
		const vectorStore = await PineconeStore.fromExistingIndex(this.provider.embeddings, {
			namespace: 'endpoints',
			pineconeIndex: pcIndex,
		});

		const matchedDocuments = await vectorStore.similaritySearch(
			`${serviceName} ${serviceRequest}`,
			4,
			{
				id: {
					$in: matchedServices.map((service) => service.id),
				},
			},
		);

		if (matchedDocuments.length === 0) {
			return await this.generateCurlGeneric(serviceName, serviceRequest);
		}

		const aggregatedDocuments = matchedDocuments.reduce<unknown[]>((acc, document) => {
			const pageData = jsonParse(document.pageContent);

			acc.push(pageData);

			return acc;
		}, []);

		const generateCurlChain = generateCurlCommandPromptTemplate
			.pipe(this.provider.modelWithOutputParser(generateCurlSchema))
			.pipe(this.jsonOutputParser);
		const result = (await generateCurlChain.invoke({
			endpoints: JSON.stringify(aggregatedDocuments),
			serviceName,
			serviceRequest,
		})) as z.infer<typeof generateCurlSchema>;

		return this.validateCurl(result);
	}

	async generateCurlGeneric(serviceName: string, serviceRequest: string) {
		this.checkRequirements();

		const generateCurlFallbackChain = generateCurlCommandFallbackPromptTemplate
			.pipe(this.provider.modelWithOutputParser(generateCurlSchema))
			.pipe(this.jsonOutputParser);
		const result = (await generateCurlFallbackChain.invoke({
			serviceName,
			serviceRequest,
		})) as z.infer<typeof generateCurlSchema>;

		return this.validateCurl(result);
	}

	checkRequirements() {
		if (!this.provider) {
			throw new ApplicationError('No AI provider has been configured.');
		}
	}
}
