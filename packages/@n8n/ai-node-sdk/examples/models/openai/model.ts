import {
	BaseChatModel,
	type ChatModelConfig,
	type GenerateResult,
	type Message,
	type MessageContent,
	type ProviderTool,
	type StreamChunk,
} from '@n8n/ai-utilities';
import type { IHttpRequestMethods } from 'n8n-workflow';

import {
	genericToolToResponsesTool,
	genericMessagesToResponsesInput,
	parseResponsesOutput,
	parseTokenUsage,
	parseOpenAIStreamEvents,
} from './helpers';
import type { OpenAIResponsesRequest, OpenAIResponsesResponse } from './types';

export interface OpenAIChatModelConfig extends ChatModelConfig {
	apiKey?: string;
	baseURL?: string;

	providerTools?: ProviderTool[];
}

export interface RequestConfig {
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
	) => Promise<{ body: ReadableStream<Uint8Array> }>;
}

export class OpenAIChatModel extends BaseChatModel<OpenAIChatModelConfig> {
	private baseURL: string;

	constructor(
		modelId: string = 'gpt-4o',
		private requests: RequestConfig,
		config?: OpenAIChatModelConfig,
	) {
		super('openai', modelId, config);
		this.baseURL = config?.baseURL ?? 'https://api.openai.com/v1';
	}

	private getTools(config?: OpenAIChatModelConfig) {
		const ownTools = this.tools;
		const providerTools = config?.providerTools ?? [];
		return [...ownTools, ...providerTools].map(genericToolToResponsesTool);
	}

	async generate(messages: Message[], config?: OpenAIChatModelConfig): Promise<GenerateResult> {
		const merged = this.mergeConfig(config);
		const { instructions, input } = genericMessagesToResponsesInput(messages);
		const tools = this.getTools(config);
		const requestBody: OpenAIResponsesRequest = {
			model: this.modelId,
			input,
			instructions,
			max_output_tokens: merged.maxTokens,
			temperature: merged.temperature,
			top_p: merged.topP,
			tools,
			parallel_tool_calls: true,
			store: false,
			stream: false,
		};

		const response = await this.requests.httpRequest(
			'POST',
			`${this.baseURL}/responses`,
			requestBody,
		);
		const body = response.body as OpenAIResponsesResponse;

		const { text, toolCalls } = parseResponsesOutput(body.output);

		const usage = parseTokenUsage(body.usage);

		const responseMetadata: Record<string, unknown> = {
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
		};

		for (const item of body.output as unknown[]) {
			const o = item as Record<string, unknown>;
			if (o.type === 'reasoning') {
				responseMetadata.reasoning = o;
			}
		}

		const content: MessageContent[] = [];
		if (toolCalls.length) {
			for (const toolCall of toolCalls) {
				content.push({
					type: 'tool-call',
					toolCallId: toolCall.id,
					toolName: toolCall.name,
					input: JSON.stringify(toolCall.arguments),
				});
			}
		}
		content.push({ type: 'text', text });

		const message: Message = {
			role: 'assistant',
			content,
			id: body.id,
		};

		return {
			id: body.id,
			finishReason: body.status === 'completed' ? 'stop' : 'other',
			usage,
			message,
			rawResponse: body,
			providerMetadata: responseMetadata,
		};
	}

	async *stream(messages: Message[], config?: OpenAIChatModelConfig): AsyncIterable<StreamChunk> {
		const merged = this.mergeConfig(config) as OpenAIChatModelConfig;
		const { instructions, input } = genericMessagesToResponsesInput(messages);

		const tools = this.getTools(config);

		const requestBody: OpenAIResponsesRequest = {
			model: this.modelId,
			input,
			instructions,
			max_output_tokens: merged.maxTokens,
			temperature: merged.temperature,
			top_p: merged.topP,
			tools,
			parallel_tool_calls: true,
			store: false,
			stream: true,
		};

		const streamResponse = await this.requests.openStream(
			'POST',
			`${this.baseURL}/responses`,
			requestBody,
		);
		const streamBody = streamResponse.body;

		const toolCallBuffers: Record<number, { name: string; arguments: string }> = {};

		for await (const event of parseOpenAIStreamEvents(streamBody)) {
			const type = event.type;

			if (type === 'response.output_text.delta') {
				const delta = event.delta;
				if (delta) {
					yield { type: 'text-delta', delta };
				}
			}

			if (type === 'response.output_item.added') {
				const item = event.item;
				if (item?.type === 'function_call') {
					const idx = event.output_index ?? 0;
					toolCallBuffers[idx] = {
						name: (item.name as string) ?? '',
						arguments: (item.arguments as string) ?? '',
					};
				}
				if (item?.type === 'reasoning') {
					const summary = (item.summary as Array<Record<string, unknown>>) ?? [];
					const reasoningText = summary
						.map((s) => s.text)
						.filter(Boolean)
						.join('');
					if (reasoningText) {
						yield { type: 'reasoning-delta', delta: reasoningText };
					}
				}
			}

			if (type === 'response.reasoning_summary_text.delta') {
				const delta = event.delta;
				if (delta) {
					yield { type: 'reasoning-delta', delta };
				}
			}

			if (type === 'response.function_call_arguments.delta') {
				const idx = event.output_index ?? 0;
				const delta = event.delta;
				if (toolCallBuffers[idx] && delta) {
					toolCallBuffers[idx].arguments += delta;
				}
			}

			if (type === 'response.output_item.done') {
				const item = event.item;
				if (item?.type === 'function_call') {
					const idx = event.output_index ?? 0;
					const buf = toolCallBuffers[idx];
					if (buf) {
						yield {
							type: 'tool-call-delta',
							id: (item.call_id as string) ?? (item.id as string),
							name: buf.name,
							argumentsDelta: buf.arguments,
						};
					}
				}
			}

			if (type === 'response.done' || type === 'response.completed') {
				const responseData =
					(event.response as unknown as OpenAIResponsesResponse) ??
					(event as unknown as OpenAIResponsesResponse);
				yield {
					type: 'finish',
					finishReason: 'stop',
					usage: parseTokenUsage(responseData.usage),
				};
			}
		}
	}
}
