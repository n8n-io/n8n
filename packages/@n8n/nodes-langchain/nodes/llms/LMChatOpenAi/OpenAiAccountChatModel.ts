import { randomUUID } from 'node:crypto';
import os from 'node:os';

import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import {
	AIMessage,
	AIMessageChunk,
	HumanMessage,
	SystemMessage,
	ToolMessage,
	type BaseMessage,
} from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import {
	BaseChatModel,
	type BaseChatModelCallOptions,
	type BaseChatModelParams,
	type BindToolsInput,
} from '@langchain/core/language_models/chat_models';
import { ChatGenerationChunk, type ChatResult } from '@langchain/core/outputs';
import type { Runnable } from '@langchain/core/runnables';
import { z } from 'zod';

const OPENAI_ACCOUNT_CODEX_RESPONSES_URL = 'https://chatgpt.com/backend-api/codex/responses';
const JWT_ACCOUNT_CLAIM = 'https://api.openai.com/auth';
const CODEX_ORIGINATOR = 'codex_cli_rs';
const DEFAULT_CODEX_INSTRUCTIONS = 'You are a helpful assistant.';
const DEFAULT_TIMEOUT_MS = 600_000;

type JsonSchema = {
	type?: string | string[];
	properties?: Record<string, JsonSchema>;
	required?: string[];
	additionalProperties?: boolean | JsonSchema;
	items?: JsonSchema | JsonSchema[];
	enum?: unknown[];
	anyOf?: JsonSchema[];
	oneOf?: JsonSchema[];
	allOf?: JsonSchema[];
	description?: string;
	default?: unknown;
	format?: string;
	[key: string]: unknown;
};

type FunctionTool = {
	type: 'function';
	name: string;
	description?: string;
	parameters: JsonSchema;
	strict?: boolean;
};

type ToolChoice =
	| { type: 'auto' }
	| { type: 'none' }
	| { type: 'required' }
	| { type: 'tool'; toolName: string };

type Prompt = Array<
	| { role: 'system'; content: string }
	| { role: 'user'; content: Array<{ type: 'text'; text: string }> }
	| {
			role: 'assistant';
			content: Array<
				| { type: 'text'; text: string }
				| { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown }
			>;
			phase?: string;
			rawOutputItems?: Array<Record<string, unknown>>;
	  }
	| {
			role: 'tool';
			content: Array<{
				type: 'tool-result';
				toolCallId: string;
				toolName: string;
				result: unknown;
				isError?: boolean;
			}>;
	  }
>;

type FunctionToolCall = {
	toolCallType: 'function';
	toolCallId: string;
	toolName: string;
	args: string;
};

type CodexCompletion = {
	text: string;
	finishReason: 'stop' | 'error' | 'tool-calls' | 'length' | 'content-filter' | 'other' | 'unknown';
	usage: { promptTokens: number; completionTokens: number };
	toolCalls?: FunctionToolCall[];
	responseId?: string;
	assistantPhase?: string;
	rawOutputItems?: Array<Record<string, unknown>>;
};

type CodexStreamPart =
	| { type: 'text-delta'; textDelta: string }
	| {
			type: 'tool-call-delta';
			toolCallType: 'function';
			toolCallId: string;
			toolName: string;
			argsTextDelta: string;
	  }
	| {
			type: 'tool-call';
			toolCallType: 'function';
			toolCallId: string;
			toolName: string;
			args: string;
	  }
	| {
			type: 'finish';
			finishReason: CodexCompletion['finishReason'];
			usage: CodexCompletion['usage'];
			providerMetadata?: {
				responseId?: string;
				assistantPhase?: string;
				rawOutputItems?: Array<Record<string, unknown>>;
			};
	  };

type CodexReasoningEffort = 'low' | 'medium' | 'high';

interface OpenAiAccountChatCallOptions extends BaseChatModelCallOptions {
	tools?: FunctionTool[];
}

type OpenAiAccountChatModelFields = BaseChatModelParams & {
	accessToken: string;
	model: string;
	timeout?: number;
	dispatcher?: unknown;
	reasoningEffort?: CodexReasoningEffort;
	maxOutputTokens?: number;
	sessionId?: string;
	installationId?: string;
	boundTools?: FunctionTool[];
	boundCallOptions?: Partial<OpenAiAccountChatCallOptions>;
	previousPrompt?: Prompt;
	previousResponseId?: string;
};

export class OpenAiAccountChatModel extends BaseChatModel<OpenAiAccountChatCallOptions> {
	static lc_name() {
		return 'OpenAiAccountChatModel';
	}

	readonly model: string;

	private readonly accessToken: string;

	private readonly timeout?: number;

	private readonly dispatcher?: unknown;

	private readonly reasoningEffort?: CodexReasoningEffort;

	private readonly maxOutputTokens?: number;

	private readonly sessionId: string;

	private readonly installationId: string;

	private readonly boundTools?: FunctionTool[];

	private readonly boundCallOptions?: Partial<OpenAiAccountChatCallOptions>;

	private previousPrompt?: Prompt;

	private previousResponseId?: string;

	constructor(fields: OpenAiAccountChatModelFields) {
		super(fields);
		this.accessToken = fields.accessToken;
		this.model = fields.model;
		this.timeout = fields.timeout;
		this.dispatcher = fields.dispatcher;
		this.reasoningEffort = fields.reasoningEffort;
		this.maxOutputTokens = fields.maxOutputTokens;
		this.sessionId = fields.sessionId ?? randomUUID();
		this.installationId = fields.installationId ?? randomUUID();
		this.boundTools = fields.boundTools;
		this.boundCallOptions = fields.boundCallOptions;
		this.previousPrompt = fields.previousPrompt;
		this.previousResponseId = fields.previousResponseId;
	}

	_llmType(): string {
		return 'openai-account-chat';
	}

	override _identifyingParams(): Record<string, unknown> {
		return {
			provider: 'openai-oauth-account',
			model: this.model,
			reasoningEffort: this.reasoningEffort,
		};
	}

	override bindTools(
		tools: BindToolsInput[],
		kwargs?: Partial<OpenAiAccountChatCallOptions>,
	): Runnable {
		const normalizedTools = tools
			.map(toLanguageModelTool)
			.filter((tool): tool is FunctionTool => tool !== undefined);

		return new OpenAiAccountChatModel({
			accessToken: this.accessToken,
			model: this.model,
			timeout: this.timeout,
			dispatcher: this.dispatcher,
			reasoningEffort: this.reasoningEffort,
			maxOutputTokens: this.maxOutputTokens,
			sessionId: this.sessionId,
			installationId: this.installationId,
			disableStreaming: this.disableStreaming,
			outputVersion: this.outputVersion,
			boundTools: normalizedTools,
			boundCallOptions: kwargs,
			previousPrompt: this.previousPrompt,
			previousResponseId: this.previousResponseId,
			...(kwargs?.callbacks ? { callbacks: kwargs.callbacks } : {}),
			...(kwargs?.tags ? { tags: kwargs.tags } : {}),
			...(kwargs?.metadata ? { metadata: kwargs.metadata } : {}),
		}) as unknown as Runnable;
	}

	async _generate(
		messages: BaseMessage[],
		options: this['ParsedCallOptions'],
		_runManager?: CallbackManagerForLLMRun,
	): Promise<ChatResult> {
		const prompt = toLanguageModelPrompt(messages);
		const incremental = buildIncrementalPrompt(
			this.previousPrompt,
			prompt,
			this.previousResponseId,
		);
		const result = await this.runCompletion({
			prompt: incremental.prompt,
			tools: options.tools ?? this.boundTools ?? [],
			toolChoice: normalizeToolChoice(options.tool_choice ?? this.boundCallOptions?.tool_choice),
			previousResponseId: incremental.previousResponseId,
			abortSignal: options.signal,
		});

		this.previousPrompt = prompt;
		this.previousResponseId = result.responseId;

		const text = result.text;
		const toolCalls = (result.toolCalls ?? []).map<ToolCall>((toolCall) => ({
			id: toolCall.toolCallId,
			name: toolCall.toolName,
			args: parseToolArgs(toolCall.args),
		}));

		const message = new AIMessage({
			content: text,
			tool_calls: toolCalls,
			additional_kwargs: buildCodexMetadata(result),
			response_metadata: buildCodexMetadata(result),
			usage_metadata: {
				input_tokens: result.usage.promptTokens,
				output_tokens: result.usage.completionTokens,
				total_tokens: result.usage.promptTokens + result.usage.completionTokens,
			},
		});

		return {
			generations: [
				{
					text,
					message,
					generationInfo: { finishReason: result.finishReason },
				},
			],
			llmOutput: {
				finishReason: result.finishReason,
				usage: result.usage,
			},
		};
	}

	async *_streamResponseChunks(
		messages: BaseMessage[],
		options: this['ParsedCallOptions'],
		runManager?: CallbackManagerForLLMRun,
	): AsyncGenerator<ChatGenerationChunk> {
		const prompt = toLanguageModelPrompt(messages);
		const incremental = buildIncrementalPrompt(
			this.previousPrompt,
			prompt,
			this.previousResponseId,
		);
		const stream = this.streamCompletion({
			prompt: incremental.prompt,
			tools: options.tools ?? this.boundTools ?? [],
			toolChoice: normalizeToolChoice(options.tool_choice ?? this.boundCallOptions?.tool_choice),
			previousResponseId: incremental.previousResponseId,
			abortSignal: options.signal,
		});

		for await (const part of stream) {
			if (part.type === 'text-delta') {
				const chunk = new ChatGenerationChunk({
					message: new AIMessageChunk({ content: part.textDelta }),
					text: part.textDelta,
				});
				yield chunk;
				await runManager?.handleLLMNewToken(
					part.textDelta,
					{ prompt: 0, completion: 0 },
					undefined,
					undefined,
					undefined,
					{
						chunk,
					},
				);
			} else if (part.type === 'tool-call') {
				const message = new AIMessageChunk({
					content: '',
					tool_calls: [
						{
							name: part.toolName,
							args: parseToolArgs(part.args),
							id: part.toolCallId,
							type: 'tool_call',
						},
					],
					tool_call_chunks: [
						{
							name: part.toolName,
							args: part.args,
							id: part.toolCallId,
							index: 0,
							type: 'tool_call_chunk',
						},
					],
				});
				yield new ChatGenerationChunk({ message, text: '' });
			} else if (part.type === 'tool-call-delta') {
				const message = new AIMessageChunk({
					content: '',
					tool_call_chunks: [
						{
							name: part.toolName,
							args: part.argsTextDelta,
							id: part.toolCallId,
							index: 0,
							type: 'tool_call_chunk',
						},
					],
					additional_kwargs: {
						tool_calls: [
							{
								id: part.toolCallId,
								type: 'function',
								index: 0,
								function: {
									name: part.toolName,
									arguments: part.argsTextDelta,
								},
							},
						],
					},
				});
				yield new ChatGenerationChunk({ message, text: '' });
			} else {
				this.previousPrompt = prompt;
				this.previousResponseId = part.providerMetadata?.responseId;
				const metadata = {
					...(part.providerMetadata?.assistantPhase
						? { phase: part.providerMetadata.assistantPhase }
						: {}),
					...(part.providerMetadata?.rawOutputItems
						? { codex_output_items: part.providerMetadata.rawOutputItems }
						: {}),
				};
				yield new ChatGenerationChunk({
					message: new AIMessageChunk({
						content: '',
						usage_metadata: {
							input_tokens: part.usage.promptTokens,
							output_tokens: part.usage.completionTokens,
							total_tokens: part.usage.promptTokens + part.usage.completionTokens,
						},
						response_metadata: {
							finishReason: part.finishReason,
							...metadata,
						},
						additional_kwargs: metadata,
					}),
					text: '',
					generationInfo: { finishReason: part.finishReason },
				});
			}
		}
	}

	private async runCompletion(input: {
		prompt: Prompt;
		tools: FunctionTool[];
		toolChoice?: ToolChoice;
		previousResponseId?: string;
		abortSignal?: AbortSignal;
	}): Promise<CodexCompletion> {
		let text = '';
		let inputTokens = 0;
		let outputTokens = 0;
		const toolCalls = new Map<string, FunctionToolCall>();
		let responseId: string | undefined;
		let assistantPhase: string | undefined;
		let rawOutputItems: Array<Record<string, unknown>> | undefined;
		let providerFinishReason: CodexCompletion['finishReason'] | undefined;

		for await (const event of this.requestCodex(input)) {
			const type = readOptionalString(event.type);
			if (type === 'response.output_text.delta' && typeof event.delta === 'string') {
				text += event.delta;
			} else if (type === 'response.output_item.added' || type === 'response.output_item.done') {
				const item = readResponseOutputItem(event);
				const toolCall = extractCodexToolCallFromItem(item, toolCalls.size);
				if (toolCall) {
					toolCalls.set(toolCall.toolCallId, toolCall);
				}
				const phase = extractAssistantPhaseFromOutputItem(item);
				if (phase) {
					assistantPhase = phase;
				}
			} else if (type === 'response.function_call_arguments.delta') {
				const itemId = readOptionalString(event.item_id) ?? readOptionalString(event.call_id);
				const existing = itemId ? toolCalls.get(itemId) : undefined;
				if (itemId && existing && typeof event.delta === 'string') {
					toolCalls.set(itemId, { ...existing, args: `${existing.args}${event.delta}` });
				}
			} else if (type === 'response.function_call_arguments.done') {
				const itemId = readOptionalString(event.item_id) ?? readOptionalString(event.call_id);
				const existing = itemId ? toolCalls.get(itemId) : undefined;
				const finalArgs = readOptionalString(event.arguments);
				if (itemId && existing && finalArgs) {
					toolCalls.set(itemId, { ...existing, args: finalArgs });
				}
			} else if (type === 'response.completed') {
				const response = isRecord(event.response) ? event.response : undefined;
				responseId = readOptionalString(response?.id);
				const usage = isRecord(response?.usage) ? response.usage : {};
				inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0;
				outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0;
				rawOutputItems = Array.isArray(response?.output)
					? response.output.filter((item): item is Record<string, unknown> => isRecord(item))
					: undefined;
				providerFinishReason = readCodexFinishReason(response);
				for (const item of Array.isArray(response?.output) ? response.output : []) {
					const toolCall = extractCodexToolCallFromItem(item, toolCalls.size);
					if (toolCall) {
						toolCalls.set(toolCall.toolCallId, toolCall);
					}
					const phase = extractAssistantPhaseFromOutputItem(item);
					if (phase) {
						assistantPhase = phase;
					}
				}
			} else if (type === 'response.failed') {
				const response = isRecord(event.response) ? event.response : undefined;
				const error = isRecord(response?.error) ? response.error : undefined;
				throw new Error(readOptionalString(error?.message) ?? 'Codex response failed.');
			} else if (type === 'error') {
				throw new Error(readOptionalString(event.message) ?? 'Codex stream error.');
			}
		}

		return {
			text,
			finishReason: resolveCodexFinishReason(providerFinishReason, toolCalls.size),
			usage: { promptTokens: inputTokens, completionTokens: outputTokens },
			...(toolCalls.size > 0 ? { toolCalls: [...toolCalls.values()] } : {}),
			...(responseId ? { responseId } : {}),
			...(assistantPhase ? { assistantPhase } : {}),
			...(rawOutputItems ? { rawOutputItems } : {}),
		};
	}

	private async *streamCompletion(input: {
		prompt: Prompt;
		tools: FunctionTool[];
		toolChoice?: ToolChoice;
		previousResponseId?: string;
		abortSignal?: AbortSignal;
	}): AsyncGenerator<CodexStreamPart> {
		const toolCalls = new Map<string, FunctionToolCall>();
		const yieldedToolCalls = new Set<string>();
		let inputTokens = 0;
		let outputTokens = 0;
		let responseId: string | undefined;
		let assistantPhase: string | undefined;
		let rawOutputItems: Array<Record<string, unknown>> | undefined;
		let providerFinishReason: CodexCompletion['finishReason'] | undefined;

		for await (const event of this.requestCodex(input)) {
			const type = readOptionalString(event.type);
			if (type === 'response.output_text.delta' && typeof event.delta === 'string') {
				yield { type: 'text-delta', textDelta: event.delta };
			} else if (type === 'response.output_item.added' || type === 'response.output_item.done') {
				const item = readResponseOutputItem(event);
				const toolCall = extractCodexToolCallFromItem(item, toolCalls.size);
				if (toolCall) {
					toolCalls.set(toolCall.toolCallId, toolCall);
				}
				const phase = extractAssistantPhaseFromOutputItem(item);
				if (phase) {
					assistantPhase = phase;
				}
			} else if (type === 'response.function_call_arguments.delta') {
				const itemId = readOptionalString(event.item_id) ?? readOptionalString(event.call_id);
				const existing = itemId ? toolCalls.get(itemId) : undefined;
				if (itemId && existing && typeof event.delta === 'string') {
					toolCalls.set(itemId, { ...existing, args: `${existing.args}${event.delta}` });
					yield {
						type: 'tool-call-delta',
						toolCallType: 'function',
						toolCallId: itemId,
						toolName: existing.toolName,
						argsTextDelta: event.delta,
					};
				}
			} else if (type === 'response.function_call_arguments.done') {
				const itemId = readOptionalString(event.item_id) ?? readOptionalString(event.call_id);
				const existing = itemId ? toolCalls.get(itemId) : undefined;
				const finalArgs = readOptionalString(event.arguments);
				if (itemId && existing && finalArgs) {
					const completed = { ...existing, args: finalArgs };
					toolCalls.set(itemId, completed);
					yieldedToolCalls.add(itemId);
					yield { type: 'tool-call', ...completed };
				}
			} else if (type === 'response.completed') {
				const response = isRecord(event.response) ? event.response : undefined;
				responseId = readOptionalString(response?.id);
				const usage = isRecord(response?.usage) ? response.usage : {};
				inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0;
				outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0;
				rawOutputItems = Array.isArray(response?.output)
					? response.output.filter((item): item is Record<string, unknown> => isRecord(item))
					: undefined;
				providerFinishReason = readCodexFinishReason(response);
				for (const item of Array.isArray(response?.output) ? response.output : []) {
					const toolCall = extractCodexToolCallFromItem(item, toolCalls.size);
					if (toolCall) {
						toolCalls.set(toolCall.toolCallId, toolCall);
					}
					const phase = extractAssistantPhaseFromOutputItem(item);
					if (phase) {
						assistantPhase = phase;
					}
				}
			} else if (type === 'response.failed') {
				const response = isRecord(event.response) ? event.response : undefined;
				const error = isRecord(response?.error) ? response.error : undefined;
				throw new Error(readOptionalString(error?.message) ?? 'Codex response failed.');
			} else if (type === 'error') {
				throw new Error(readOptionalString(event.message) ?? 'Codex stream error.');
			}
		}

		for (const toolCall of toolCalls.values()) {
			if (yieldedToolCalls.has(toolCall.toolCallId)) continue;
			yield { type: 'tool-call', ...toolCall };
		}
		yield {
			type: 'finish',
			finishReason: resolveCodexFinishReason(providerFinishReason, toolCalls.size),
			usage: { promptTokens: inputTokens, completionTokens: outputTokens },
			providerMetadata: {
				...(responseId ? { responseId } : {}),
				...(assistantPhase ? { assistantPhase } : {}),
				...(rawOutputItems ? { rawOutputItems } : {}),
			},
		};
	}

	private async *requestCodex(input: {
		prompt: Prompt;
		tools: FunctionTool[];
		toolChoice?: ToolChoice;
		previousResponseId?: string;
		abortSignal?: AbortSignal;
	}): AsyncGenerator<Record<string, unknown>> {
		const { instructions, codexInput } = convertPromptToCodexInput(input.prompt);
		const codexIdentity = buildCodexIdentity(this.sessionId, this.installationId);
		const accountId = extractChatGptAccountId(this.accessToken);
		const body = {
			model: this.model,
			store: false,
			stream: true,
			instructions: ensureCodexInstructions(instructions),
			input: codexInput,
			...toCodexReasoningPayload(this.reasoningEffort),
			...(this.maxOutputTokens ? { max_output_tokens: this.maxOutputTokens } : {}),
			include: ['reasoning.encrypted_content'],
			client_metadata: codexIdentity.clientMetadata,
			...(input.previousResponseId ? { previous_response_id: input.previousResponseId } : {}),
			...(input.tools.length > 0
				? {
						tools: toCodexTools(input.tools),
						tool_choice: toCodexToolChoice(input.toolChoice),
						parallel_tool_calls: true,
					}
				: { tool_choice: 'auto' }),
		};

		const response = await fetchWithOptionalDispatcher(OPENAI_ACCOUNT_CODEX_RESPONSES_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'chatgpt-account-id': accountId,
				'OpenAI-Beta': 'responses=experimental',
				originator: CODEX_ORIGINATOR,
				'User-Agent': buildCodexUserAgent(),
				'x-client-request-id': codexIdentity.requestId,
				'x-codex-window-id': codexIdentity.windowId,
				'x-codex-installation-id': codexIdentity.installationId,
				session_id: this.sessionId,
				accept: 'text/event-stream',
				'content-type': 'application/json',
			},
			body: JSON.stringify(body),
			signal: buildAbortSignal(input.abortSignal, this.timeout ?? DEFAULT_TIMEOUT_MS),
			dispatcher: this.dispatcher,
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(text.trim() || `OpenAI account completion failed: HTTP ${response.status}`);
		}

		if (!response.body) {
			throw new Error('OpenAI account completion returned an empty response body.');
		}

		yield* parseCodexSse(response.body);
	}
}

function buildCodexMetadata(result: CodexCompletion): Record<string, unknown> {
	return {
		...(result.assistantPhase ? { phase: result.assistantPhase } : {}),
		...(result.rawOutputItems ? { codex_output_items: result.rawOutputItems } : {}),
	};
}

function convertPromptToCodexInput(prompt: Prompt): {
	instructions: string | undefined;
	codexInput: Array<Record<string, unknown>>;
} {
	const instructionParts: string[] = [];
	const codexInput: Array<Record<string, unknown>> = [];

	for (const message of prompt) {
		if (message.role === 'system') {
			if (message.content) {
				instructionParts.push(message.content);
			}
			continue;
		}

		if (message.role === 'user') {
			const text = message.content.map((part) => part.text).join('\n');
			codexInput.push({ role: 'user', content: [{ type: 'input_text', text }] });
			continue;
		}

		if (message.role === 'assistant') {
			if (Array.isArray(message.rawOutputItems) && message.rawOutputItems.length > 0) {
				for (const item of message.rawOutputItems) {
					const sanitized = sanitizeResponsesOutputItem(item);
					if (sanitized) {
						codexInput.push(sanitized);
					}
				}
				continue;
			}

			const text = message.content
				.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
				.map((part) => part.text)
				.join('\n')
				.trim();
			if (text) {
				codexInput.push({
					role: 'assistant',
					content: [{ type: 'output_text', text }],
					...(message.phase ? { phase: message.phase } : {}),
				});
			}

			for (const part of message.content) {
				if (part.type !== 'tool-call') continue;
				codexInput.push({
					type: 'function_call',
					call_id: part.toolCallId,
					name: part.toolName,
					arguments: JSON.stringify(part.args ?? {}),
				});
			}
			continue;
		}

		for (const part of message.content) {
			codexInput.push({
				type: 'function_call_output',
				call_id: part.toolCallId,
				output: stringifyToolResult(part.result),
			});
		}
	}

	const instructions =
		instructionParts
			.map((part) => part.trim())
			.filter(Boolean)
			.join('\n\n') || undefined;

	return { instructions, codexInput };
}

function toLanguageModelPrompt(messages: BaseMessage[]): Prompt {
	return messages.map((message) => {
		if (SystemMessage.isInstance(message)) {
			return { role: 'system', content: stringifyMessageContent(message.content) };
		}

		if (HumanMessage.isInstance(message)) {
			return {
				role: 'user',
				content: [{ type: 'text', text: stringifyMessageContent(message.content) }],
			};
		}

		if (ToolMessage.isInstance(message)) {
			return {
				role: 'tool',
				content: [
					{
						type: 'tool-result',
						toolCallId: message.tool_call_id,
						toolName: message.name || 'tool',
						result: stringifyMessageContent(message.content),
						isError: message.status === 'error',
					},
				],
			};
		}

		if (AIMessage.isInstance(message)) {
			const content: Array<
				| { type: 'text'; text: string }
				| { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown }
			> = [];
			const text = stringifyMessageContent(message.content);
			if (text) {
				content.push({ type: 'text', text });
			}
			for (const toolCall of message.tool_calls ?? []) {
				content.push({
					type: 'tool-call',
					toolCallId: toolCall.id || toolCall.name,
					toolName: toolCall.name,
					args: toolCall.args,
				});
			}
			return {
				role: 'assistant',
				content,
				...extractAssistantPhase(message),
				...extractRawOutputItems(message),
			};
		}

		return {
			role: 'user',
			content: [{ type: 'text', text: stringifyMessageContent(message.content) }],
		};
	});
}

function buildIncrementalPrompt(
	previousPrompt: Prompt | undefined,
	nextPrompt: Prompt,
	previousResponseId: string | undefined,
): { prompt: Prompt; previousResponseId?: string } {
	if (!previousPrompt || !previousResponseId || previousPrompt.length >= nextPrompt.length) {
		return { prompt: nextPrompt };
	}

	const samePrefix = previousPrompt.every(
		(message, index) => JSON.stringify(message) === JSON.stringify(nextPrompt[index]),
	);
	if (!samePrefix) {
		return { prompt: nextPrompt };
	}

	let deltaPrompt = nextPrompt.slice(previousPrompt.length);
	while (deltaPrompt[0]?.role === 'assistant') {
		deltaPrompt = deltaPrompt.slice(1);
	}
	return deltaPrompt.length > 0
		? { prompt: deltaPrompt, previousResponseId }
		: { prompt: nextPrompt };
}

function stringifyMessageContent(content: unknown): string {
	if (typeof content === 'string') return content;
	if (!Array.isArray(content)) return content == null ? '' : String(content);

	return content
		.map((part) => {
			if (typeof part === 'string') return part;
			if (isRecord(part) && typeof part.text === 'string') return part.text;
			return '';
		})
		.join('\n')
		.trim();
}

function normalizeToolChoice(
	toolChoice: OpenAiAccountChatCallOptions['tool_choice'],
): ToolChoice | undefined {
	if (!toolChoice || toolChoice === 'auto') return undefined;
	if (toolChoice === 'any') return { type: 'required' };
	if (toolChoice === 'none') return { type: 'none' };
	if (typeof toolChoice === 'string') return { type: 'tool', toolName: toolChoice };
	return undefined;
}

function parseToolArgs(args: string): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(args);
		return isRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function toLanguageModelTool(input: BindToolsInput): FunctionTool | undefined {
	if (!isRecord(input)) return undefined;

	const name = typeof input.name === 'string' ? input.name : undefined;
	if (!name) return undefined;

	return {
		type: 'function',
		name,
		description: typeof input.description === 'string' ? input.description : undefined,
		parameters: toJsonSchema(input.parameters ?? input.schema),
		strict: true,
	};
}

function toJsonSchema(schema: unknown): JsonSchema {
	if (schema instanceof z.ZodType) return normalizeJsonSchema(zodToJsonSchema(schema));
	if (isSerializedZodSchema(schema)) return normalizeJsonSchema(serializedZodToJsonSchema(schema));
	if (isRecord(schema)) return normalizeJsonSchema(schema as JsonSchema);

	return {
		type: 'object',
		properties: {},
		additionalProperties: true,
	};
}

function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
	if (schema instanceof z.ZodEffects) return zodToJsonSchema(schema._def.schema);
	if (
		schema instanceof z.ZodOptional ||
		schema instanceof z.ZodNullable ||
		schema instanceof z.ZodDefault
	) {
		return zodToJsonSchema(schema._def.innerType);
	}
	if (schema instanceof z.ZodString) return { type: 'string' };
	if (schema instanceof z.ZodNumber) return { type: 'number' };
	if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
	if (schema instanceof z.ZodEnum) return { type: 'string', enum: [...schema._def.values] };
	if (schema instanceof z.ZodLiteral) return { enum: [schema._def.value] };
	if (schema instanceof z.ZodArray)
		return { type: 'array', items: zodToJsonSchema(schema._def.type) };
	if (schema instanceof z.ZodUnion) {
		return { anyOf: schema._def.options.map((option: z.ZodTypeAny) => zodToJsonSchema(option)) };
	}
	if (schema instanceof z.ZodObject) {
		const shape: Record<string, z.ZodTypeAny> = schema._def.shape();
		const properties = Object.fromEntries(
			Object.entries(shape).map(([key, value]) => [key, zodToJsonSchema(value)]),
		);
		const required = Object.entries(shape)
			.filter(([, value]) => !isOptionalZodSchema(value))
			.map(([key]) => key);
		return {
			type: 'object',
			properties,
			additionalProperties: false,
			...(required.length > 0 ? { required } : {}),
		};
	}
	return {};
}

function isOptionalZodSchema(schema: z.ZodTypeAny): boolean {
	return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault;
}

function isSerializedZodSchema(
	schema: unknown,
): schema is { def: { type?: string; [key: string]: unknown } } {
	return isRecord(schema) && isRecord(schema.def);
}

function serializedZodToJsonSchema(schema: {
	def: { type?: string; [key: string]: unknown };
}): JsonSchema {
	const def = schema.def;
	switch (def.type) {
		case 'string':
			return { type: 'string' };
		case 'number':
			return { type: 'number' };
		case 'boolean':
			return { type: 'boolean' };
		case 'literal':
			return { enum: [def.value] };
		case 'enum':
			return { type: 'string', enum: Array.isArray(def.values) ? [...def.values] : [] };
		case 'nullable':
		case 'optional':
		case 'default':
			return serializedInnerTypeToJsonSchema(def.innerType);
		case 'array':
			return { type: 'array', items: serializedInnerTypeToJsonSchema(def.type) };
		case 'union':
			return {
				anyOf: Array.isArray(def.options)
					? def.options.map((option) => serializedInnerTypeToJsonSchema(option))
					: [],
			};
		case 'object': {
			const shapeRecord = typeof def.shape === 'function' ? def.shape() : def.shape;
			const shape = isRecord(shapeRecord) ? shapeRecord : {};
			const properties = Object.fromEntries(
				Object.entries(shape).map(([key, value]) => [key, serializedInnerTypeToJsonSchema(value)]),
			);
			const required = Object.entries(shape)
				.filter(([, value]) => !isSerializedOptionalSchema(value))
				.map(([key]) => key);
			return {
				type: 'object',
				properties,
				additionalProperties: false,
				...(required.length > 0 ? { required } : {}),
			};
		}
		default:
			return {};
	}
}

function serializedInnerTypeToJsonSchema(value: unknown): JsonSchema {
	return isSerializedZodSchema(value) ? serializedZodToJsonSchema(value) : toJsonSchema(value);
}

function isSerializedOptionalSchema(value: unknown): boolean {
	return (
		isSerializedZodSchema(value) && (value.def.type === 'optional' || value.def.type === 'default')
	);
}

function normalizeJsonSchema(schema: JsonSchema): JsonSchema {
	const normalized: JsonSchema = { ...schema };
	if (normalized.type === 'object') normalized.properties = normalized.properties ?? {};
	if (isRecord(normalized.items))
		normalized.items = normalizeJsonSchema(normalized.items as JsonSchema);
	if (Array.isArray(normalized.anyOf)) {
		normalized.anyOf = normalized.anyOf.map((entry) =>
			isRecord(entry) ? normalizeJsonSchema(entry) : entry,
		);
	}
	if (normalized.properties) {
		normalized.properties = Object.fromEntries(
			Object.entries(normalized.properties).map(([key, value]) => [
				key,
				isRecord(value) ? normalizeJsonSchema(value) : value,
			]),
		);
	}
	return normalized;
}

function toCodexTools(tools: FunctionTool[]): Array<Record<string, unknown>> {
	return tools.map((tool) => ({
		type: 'function',
		name: tool.name,
		...(tool.description ? { description: tool.description } : {}),
		parameters: normalizeFunctionToolParametersSchema(tool.parameters, {
			forceRequiredObjectProperties: true,
		}),
		strict: tool.strict ?? true,
	}));
}

function toCodexToolChoice(toolChoice: ToolChoice | undefined): unknown {
	if (!toolChoice || toolChoice.type === 'auto') return 'auto';
	if (toolChoice.type === 'none' || toolChoice.type === 'required') return toolChoice.type;
	return { type: 'function', name: toolChoice.toolName };
}

function toCodexReasoningPayload(
	reasoningEffort: CodexReasoningEffort | undefined,
): Record<string, unknown> {
	return reasoningEffort ? { reasoning: { effort: reasoningEffort, summary: 'auto' } } : {};
}

function ensureCodexInstructions(instructions: string | undefined): string {
	const trimmed = instructions?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_CODEX_INSTRUCTIONS;
}

function extractChatGptAccountId(token: string): string {
	const parts = token.split('.');
	if (parts.length !== 3) {
		throw new Error('Failed to extract chatgpt_account_id from OpenAI OAuth token.');
	}

	try {
		const payload: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
		if (!isRecord(payload)) throw new Error('Invalid token payload');
		const claim = payload[JWT_ACCOUNT_CLAIM];
		if (
			!isRecord(claim) ||
			typeof claim.chatgpt_account_id !== 'string' ||
			!claim.chatgpt_account_id
		) {
			throw new Error('Missing account id');
		}
		return claim.chatgpt_account_id;
	} catch {
		throw new Error('Failed to extract chatgpt_account_id from OpenAI OAuth token.');
	}
}

function buildCodexIdentity(
	sessionId: string,
	installationId: string,
): {
	installationId: string;
	requestId: string;
	windowId: string;
	clientMetadata: Record<string, string>;
} {
	const requestId = sessionId;
	const windowId = `${requestId}:0`;
	return {
		installationId,
		requestId,
		windowId,
		clientMetadata: {
			'x-codex-installation-id': installationId,
			'x-codex-window-id': windowId,
		},
	};
}

function buildCodexUserAgent(): string {
	return `${CODEX_ORIGINATOR}/0.0.0 (${os.platform()} ${os.release()}; ${os.arch()}) n8n`;
}

function buildAbortSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
	const timeoutSignal = AbortSignal.timeout(timeoutMs);
	return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

async function fetchWithOptionalDispatcher(
	url: string,
	options: RequestInit & { dispatcher?: unknown },
): Promise<Response> {
	const { dispatcher, ...requestOptions } = options;
	if (dispatcher === undefined) {
		return await fetch(url, requestOptions);
	}
	return await fetch(url, { ...requestOptions, dispatcher } as RequestInit);
}

async function* parseCodexSse(
	body: ReadableStream<Uint8Array>,
): AsyncGenerator<Record<string, unknown>> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			let boundary = findSseMessageBoundary(buffer);
			while (boundary) {
				const chunk = buffer.slice(0, boundary.index);
				buffer = buffer.slice(boundary.index + boundary.length);
				const data = chunk
					.split(/\r?\n/)
					.filter((line) => line.startsWith('data:'))
					.map((line) => line.slice(5).trim())
					.join('\n')
					.trim();
				if (data && data !== '[DONE]') {
					try {
						const parsed: unknown = JSON.parse(data);
						if (isRecord(parsed)) yield parsed;
					} catch {}
				}
				boundary = findSseMessageBoundary(buffer);
			}
		}
	} finally {
		reader.releaseLock();
	}
}

function findSseMessageBoundary(buffer: string): { index: number; length: number } | undefined {
	const match = /\r?\n\r?\n/.exec(buffer);
	return match ? { index: match.index, length: match[0].length } : undefined;
}

function readResponseOutputItem(event: Record<string, unknown>): unknown {
	if (isRecord(event.item)) return event.item;
	if (isRecord(event.output_item)) return event.output_item;
	return undefined;
}

function extractAssistantPhaseFromOutputItem(item: unknown): string | undefined {
	if (!isRecord(item) || item.type !== 'message') return undefined;
	return readOptionalString(item.phase);
}

function resolveCodexFinishReason(
	providerFinishReason: CodexCompletion['finishReason'] | undefined,
	toolCallCount: number,
): CodexCompletion['finishReason'] {
	return toolCallCount > 0 ? 'tool-calls' : (providerFinishReason ?? 'stop');
}

function readCodexFinishReason(
	response: Record<string, unknown> | undefined,
): CodexCompletion['finishReason'] | undefined {
	if (!response) return undefined;

	const finishReason = mapCodexFinishReason(readOptionalString(response.finish_reason));
	if (finishReason) return finishReason;

	const status = readOptionalString(response.status);
	if (status === 'completed') return 'stop';
	if (status === 'failed') return 'error';
	if (status === 'incomplete') {
		const details = isRecord(response.incomplete_details) ? response.incomplete_details : {};
		return mapCodexFinishReason(readOptionalString(details.reason)) ?? 'other';
	}

	return undefined;
}

function mapCodexFinishReason(
	reason: string | undefined,
): CodexCompletion['finishReason'] | undefined {
	switch (reason) {
		case 'stop':
		case 'completed':
			return 'stop';
		case 'tool_calls':
		case 'tool-calls':
			return 'tool-calls';
		case 'length':
		case 'max_tokens':
		case 'max_output_tokens':
			return 'length';
		case 'content_filter':
			return 'content-filter';
		case 'error':
		case 'failed':
			return 'error';
		default:
			return reason ? 'other' : undefined;
	}
}

function extractCodexToolCallFromItem(item: unknown, index: number): FunctionToolCall | undefined {
	if (!isRecord(item) || item.type !== 'function_call') return undefined;
	const toolName = readOptionalString(item.name);
	if (!toolName) return undefined;
	const toolCallId =
		readOptionalString(item.call_id) ??
		readOptionalString(item.id) ??
		`openai-account-tool-call-${index + 1}`;
	const args =
		typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item.arguments ?? {});
	return {
		toolCallType: 'function',
		toolCallId,
		toolName,
		args,
	};
}

function extractAssistantPhase(message: AIMessage): { phase?: string } {
	const additionalPhase = isRecord(message.additional_kwargs)
		? readOptionalString(message.additional_kwargs.phase)
		: undefined;
	if (additionalPhase) return { phase: additionalPhase };

	const responsePhase = isRecord(message.response_metadata)
		? readOptionalString(message.response_metadata.phase)
		: undefined;
	return responsePhase ? { phase: responsePhase } : {};
}

function extractRawOutputItems(message: AIMessage): {
	rawOutputItems?: Array<Record<string, unknown>>;
} {
	const additionalItems = isRecord(message.additional_kwargs)
		? message.additional_kwargs.codex_output_items
		: undefined;
	if (Array.isArray(additionalItems)) {
		return {
			rawOutputItems: additionalItems.filter((item): item is Record<string, unknown> =>
				isRecord(item),
			),
		};
	}

	const responseItems = isRecord(message.response_metadata)
		? message.response_metadata.codex_output_items
		: undefined;
	if (Array.isArray(responseItems)) {
		return {
			rawOutputItems: responseItems.filter((item): item is Record<string, unknown> =>
				isRecord(item),
			),
		};
	}

	return {};
}

function sanitizeResponsesOutputItem(
	item: Record<string, unknown>,
): Record<string, unknown> | undefined {
	const sanitized: Record<string, unknown> = { ...item };
	delete sanitized.id;
	delete sanitized.status;
	if (Array.isArray(sanitized.content)) {
		sanitized.content = sanitized.content
			.filter((part): part is Record<string, unknown> => isRecord(part))
			.map((part) => {
				const nextPart = { ...part };
				delete nextPart.id;
				delete nextPart.status;
				return nextPart;
			});
	}
	return sanitized;
}

function stringifyToolResult(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value ?? null);
	} catch {
		return String(value);
	}
}

function readOptionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFunctionToolParametersSchema(
	schema: Record<string, unknown>,
	options: { forceRequiredObjectProperties?: boolean } = {},
): Record<string, unknown> {
	const normalized = normalizeSchemaNode(schema, options.forceRequiredObjectProperties === true);
	if (!isRecord(normalized)) {
		return { type: 'object', properties: {}, required: [], additionalProperties: false };
	}

	return ensureFunctionParametersObjectSchema(
		normalized,
		options.forceRequiredObjectProperties === true,
	);
}

function normalizeSchemaNode(schema: unknown, forceRequired: boolean): unknown {
	if (!isRecord(schema)) return schema;
	const normalized: Record<string, unknown> = { ...schema };
	if (Array.isArray(schema.anyOf)) {
		normalized.anyOf = schema.anyOf.map((entry) => normalizeSchemaNode(entry, forceRequired));
	}
	if (Array.isArray(schema.oneOf)) {
		normalized.oneOf = schema.oneOf.map((entry) => normalizeSchemaNode(entry, forceRequired));
	}
	if (isRecord(schema.items)) {
		normalized.items = normalizeSchemaNode(schema.items, forceRequired);
	}
	if (isRecord(schema.properties)) {
		const properties = Object.fromEntries(
			Object.entries(schema.properties).map(([key, value]) => [
				key,
				normalizeSchemaNode(value, forceRequired),
			]),
		);
		const propertyKeys = Object.keys(properties);
		const originalRequired = new Set(
			Array.isArray(schema.required)
				? schema.required.filter((entry): entry is string => typeof entry === 'string')
				: [],
		);
		if (forceRequired) {
			for (const key of propertyKeys) {
				if (!originalRequired.has(key) && isRecord(properties[key])) {
					properties[key] = makeSchemaNullable(properties[key]);
				}
			}
		}
		normalized.properties = properties;
		normalized.required = forceRequired ? propertyKeys : [...originalRequired];
	}
	if (forceRequired && normalized.type === 'object') {
		normalized.properties = isRecord(normalized.properties) ? normalized.properties : {};
		normalized.required = Array.isArray(normalized.required) ? normalized.required : [];
		normalized.additionalProperties = false;
	}
	return normalized;
}

function ensureFunctionParametersObjectSchema(
	schema: Record<string, unknown>,
	forceRequired: boolean,
): Record<string, unknown> {
	const properties = isRecord(schema.properties) ? schema.properties : {};

	return normalizeSchemaNode(
		{
			...schema,
			type: 'object',
			properties,
		},
		forceRequired,
	) as Record<string, unknown>;
}

function makeSchemaNullable(schema: Record<string, unknown>): Record<string, unknown> {
	if (schema.type !== undefined) return { ...schema, type: appendNullToType(schema.type) };
	if (
		Array.isArray(schema.anyOf) &&
		!schema.anyOf.some((entry) => isRecord(entry) && entry.type === 'null')
	) {
		return { ...schema, anyOf: [...schema.anyOf, { type: 'null' }] };
	}
	if (
		Array.isArray(schema.oneOf) &&
		!schema.oneOf.some((entry) => isRecord(entry) && entry.type === 'null')
	) {
		return { ...schema, oneOf: [...schema.oneOf, { type: 'null' }] };
	}
	return { anyOf: [schema, { type: 'null' }] };
}

function appendNullToType(type: unknown): unknown {
	if (typeof type === 'string') return type === 'null' ? 'null' : [type, 'null'];
	if (Array.isArray(type)) return type.includes('null') ? type : [...type, 'null'];
	return ['null'];
}
