import type { IHttpRequestMethods } from 'n8n-workflow';
import {
	BaseChatModel,
	type ChatModelConfig,
	type GenerateResult,
	type Message,
	type StreamChunk,
} from '@n8n/ai-node-sdk';

interface ModelConfig extends ChatModelConfig {
	url: string;
}

interface ProviderResponse {
	id?: string;
	response: string;
	tokenUsage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

interface RequestConfig {
	httpRequest: (
		method: IHttpRequestMethods,
		url: string,
		body?: object,
		headers?: Record<string, string>,
	) => Promise<{ body: unknown }>;
	openStream: (
		method: IHttpRequestMethods,
		url: string,
		body?: object,
		headers?: Record<string, string>,
	) => Promise<{ body: AsyncIterableIterator<string> }>;
}

export class CustomChatModel extends BaseChatModel<ModelConfig> {
	private baseURL: string;

	constructor(
		modelId: string = 'my-model',
		private requests: RequestConfig,
		config: ModelConfig,
	) {
		super('custom-provider', modelId, config);
		this.baseURL = config.url;
	}

	async generate(messages: Message[], config?: ModelConfig): Promise<GenerateResult> {
		const merged = this.mergeConfig(config);
		// Convert n8n messages to provider format
		const providerMessages = messages.map((m) => ({
			role: m.role,
			content: m.content
				.filter((c) => c.type === 'text')
				.map((c) => c.text)
				.join('\n'),
		}));

		const requestBody = {
			model: this.modelId,
			messages: providerMessages,
			temperature: merged.temperature,
		};

		const response = await this.requests.httpRequest(
			'POST',
			`${this.baseURL}/generate`,
			requestBody,
		);
		const body = response.body as ProviderResponse;

		// Convert provider response to n8n message
		const message: Message = {
			role: 'assistant',
			content: [{ type: 'text', text: body.response }],
		};

		return {
			id: body.id,
			finishReason: 'stop',
			usage: {
				promptTokens: body.tokenUsage?.promptTokens ?? 0,
				completionTokens: body.tokenUsage?.completionTokens ?? 0,
				totalTokens: body.tokenUsage?.totalTokens ?? 0,
			},
			message,
		};
	}

	async *stream(messages: Message[], config?: ModelConfig): AsyncIterable<StreamChunk> {
		const merged = this.mergeConfig(config);
		// Convert n8n messages to provider format
		const providerMessages = messages.map((m) => ({
			role: m.role,
			content: m.content
				.filter((c) => c.type === 'text')
				.map((c) => c.text)
				.join('\n'),
		}));

		const requestBody = {
			model: this.modelId,
			messages: providerMessages,
			temperature: merged.temperature,
		};
		const response = await this.requests.openStream('POST', `${this.baseURL}/stream`, requestBody);
		for await (const chunk of response.body) {
			yield { type: 'text-delta', delta: chunk };
		}
		yield { type: 'finish', finishReason: 'stop' };
	}
}
