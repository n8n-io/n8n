import { Service } from 'typedi';
import config from '@/config';
import type { INodeType, N8nAIProviderType, NodeError } from 'n8n-workflow';
import { createDebugErrorPrompt } from '@/services/ai/prompts/debugError';
import type { BaseMessageLike } from '@langchain/core/messages';
import { AIProviderOpenAI } from '@/services/ai/providers/openai';
import { AIProviderUnknown } from '@/services/ai/providers/unknown';
import { createGenerateCurlPrompt } from '@/services/ai/prompts/generateCurl';
import type { BaseChatModelCallOptions } from '@langchain/core/dist/language_models/chat_models';
import { ApplicationError, jsonParse } from 'n8n-workflow';

function isN8nAIProviderType(value: string): value is N8nAIProviderType {
	return ['openai'].includes(value);
}

@Service()
export class AIService {
	private provider: N8nAIProviderType = 'unknown';

	public model: AIProviderOpenAI | AIProviderUnknown = new AIProviderUnknown();

	constructor() {
		const providerName = config.getEnv('ai.provider');
		if (isN8nAIProviderType(providerName)) {
			this.provider = providerName;
		}

		if (this.provider === 'openai') {
			const apiKey = config.getEnv('ai.openAIApiKey');
			if (apiKey) {
				this.model = new AIProviderOpenAI({ apiKey });
			}
		}
	}

	async prompt(messages: BaseMessageLike[], options?: BaseChatModelCallOptions) {
		return await this.model.prompt(messages, options);
	}

	async debugError(error: NodeError, nodeType?: INodeType) {
		return await this.prompt(createDebugErrorPrompt(error, nodeType));
	}

	async generateCurl(service: string, request: string) {
		const data = await this.prompt(createGenerateCurlPrompt(service, request));

		try {
			console.log('Data:', data);
			console.log('Request data:', service, request, typeof data);
			const { curl, metadata } = jsonParse<{ curl: string; metadata: object }>(data);
			return { curl, metadata };
		} catch (error) {
			throw new ApplicationError(
				'The response from the AI service was not in the expected format.',
			);
		}
	}
}
