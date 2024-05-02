import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import type { BaseMessageChunk, BaseMessageLike } from '@langchain/core/messages';
import type { N8nAIProvider } from '@/types/ai.types';
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodSchema } from 'zod';

export class AIProviderOpenAI implements N8nAIProvider {
	public model: ChatOpenAI;

	public embeddings: OpenAIEmbeddings;

	constructor({ openAIApiKey, modelName }: { openAIApiKey: string; modelName: string }) {
		this.model = new ChatOpenAI({
			openAIApiKey,
			modelName,
			timeout: 60000,
			maxRetries: 2,
			temperature: 0,
		});

		this.embeddings = new OpenAIEmbeddings({
			openAIApiKey,
			modelName: 'text-embedding-3-small',
		});
	}

	modelWithOutputParser<T extends ZodSchema>(schema: T) {
		return this.model.bind({
			functions: [
				{
					name: 'output_formatter',
					description: 'Should always be used to properly format output',
					parameters: zodToJsonSchema(schema),
				},
			],
			function_call: {
				name: 'output_formatter',
			},
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

	async invoke(messages: BaseMessageLike[], options?: BaseChatModelCallOptions) {
		const data = await this.model.invoke(messages, options);

		return this.mapResponse(data);
	}
}
