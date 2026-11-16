import type { IHttpRequestMethods } from 'n8n-workflow';
import {
	BaseChatModel,
	type ChatModelConfig,
	type GenerateResult,
	type Message,
	type ProviderTool,
	type StreamChunk,
} from 'src';

import {
	definedHeaders,
	genericMessagesToResponsesInput,
	genericToolToResponsesTool,
	isReasoningInput,
} from './openai/request';
import {
	isReasoningItem,
	isResponsesResponse,
	parseResponsesOutput,
	parseTokenUsage,
	responseFailedError,
	toFinishReason,
	toReasoningContent,
} from './openai/response';
import { toStreamChunks } from './openai/stream';
import type {
	OpenAIResponsesRequest,
	OpenAIResponsesResponse,
	OpenAIToolChoice,
} from './openai/types';

type OpenAIChatModelConfig = ChatModelConfig & {
	apiKey?: string;
	baseURL?: string;
	toolChoice?: OpenAIToolChoice;

	providerTools?: ProviderTool[];
};

type RequestConfig = {
	httpRequest: (
		method: IHttpRequestMethods,
		url: string,
		body?: object,
		headers?: Record<string, string>,
		abortSignal?: ChatModelConfig['abortSignal'],
	) => Promise<{ body: unknown }>;
	openStream: (
		method: IHttpRequestMethods,
		url: string,
		body?: object,
		headers?: Record<string, string>,
		abortSignal?: ChatModelConfig['abortSignal'],
	) => Promise<{ body: AsyncIterableIterator<Buffer | Uint8Array> }>;
};

function toGenerateResult(body: OpenAIResponsesResponse): GenerateResult {
	const { text, toolCalls } = parseResponsesOutput(body.output);
	const reasoningItems = body.output.filter(isReasoningItem);
	const content = reasoningItems.map(toReasoningContent);
	for (const toolCall of toolCalls) {
		content.push({
			type: 'tool-call',
			toolCallId: toolCall.id,
			toolName: toolCall.name,
			input: JSON.stringify(toolCall.arguments),
		});
	}
	content.push({ type: 'text', text });

	return {
		id: body.id,
		finishReason: toFinishReason(body, toolCalls.length > 0),
		usage: parseTokenUsage(body.usage),
		message: { role: 'assistant', content, id: body.id },
		rawResponse: body,
		providerMetadata: {
			model_provider: 'openai',
			model: body.model,
			created_at: body.created_at,
			id: body.id,
			incomplete_details: body.incomplete_details,
			metadata: body.metadata,
			object: body.object,
			status: body.status,
			user: body.user,
			service_tier: body.service_tier,
			model_name: body.model,
			output: body.output,
			...(reasoningItems.length > 0 && { reasoning: reasoningItems[reasoningItems.length - 1] }),
		},
	};
}

export class OpenAIChatModel extends BaseChatModel<OpenAIChatModelConfig> {
	private readonly baseURL: string;

	private readonly requests: RequestConfig;

	constructor(modelId: string = 'gpt-4o', requests: RequestConfig, config?: OpenAIChatModelConfig) {
		super('openai', modelId, config);
		this.baseURL = config?.baseURL ?? 'https://api.openai.com/v1';
		this.requests = requests;
	}

	private buildRequestBody(
		messages: Message[],
		config: OpenAIChatModelConfig,
		stream: boolean,
	): OpenAIResponsesRequest {
		const { instructions, input } = genericMessagesToResponsesInput(messages);
		const providerTools = config.providerTools ?? this.defaultConfig?.providerTools ?? [];
		const tools = [...this.tools, ...providerTools];
		// The Responses API has no parameter for stop sequences, a seed or top-k
		// sampling, so those options are not sent.
		return {
			model: this.modelId,
			input,
			instructions,
			max_output_tokens: config.maxTokens,
			temperature: config.temperature,
			top_p: config.topP,
			presence_penalty: config.presencePenalty,
			frequency_penalty: config.frequencyPenalty,
			tools: tools.map(genericToolToResponsesTool),
			tool_choice: config.toolChoice,
			parallel_tool_calls: true,
			store: false,
			stream,
			include: ['reasoning.encrypted_content'],
		};
	}

	private async sendWithReasoningFallback<T>(
		body: OpenAIResponsesRequest,
		abortSignal: ChatModelConfig['abortSignal'],
		send: (body: OpenAIResponsesRequest) => Promise<T>,
	): Promise<T> {
		const input = typeof body.input === 'string' ? [] : body.input;
		const replaysReasoning = input.some(isReasoningInput);
		if (!replaysReasoning) return await send(body);
		try {
			return await send(body);
		} catch {
			abortSignal?.throwIfAborted();
			// OpenAI only decrypts reasoning for the organization that created it, so
			// after an API key change it rejects every later turn. Send it once without.
			return await send({ ...body, input: input.filter((item) => !isReasoningInput(item)) });
		}
	}

	async generate(messages: Message[], config?: OpenAIChatModelConfig): Promise<GenerateResult> {
		const merged: OpenAIChatModelConfig = { ...this.defaultConfig, ...config };
		const response = await this.sendWithReasoningFallback(
			this.buildRequestBody(messages, merged, false),
			merged.abortSignal,
			async (body) =>
				await this.requests.httpRequest(
					'POST',
					`${this.baseURL}/responses`,
					body,
					definedHeaders(merged.headers),
					merged.abortSignal,
				),
		);
		const body = response.body;
		if (!isResponsesResponse(body)) {
			throw new Error('Unexpected response from the Responses API: the body has no output array');
		}
		if (body.status === 'failed') {
			throw responseFailedError(body);
		}
		return toGenerateResult(body);
	}

	async *stream(messages: Message[], config?: OpenAIChatModelConfig): AsyncIterable<StreamChunk> {
		const merged: OpenAIChatModelConfig = { ...this.defaultConfig, ...config };
		const response = await this.sendWithReasoningFallback(
			this.buildRequestBody(messages, merged, true),
			merged.abortSignal,
			async (body) =>
				await this.requests.openStream(
					'POST',
					`${this.baseURL}/responses`,
					body,
					definedHeaders(merged.headers),
					merged.abortSignal,
				),
		);
		yield* toStreamChunks(response.body);
	}
}
