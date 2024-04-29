import { ChatOpenAI } from '@langchain/openai';
import type { BaseMessageChunk, BaseMessageLike } from '@langchain/core/messages';
import type { N8nAIProvider } from '@/types/ai.types';

export class AIProviderOpenAI implements N8nAIProvider {
	private model: ChatOpenAI;

	constructor(options: { apiKey: string }) {
		this.model = new ChatOpenAI({
			openAIApiKey: options.apiKey,
			modelName: 'gpt-3.5-turbo-16k',
			timeout: 60000,
			maxRetries: 2,
			temperature: 0.2,
		});
	}

	mapResponse(data: BaseMessageChunk): string {
		if (Array.isArray(data.content)) {
			return data.content
				.map((message): string =>
					'text' in message
						? (message.text as string)
						: 'image_url' in message
							? (message.image_url as string)
							: '',
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
