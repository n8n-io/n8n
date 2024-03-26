import { Service } from 'typedi';
import config from '@/config';
import type { INodeType, N8nAIProviderType, NodeError } from 'n8n-workflow';
import { createDebugErrorPrompt } from '@/services/ai/prompts/debugError';
import type { BaseMessageLike } from '@langchain/core/messages';
import { AIProviderOpenAI } from '@/services/ai/providers/openai';
import { AIProviderUnknown } from '@/services/ai/providers/unknown';

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

	async prompt(messages: BaseMessageLike[]) {
		return await this.model.prompt(messages);
	}

	async debugError(error: NodeError, nodeType?: INodeType) {
		return await this.prompt(createDebugErrorPrompt(error, nodeType));
	}
}
