import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import { isRecord } from '@n8n/utils/is-record';

import { getProviderQuirks } from './provider-quirks';
import { isLlmMessage } from '../../sdk/message';
import type {
	AgentMessage,
	ContentToolCall,
	Message,
	MessageContent,
} from '../../types/sdk/message';

const MAX_DEGRADED_INPUT_CHARS = 500;
const MAX_DEGRADED_OUTPUT_CHARS = 2_000;

interface MessageCompatibility {
	incompatible: boolean;
	isCrossProvider: boolean;
}

function providerNamespace(modelId: string): string | undefined {
	const prefix = getProviderPrefix(modelId);
	if (!prefix) return undefined;

	return getProviderQuirks(prefix).providerOptionsNamespace ?? prefix;
}

function hasRecordEntries(value: unknown): boolean {
	return isRecord(value) && Object.keys(value).length > 0;
}

function hasForeignKeys(record: unknown, currentNamespace: string): boolean {
	if (!isRecord(record)) return false;

	return Object.keys(record).some((key) => key !== currentNamespace);
}

function getProviderToolNamespace(toolName: string): string | undefined {
	const dotIndex = toolName.indexOf('.');
	if (dotIndex <= 0) return undefined;

	const prefix = toolName.slice(0, dotIndex);
	return getProviderQuirks(prefix).providerOptionsNamespace ?? prefix;
}

function hasModelSpecificBlocks(msg: Message, isCrossProvider: boolean): boolean {
	if (hasRecordEntries(msg.providerOptions)) return true;

	for (const block of msg.content) {
		if (hasRecordEntries(block.providerMetadata) || hasRecordEntries(block.providerOptions)) {
			return true;
		}

		if (block.type === 'reasoning-file' || block.type === 'custom' || block.type === 'provider') {
			return true;
		}

		// Provider-executed tool calls are always provider-bound. Regular tool calls
		// can also fail across providers (e.g. Gemini requires thoughtSignature).
		if (block.type === 'tool-call' && (block.providerExecuted === true || isCrossProvider)) {
			return true;
		}
	}

	return false;
}

function hasForeignProviderSignals(msg: Message, currentNamespace: string): boolean {
	if (hasForeignKeys(msg.providerOptions, currentNamespace)) return true;

	for (const block of msg.content) {
		if (hasForeignKeys(block.providerMetadata, currentNamespace)) return true;
		if (hasForeignKeys(block.providerOptions, currentNamespace)) return true;

		if (block.type === 'reasoning-file' || block.type === 'custom' || block.type === 'provider') {
			return true;
		}

		if (block.type === 'tool-call' && block.providerExecuted === true) {
			const toolNamespace = getProviderToolNamespace(block.toolName);
			if (toolNamespace && toolNamespace !== currentNamespace) return true;
		}
	}

	return false;
}

function classifyMessageCompatibility(
	msg: Message,
	currentModelId: string,
	currentNamespace: string | undefined,
): MessageCompatibility {
	if (msg.role !== 'assistant') {
		return { incompatible: false, isCrossProvider: false };
	}

	if (msg.model !== undefined) {
		if (msg.model === currentModelId) {
			return { incompatible: false, isCrossProvider: false };
		}

		const msgNamespace = providerNamespace(msg.model);
		const isCrossProvider =
			currentNamespace !== undefined && msgNamespace !== undefined
				? msgNamespace !== currentNamespace
				: true;

		return {
			incompatible: hasModelSpecificBlocks(msg, isCrossProvider),
			isCrossProvider,
		};
	}

	// Legacy messages without a stamped model ID use explicit foreign-provider signals.
	if (currentNamespace && hasForeignProviderSignals(msg, currentNamespace)) {
		return { incompatible: true, isCrossProvider: true };
	}

	return { incompatible: false, isCrossProvider: false };
}

/**
 * Return true when any uncompacted assistant message comes from a different
 * canonical model and contains model-specific blocks that can fail replay.
 */
export function hasIncompatibleModelHistory(
	messages: readonly AgentMessage[],
	currentModelId: string,
): boolean {
	if (!currentModelId || currentModelId === 'unknown') return false;

	const currentNamespace = providerNamespace(currentModelId);

	for (const message of messages) {
		if (!isLlmMessage(message)) continue;
		if (classifyMessageCompatibility(message, currentModelId, currentNamespace).incompatible) {
			return true;
		}
	}

	return false;
}

function truncateText(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;

	return `${value.slice(0, maxChars)}...[truncated ${value.length - maxChars} chars]`;
}

function safeSerialize(value: unknown, maxChars: number): string {
	try {
		const serialized = typeof value === 'string' ? value : (JSON.stringify(value) ?? '');
		return truncateText(serialized, maxChars);
	} catch {
		return '[unserializable]';
	}
}

function formatDegradedToolCall(
	block: Extract<ContentToolCall, { state: 'resolved' | 'rejected' }>,
): string {
	const input = safeSerialize(block.input, MAX_DEGRADED_INPUT_CHARS);

	if (block.state === 'resolved') {
		const output = safeSerialize(block.output, MAX_DEGRADED_OUTPUT_CHARS);
		return `[Previous tool call ${block.toolName} input=${input} output=${output}]`;
	}

	const error = truncateText(String(block.error), MAX_DEGRADED_OUTPUT_CHARS);
	return `[Previous tool call ${block.toolName} input=${input} error=${error}]`;
}

function stripBlockMetadata<T extends MessageContent>(block: T): T {
	if (block.providerMetadata === undefined && block.providerOptions === undefined) {
		return block;
	}

	const { providerMetadata: _pm, providerOptions: _po, ...rest } = block;
	return rest as T;
}

function sanitizeAssistantContent(
	content: MessageContent[],
	isCrossProvider: boolean,
): MessageContent[] {
	const sanitized: MessageContent[] = [];

	for (const block of content) {
		if (
			block.type === 'reasoning' ||
			block.type === 'reasoning-file' ||
			block.type === 'custom' ||
			block.type === 'provider'
		) {
			continue;
		}

		if (block.type === 'tool-call') {
			if (!('state' in block) || block.state === 'pending') continue;

			// Degrade provider-executed calls, cross-provider calls, and calls carrying
			// provider replay metadata (such as Gemini thoughtSignature) to text instead
			// of stripping metadata that the target provider requires on replay.
			if (
				block.providerExecuted === true ||
				isCrossProvider ||
				hasRecordEntries(block.providerMetadata) ||
				hasRecordEntries(block.providerOptions)
			) {
				sanitized.push({ type: 'text', text: formatDegradedToolCall(block) });
			} else {
				sanitized.push(block);
			}

			continue;
		}

		sanitized.push(stripBlockMetadata(block));
	}

	return sanitized;
}

/**
 * Fallback sanitizer for when foreign-model messages still reach the LLM
 * (observational memory disabled, compaction skipped/failed, or resume).
 * Returns the original array reference when no message needs sanitization.
 */
export function sanitizeForeignModelMessages(
	messages: Message[],
	currentModelId: string,
): Message[] {
	if (!currentModelId || currentModelId === 'unknown') return messages;

	const currentNamespace = providerNamespace(currentModelId);
	let changed = false;
	const result: Message[] = [];

	for (const msg of messages) {
		const status = classifyMessageCompatibility(msg, currentModelId, currentNamespace);
		if (!status.incompatible) {
			result.push(msg);
			continue;
		}

		changed = true;
		const content = sanitizeAssistantContent(msg.content, status.isCrossProvider);
		if (content.length === 0) continue;

		const { providerOptions: _po, ...rest } = msg;
		result.push({ ...rest, content });
	}

	return changed ? result : messages;
}
