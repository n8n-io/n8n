import config from '@/config';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseMessageChunk, BaseMessageLike } from '@langchain/core/messages';
import type { N8nAIProvider } from '@/types/ai.types';

export class AIProviderOpenAI implements N8nAIProvider {
	private model: ChatOpenAI;

	constructor() {
		this.model = new ChatOpenAI({
			openAIApiKey: config.getEnv('ai.openAIApiKey'),
			modelName: 'gpt-3.5-turbo-16k',
			timeout: 60000,
			maxRetries: 2,
		});
	}

	mapResponse(data: BaseMessageChunk): string {
		if (Array.isArray(data.content)) {
			return data.content
				.map((message) =>
					'text' in message ? message.text : 'image_url' in message ? message.image_url : '',
				)
				.join('\n');
		}

		return data.content;
	}

	async prompt(messages: BaseMessageLike[]) {
		const data = await this.model.invoke(messages);

		return this.mapResponse(data);
	}
}
