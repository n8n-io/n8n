import { createHash } from 'node:crypto';

import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { isRecord } from '@n8n/utils/is-record';
import type {
	FilePart,
	ModelMessage,
	TextPart,
	ToolCallPart,
	ToolResultPart,
	FinishReason as AiFinishReason,
} from 'ai';

import { getProviderQuirks, PROVIDER_QUIRKS } from './provider-quirks';
import type { FinishReason } from '../../types';
import type {
	AgentMessage,
	ContentCustom,
	ContentFile,
	ContentFileWithRef,
	ContentReasoning,
	ContentReasoningFile,
	ContentText,
	ContentToolCall,
	Message,
	MessageContent,
} from '../../types/sdk/message';
import { isFileRefPart, toolOutputFileParts } from '../../types/sdk/message';
import type { JSONObject, JSONValue } from '../../types/utils/json';

// Used across all message roles; AssistantContent omits user images and tool approval responses.
type AiContentPart = Exclude<ModelMessage['content'], string>[number];
type AiAssistantContent = Exclude<Extract<ModelMessage, { role: 'assistant' }>['content'], string>;

// --- Type guards for MessageContent blocks ---

function isText(block: MessageContent): block is ContentText {
	return block.type === 'text';
}

function isReasoning(block: MessageContent): block is ContentReasoning {
	return block.type === 'reasoning';
}

function isReasoningFile(block: MessageContent): block is ContentReasoningFile {
	return block.type === 'reasoning-file';
}

function isFile(block: MessageContent): block is ContentFile {
	return block.type === 'file';
}

function isCustom(block: MessageContent): block is ContentCustom {
	return block.type === 'custom';
}

function isToolCall(block: MessageContent): block is ContentToolCall {
	return block.type === 'tool-call';
}

type ToolInputNormalizationResult =
	| { ok: true; input: JSONObject }
	| { ok: false; input: JSONObject; error: string };

function describeValue(value: unknown): string {
	if (Array.isArray(value)) return 'array';
	if (value === null) return 'null';
	return typeof value;
}

export function normalizeToolInputForModel(value: unknown): ToolInputNormalizationResult {
	if (typeof value === 'string') {
		try {
			const parsed: unknown = JSON.parse(value);
			if (isJsonObject(parsed)) return { ok: true, input: parsed };
			return {
				ok: false,
				input: {},
				error: `Tool input must be a JSON object, got ${describeValue(parsed)}.`,
			};
		} catch {
			return {
				ok: false,
				input: {},
				error: 'Tool input must be a valid JSON object string.',
			};
		}
	}

	if (isJsonObject(value)) return { ok: true, input: value };
	if (value === null || value === undefined) return { ok: true, input: {} };

	return {
		ok: false,
		input: {},
		error: `Tool input must be a JSON object, got ${describeValue(value)}.`,
	};
}

function toToolInputObject(value: JSONValue): JSONObject {
	return normalizeToolInputForModel(value).input;
}

function isJsonObject(value: unknown): value is JSONObject {
	return isRecord(value);
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
	return isRecord(value) ? value : undefined;
}

function hasEntries(value: Record<string, unknown>): boolean {
	return Object.keys(value).length > 0;
}

function hasReplayableReasoningProviderOptions(
	providerOptions: ProviderOptions | undefined,
): boolean {
	if (!providerOptions) return false;

	return Object.entries(providerOptions).some(([provider, options]) => {
		const replayKeys = getProviderQuirks(provider).reasoningReplayKeys;
		if (replayKeys) return replayKeys.some((key) => typeof options[key] === 'string');
		return hasEntries(options);
	});
}

function isReasoningMergedByProvider(part: AiContentPart): boolean {
	if (part.type !== 'reasoning') return false;
	return Object.keys(part.providerOptions ?? {}).some(
		(namespace) => getProviderQuirks(namespace).mergesAdjacentAssistantMessages === true,
	);
}

/** Whether a reasoning block carries replay data that the provider binds to the prompt prefix. */
export function isReasoningBoundToPrefix(block: MessageContent): boolean {
	if (!isReasoning(block)) return false;
	const namespaces = [
		...Object.keys(block.providerMetadata ?? {}),
		...Object.keys(block.providerOptions ?? {}),
	];
	return namespaces.some(
		(namespace) => getProviderQuirks(namespace).reasoningBoundToPrefix === true,
	);
}

export type ContentToolResultOutput = Extract<ToolResultPart['output'], { type: 'content' }>;

export function isContentToolResultOutput(value: unknown): value is ContentToolResultOutput {
	return (
		isRecord(value) &&
		value.type === 'content' &&
		Array.isArray(value.value) &&
		value.value.every(
			(part) =>
				isRecord(part) &&
				typeof part.type === 'string' &&
				(part.type !== 'text' || typeof part.text === 'string'),
		)
	);
}

function normalizeReasoningFileData(
	data: Extract<AiContentPart, { type: 'reasoning-file' }>['data'],
): ContentReasoningFile['data'] {
	if (data instanceof URL) return data.toString();
	if (typeof data !== 'object' || data === null || !('type' in data)) return data;
	if (data.type === 'data') return data.data;
	return data.url.toString();
}

/**
 * Providers replay reasoning from `providerOptions`, but the AI SDK exposes the
 * replay data in `providerMetadata` (see `PROVIDER_QUIRKS[provider].reasoningReplayKeys`).
 * Copy it across so the next request can replay the reasoning block. Existing
 * `providerOptions` values win.
 */
function toReasoningProviderOptions(block: ContentReasoning): ProviderOptions | undefined {
	const additions: ProviderOptions = {};

	for (const [provider, quirks] of Object.entries(PROVIDER_QUIRKS)) {
		const replayKeys = quirks.reasoningReplayKeys;
		if (!replayKeys) continue;

		const metadata = getRecord(block.providerMetadata?.[provider]);
		const replayed: JSONObject = {};
		for (const key of replayKeys) {
			if (typeof metadata?.[key] === 'string') replayed[key] = metadata[key];
		}
		if (hasEntries(replayed)) {
			additions[provider] = { ...replayed, ...block.providerOptions?.[provider] };
		}
	}

	if (!hasEntries(additions)) return block.providerOptions;

	return { ...block.providerOptions, ...additions };
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Text stand-in for a file part the model cannot receive as bytes (media type
 * unsupported, or hydration skipped/failed). The fileId is included so the
 * agent can hand the file to a tool that can process it.
 */
export function fileMetadataText(block: ContentFile): string {
	return `[${fileLabel(block)} — not directly viewable by this model]`;
}

function fileLabel(block: ContentFile): string {
	const name = block.fileRef?.fileName ?? 'file';
	const details = [
		block.mediaType,
		block.fileRef?.sizeBytes !== undefined ? formatFileSize(block.fileRef.sizeBytes) : undefined,
	]
		.filter((part): part is string => part !== undefined)
		.join(', ');
	const id = block.fileRef?.id;
	return `File attachment "${name}"${details ? ` (${details})` : ''}${id ? `, fileId: ${id}` : ''}`;
}

/**
 * Convert a user content block. A stored file that is sent as bytes gets a
 * label before it, so the model learns its fileId and can pass it to a tool.
 */
function toUserAiContent(block: MessageContent): Array<AiContentPart | undefined> {
	const part = toAiContent(block);
	if (part?.type === 'file' && isFile(block) && block.fileRef) {
		return [{ type: 'text', text: `[${fileLabel(block)}.]` }, part];
	}
	return [part];
}

/** Convert a single n8n MessageContent block to an AI SDK content part. */
function toAiContent(
	block: MessageContent,
	replayReasoningText = false,
): AiContentPart | undefined {
	let base: AiContentPart | undefined;
	if (isText(block)) {
		base = { type: 'text', text: block.text };
	} else if (isFile(block)) {
		base =
			block.data === undefined
				? { type: 'text', text: fileMetadataText(block) }
				: {
						type: 'file',
						data: block.data,
						mediaType: block.mediaType ?? 'application/octet-stream',
					};
	} else if (isReasoningFile(block)) {
		// Reasoning files are model-produced and carry no fileRef, so their data
		// is never stripped for storage; a data-less block has nothing to send.
		if (block.data !== undefined) {
			base = {
				type: 'reasoning-file',
				data: block.data,
				mediaType: block.mediaType,
			};
		}
	} else if (isCustom(block)) {
		base = { type: 'custom', kind: block.kind };
	} else if (isToolCall(block)) {
		base = {
			type: 'tool-call',
			toolCallId: block.toolCallId ?? '',
			toolName: block.toolName,
			input: toToolInputObject(block.input),
			providerExecuted: block.providerExecuted,
		};
	} else if (isReasoning(block)) {
		base = { type: 'reasoning', text: block.text };
	}

	if (base) {
		// Provider metadata can be required for replay. Gemini attaches
		// `google.thoughtSignature` to function-call parts, and the next request
		// is rejected if that signature is dropped from conversation history.
		const providerOptions = isReasoning(block)
			? toReasoningProviderOptions(block)
			: block.providerOptions;
		if (
			isReasoning(block) &&
			!replayReasoningText &&
			!hasReplayableReasoningProviderOptions(providerOptions)
		) {
			return undefined;
		}

		return {
			...base,
			...(block.providerMetadata && { providerMetadata: block.providerMetadata }),
			...(providerOptions && { providerOptions }),
		};
	}
	return base;
}

/**
 * Text for a file in a tool output that has no loaded bytes, for example when
 * it is outside the hydration budget or its bytes are gone. The model may
 * never have seen the file, so the text only states that it is not attached.
 * Keep it stable, so the prompt prefix stays cached.
 */
function detachedFileText(part: ContentFileWithRef): string {
	const name = part.fileRef.fileName ?? 'file';
	return `[File "${name}" (fileId: ${part.fileRef.id}) is not attached now.]`;
}

/**
 * Map file parts with a `fileRef` in a tool output to AI SDK parts. A loaded
 * file becomes a file part, and a part without data becomes a short text.
 */
function toModelContentOutput(output: ContentToolResultOutput): ContentToolResultOutput {
	if (toolOutputFileParts(output).length === 0) return output;
	return {
		...output,
		value: output.value.map((part) => {
			const candidate: unknown = part;
			if (!isFileRefPart(candidate)) return part;
			// Keep provider options, the same as `toAiContent` does for user files.
			const options = candidate.providerOptions && { providerOptions: candidate.providerOptions };
			if (candidate.data === undefined) {
				return { type: 'text', text: detachedFileText(candidate), ...options };
			}
			return {
				type: 'file',
				data: { type: 'data', data: candidate.data },
				mediaType: candidate.mediaType ?? 'application/octet-stream',
				...(candidate.fileRef.fileName ? { filename: candidate.fileRef.fileName } : {}),
				...options,
			};
		}),
	};
}

/** Build an AI SDK ToolResultPart from a resolved/rejected ContentToolCall. */
function toolCallToResultPart(
	block: ContentToolCall & { state: 'resolved' | 'rejected' },
	toolCallId: string,
): ToolResultPart {
	if (block.state === 'resolved') {
		return {
			type: 'tool-result',
			toolCallId,
			toolName: block.toolName,
			...(block.resultProviderOptions && { providerOptions: block.resultProviderOptions }),
			output: isContentToolResultOutput(block.output)
				? toModelContentOutput(block.output)
				: { type: 'json', value: block.output },
		};
	}
	// rejected
	const errorValue = block.error;
	if (typeof errorValue === 'string') {
		// Providers replay their own tool errors (e.g. a web search error code)
		// from error-json; error-text is dropped with a warning.
		return {
			type: 'tool-result',
			toolCallId,
			toolName: block.toolName,
			...(block.resultProviderOptions && { providerOptions: block.resultProviderOptions }),
			output: block.providerExecuted
				? { type: 'error-json', value: errorValue }
				: { type: 'error-text', value: errorValue },
		};
	}
	return {
		type: 'tool-result',
		toolCallId,
		toolName: block.toolName,
		...(block.resultProviderOptions && { providerOptions: block.resultProviderOptions }),
		output: { type: 'error-json', value: errorValue as JSONValue },
	};
}

function replayableToolCallId(id: unknown, messageIndex: number, blockIndex: number): string {
	if (typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id)) return id;

	// Keep stored IDs intact. Repair only the model request and its matching result.
	const digest = createHash('sha256')
		.update(`${messageIndex}:${blockIndex}:${String(id)}`)
		.digest('hex')
		.slice(0, 32);
	return `n8n_${digest}`;
}

/** Convert a single AI SDK content part to an n8n MessageContent block. */
function fromAiContent(part: AiContentPart): MessageContent | undefined {
	const providerMetadata = getRecord(
		'providerMetadata' in part ? part.providerMetadata : undefined,
	);
	const providerOptions = 'providerOptions' in part ? part.providerOptions : undefined;

	let base: MessageContent | undefined;
	switch (part.type) {
		case 'text':
			base = { type: 'text', text: part.text };
			break;
		case 'file': {
			const data =
				part.data instanceof URL ? part.data.toString() : (part.data as ContentFile['data']);
			base = { type: 'file', data, mediaType: part.mediaType };
			break;
		}
		case 'image': {
			const data =
				part.image instanceof URL ? part.image.toString() : (part.image as ContentFile['data']);
			base = { type: 'file', data, mediaType: part.mediaType };
			break;
		}
		case 'reasoning':
			base = { type: 'reasoning', text: part.text };
			break;
		case 'reasoning-file': {
			base = {
				type: 'reasoning-file',
				data: normalizeReasoningFileData(part.data),
				mediaType: part.mediaType,
			};
			break;
		}
		case 'custom':
			base = { type: 'custom', kind: part.kind };
			break;
		case 'tool-call': {
			const normalizedInput = normalizeToolInputForModel(part.input);
			base = {
				type: 'tool-call',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				input: normalizedInput.input,
				providerExecuted: part.providerExecuted,
				...(normalizedInput.ok
					? { state: 'pending' as const }
					: { state: 'rejected' as const, error: normalizedInput.error }),
			};
			break;
		}
		case 'tool-result':
			return undefined;
		// Ignore these types, because HITL is handled by our runtime
		case 'tool-approval-request':
		case 'tool-approval-response':
		default:
			return undefined;
	}

	if (base) {
		// Keep provider metadata on persisted content parts so provider-specific
		// replay data, such as Gemini thought signatures, survives memory/checkpoints.
		if (providerMetadata) base.providerMetadata = providerMetadata;
		if (providerOptions) base.providerOptions = providerOptions;
	}
	return base;
}

type SettledToolCall = ContentToolCall & { state: 'resolved' | 'rejected' };

/** Legacy DB blocks have no state, and pending blocks have no result to replay. */
function isSettledToolCall(block: MessageContent): block is SettledToolCall {
	return block.type === 'tool-call' && 'state' in block && block.state !== 'pending';
}

/**
 * Replayed settled tool calls still need their original provider metadata.
 * Gemini validates thought signatures on historical function-call parts, even
 * after the tool result is available.
 */
function toReplayedToolCallPart(block: ContentToolCall, toolCallId: string): ToolCallPart {
	return {
		type: 'tool-call',
		toolCallId,
		toolName: block.toolName,
		input: toToolInputObject(block.input),
		providerExecuted: block.providerExecuted,
		...(block.providerMetadata && { providerMetadata: block.providerMetadata }),
		...(block.providerOptions && { providerOptions: block.providerOptions }),
	};
}

/**
 * Group provider-executed results with a recorded position by the block index
 * they go before. A result never goes before its own call. Results at or past
 * the end share the last slot, in block order.
 */
function groupPositionedResults(
	content: MessageContent[],
	messageIndex: number,
): Map<number, ToolResultPart[]> {
	const groups = new Map<number, ToolResultPart[]>();
	for (const [blockIndex, block] of content.entries()) {
		if (!isSettledToolCall(block) || !block.providerExecuted) continue;
		if (block.resultPosition === undefined) continue;

		const slot = Math.min(Math.max(block.resultPosition, blockIndex + 1), content.length);
		const toolCallId = replayableToolCallId(block.toolCallId, messageIndex, blockIndex);
		const group = groups.get(slot) ?? [];
		group.push(toolCallToResultPart(block, toolCallId));
		groups.set(slot, group);
	}
	return groups;
}

/**
 * Client results go to separate tool messages. A provider-executed result
 * stays in the assistant message: right after its call when no position was
 * recorded, else at that position (see groupPositionedResults).
 */
function placeUnpositionedResult(
	block: SettledToolCall,
	toolCallId: string,
	assistantParts: AiContentPart[],
	resultMessages: ModelMessage[],
): void {
	if (!block.providerExecuted) {
		resultMessages.push({ role: 'tool', content: [toolCallToResultPart(block, toolCallId)] });
		return;
	}
	if (block.resultPosition !== undefined) return;
	assistantParts.push(toolCallToResultPart(block, toolCallId));
}

function toAssistantAiMessages(
	msg: Message,
	messageIndex: number,
	replayReasoningText: boolean,
): ModelMessage[] {
	const assistantParts: AiContentPart[] = [];
	const resultMessages: ModelMessage[] = [];
	const positionedResults = groupPositionedResults(msg.content, messageIndex);

	for (const [blockIndex, block] of msg.content.entries()) {
		assistantParts.push(...(positionedResults.get(blockIndex) ?? []));
		if (block.type !== 'tool-call') {
			const part = toAiContent(block, replayReasoningText);
			if (part) assistantParts.push(part);
			continue;
		}
		// Defense-in-depth: the strip step removes pending blocks first
		if (!isSettledToolCall(block)) continue;

		const toolCallId = replayableToolCallId(block.toolCallId, messageIndex, blockIndex);
		assistantParts.push(toReplayedToolCallPart(block, toolCallId));
		placeUnpositionedResult(block, toolCallId, assistantParts, resultMessages);
	}
	assistantParts.push(...(positionedResults.get(msg.content.length) ?? []));

	if (assistantParts.length === 0) return resultMessages;
	const assistantMsg: ModelMessage = {
		role: 'assistant',
		content: assistantParts as AiAssistantContent,
		...(msg.providerOptions && { providerOptions: msg.providerOptions }),
	};
	return [assistantMsg, ...resultMessages];
}

/**
 * Convert a single n8n Message to one or more AI SDK ModelMessages.
 *
 * For assistant messages with resolved/rejected tool-call blocks, this emits:
 *  1. The assistant ModelMessage (tool-call parts only, no result fields)
 *  2. One tool ModelMessage per settled tool-call block (resolved or rejected),
 *     except provider-executed blocks, whose result stays in the assistant message
 *
 * Pending tool-call blocks are silently skipped (defense-in-depth; the strip
 * step should already have removed them before forLlm() calls toAiMessages).
 */
function toAiMessageList(
	msg: Message,
	messageIndex: number,
	replayReasoningText = false,
): ModelMessage[] {
	switch (msg.role) {
		case 'system': {
			const text = msg.content
				.filter(isText)
				.map((b) => b.text)
				.join('');
			const base: ModelMessage = { role: 'system', content: text };
			return [msg.providerOptions ? { ...base, providerOptions: msg.providerOptions } : base];
		}

		case 'user': {
			const parts = msg.content
				.flatMap((block) => toUserAiContent(block))
				.filter((p): p is TextPart | FilePart => p?.type === 'text' || p?.type === 'file');
			const base: ModelMessage = { role: 'user', content: parts };
			return [msg.providerOptions ? { ...base, providerOptions: msg.providerOptions } : base];
		}

		case 'assistant':
			return toAssistantAiMessages(msg, messageIndex, replayReasoningText);

		case 'tool': {
			// Legacy role: 'tool' messages (from old DB rows). Don't emit them.
			return [];
		}

		default:
			throw new Error(`Unknown role: ${msg.role as string}`);
	}
}

/**
 * Convert n8n Messages to AI SDK ModelMessages for passing to stream/generateText.
 * `providerId` is the provider the request targets; it enables replay quirks
 * that cannot be derived from the blocks themselves (see
 * `PROVIDER_QUIRKS[provider].replayReasoningText`).
 */
export function toAiMessages(messages: Message[], providerId?: string): ModelMessage[] {
	const replayReasoningText =
		providerId !== undefined && (getProviderQuirks(providerId).replayReasoningText ?? false);
	// Text replay covers only the current tool chain: the messages after the last user message.
	const lastUserIndex = messages.map((message) => message.role).lastIndexOf('user');
	const modelMessages = messages.flatMap((message, index) =>
		toAiMessageList(message, index, replayReasoningText && index > lastUserIndex),
	);
	const result: ModelMessage[] = [];

	for (const [index, message] of modelMessages.entries()) {
		if (
			message.role !== 'assistant' ||
			typeof message.content === 'string' ||
			modelMessages[index + 1]?.role !== 'assistant'
		) {
			result.push(message);
			continue;
		}

		// Keep replayable reasoning only on the last of the merged responses so
		// signatures from separate turns never mix (see mergesAdjacentAssistantMessages).
		const content = message.content.filter((part) => !isReasoningMergedByProvider(part));
		if (content.length > 0) result.push({ ...message, content });
	}

	return result;
}

/**
 * Record where each provider-executed result sat in its assistant message, so
 * replay puts it back there. Anthropic rejects replayed thinking when the
 * blocks around it change order, for example after parallel web searches.
 */
function recordResultPositions(
	parts: readonly AiContentPart[],
	converted: Array<MessageContent | undefined>,
	content: MessageContent[],
): void {
	let keptBlocks = 0;
	for (const [index, part] of parts.entries()) {
		if (converted[index]) {
			keptBlocks++;
			continue;
		}
		if (part.type !== 'tool-result') continue;
		const block = content.find(
			(candidate): candidate is ContentToolCall =>
				candidate.type === 'tool-call' && candidate.toolCallId === part.toolCallId,
		);
		if (block) block.resultPosition = keptBlocks;
	}
}

function fromAiContentList(rawContent: ModelMessage['content']): MessageContent[] {
	if (typeof rawContent === 'string') return [{ type: 'text', text: rawContent }];
	const converted = rawContent.map(fromAiContent);
	const content = converted.filter((p): p is MessageContent => p !== undefined);
	recordResultPositions(rawContent, converted, content);
	return content;
}

/**
 * Convert AI SDK ModelMessages to n8n AgentMessages.
 *
 * This is a stateful walk: when a role:'tool' ModelMessage is encountered,
 * the matching tool-call block on the preceding assistant message is mutated
 * to 'resolved' or 'rejected'. The tool message itself is not emitted as a
 * separate n8n message.
 *
 * If a tool-result references a toolCallId not in the index (orphan), it is
 * silently dropped.
 */
export function fromAiMessages(messages: ModelMessage[]): AgentMessage[] {
	// Map from toolCallId → ContentToolCall block (mutable ref inside the n8n message)
	const toolCallIndex = new Map<string, ContentToolCall>();
	const result: AgentMessage[] = [];

	// Merge tool results back into the matching tool-call blocks
	const settleToolCalls = (parts: readonly AiContentPart[]) => {
		for (const part of parts) {
			if (part.type !== 'tool-result') continue;
			const block = toolCallIndex.get(part.toolCallId);
			if (!block) continue; // orphan — drop
			if (part.providerOptions) block.resultProviderOptions = part.providerOptions;

			const { output } = part;
			if (output.type === 'json' || output.type === 'text') {
				const mutableBlock = block as Extract<ContentToolCall, { state: 'resolved' }>;
				mutableBlock.state = 'resolved';
				mutableBlock.output = output.value as JSONValue;
			} else if (output.type === 'content') {
				const mutableBlock = block as Extract<ContentToolCall, { state: 'resolved' }>;
				mutableBlock.state = 'resolved';
				mutableBlock.output = output as JSONValue;
			} else if (output.type === 'error-json') {
				const mutableBlock = block as Extract<ContentToolCall, { state: 'rejected' }>;
				mutableBlock.state = 'rejected';
				mutableBlock.error = JSON.stringify(output.value);
			} else if (output.type === 'error-text') {
				const mutableBlock = block as Extract<ContentToolCall, { state: 'rejected' }>;
				mutableBlock.state = 'rejected';
				mutableBlock.error = output.value;
			} else {
				const mutableBlock = block as Extract<ContentToolCall, { state: 'rejected' }>;
				mutableBlock.state = 'rejected';
				mutableBlock.error = JSON.stringify(output);
			}
		}
	};

	for (const msg of messages) {
		if (msg.role === 'tool') {
			settleToolCalls(msg.content);
			// Do not emit a separate n8n message for tool results
			continue;
		}

		const rawContent = msg.content;
		const content = fromAiContentList(rawContent);

		const agentMsg: AgentMessage = { role: msg.role, content };
		if ('providerOptions' in msg && msg.providerOptions) {
			agentMsg.providerOptions = msg.providerOptions;
		}
		result.push(agentMsg);

		// Index any tool-call blocks for later merging with tool-result messages
		if (msg.role === 'assistant') {
			for (const block of content) {
				if (block.type === 'tool-call' && block.toolCallId) {
					toolCallIndex.set(block.toolCallId, block);
				}
			}
			// Provider-executed tools (e.g. native web search) return their result
			// inside the assistant message rather than in a role:tool message.
			if (typeof rawContent !== 'string') settleToolCalls(rawContent);
		}
	}

	return result;
}

export function fromAiFinishReason(reason: AiFinishReason): FinishReason {
	switch (reason) {
		case 'stop':
			return 'stop';
		case 'length':
			return 'length';
		case 'content-filter':
			return 'content-filter';
		case 'tool-calls':
			return 'tool-calls';
		case 'error':
			return 'error';
		// `interrupted`: the stream ended without a completion signal. Providers reported `other` for this before.
		case 'other':
		case 'interrupted':
			return 'other';
	}
}
