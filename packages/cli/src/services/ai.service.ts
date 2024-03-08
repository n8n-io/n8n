import { Service } from 'typedi';
import config from '@/config';
import type { INodeType, N8nAIProviderType, NodeError } from 'n8n-workflow';
import { AIProviderOpenAI } from '@/services/ai/providers/openai';
import { ApplicationError } from 'n8n-workflow';
import { createDebugErrorPrompt } from '@/services/ai/prompts/debugError';
import type { BaseMessageLike } from '@langchain/core/messages';

function isN8nAIProviderType(value: string): value is N8nAIProviderType {
	return ['openai'].includes(value);
}

@Service()
export class AIService {
	private provider: N8nAIProviderType;

	public model: AIProviderOpenAI;

	constructor() {
		const providerName = config.getEnv('ai.provider');
		if (!isN8nAIProviderType(providerName)) {
			throw new ApplicationError('Invalid AI provider. Please check the configuration.');
		}

		this.provider = providerName;
		switch (this.provider) {
			default:
				this.model = new AIProviderOpenAI();
		}
	}

	async prompt(messages: BaseMessageLike[]) {
		return await this.model.prompt(messages);
	}

	async debugError(error: NodeError, nodeType?: INodeType) {
		return await this.prompt(createDebugErrorPrompt(error, nodeType));
	}
}
