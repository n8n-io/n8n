import type {
	JSONValue,
	LanguageModelV4Content,
	LanguageModelV4Message,
	LanguageModelV4Prompt,
	LanguageModelV4ToolResultOutput,
	SharedV4FileData,
	SharedV4ProviderMetadata,
	SharedV4Warning,
} from '@ai-sdk/provider';
import { isJSONObject, isJSONValue } from '@ai-sdk/provider';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type { ContentToolResult, Message, MessageContent } from '../types/message';

type PromptPart = Exclude<LanguageModelV4Message['content'], string>[number];

/**
 * Converts an AI SDK prompt into the messages a chat model takes. The provider
 * options of a part become the metadata of its block, so the metadata that
 * `fromChatModelMessage` sent out comes back to the chat model.
 */
export function toChatModelMessages(
	prompt: LanguageModelV4Prompt,
	provider: string,
): {
	messages: Message[];
	warnings: SharedV4Warning[];
} {
	const messages: Message[] = [];
	const warnings: SharedV4Warning[] = [];

	for (const message of prompt) {
		if (message.role === 'system') {
			messages.push({ role: 'system', content: [{ type: 'text', text: message.content }] });
			continue;
		}

		const content: MessageContent[] = [];
		for (const part of message.content) {
			const block = toMessageContent(part, warnings);
			const providerMetadata = part.providerOptions?.[provider];
			if (block) content.push(providerMetadata ? { ...block, providerMetadata } : block);
		}
		if (content.length > 0) {
			messages.push({ role: message.role, content });
		}
	}

	return { messages, warnings };
}

function toMessageContent(
	part: PromptPart,
	warnings: SharedV4Warning[],
): MessageContent | undefined {
	switch (part.type) {
		case 'text':
			return { type: 'text', text: part.text };
		case 'reasoning':
			return { type: 'reasoning', text: part.text };
		case 'file': {
			const data = toChatModelFileData(part.data, warnings);
			return data === undefined ? undefined : { type: 'file', mediaType: part.mediaType, data };
		}
		case 'reasoning-file':
			warnings.push({ type: 'unsupported', feature: 'reasoning file input' });
			return undefined;
		case 'custom':
			warnings.push({ type: 'unsupported', feature: `custom part ${part.kind}` });
			return undefined;
		case 'tool-call':
			return {
				type: 'tool-call',
				toolCallId: part.toolCallId,
				toolName: part.toolName,
				input: JSON.stringify(part.input ?? {}),
			};
		case 'tool-result':
			return toToolResultContent(part.toolCallId, part.output);
		case 'tool-approval-response':
			warnings.push({ type: 'unsupported', feature: 'tool approval response' });
			return undefined;
	}
}

function toChatModelFileData(
	data: SharedV4FileData,
	warnings: SharedV4Warning[],
): string | Uint8Array | undefined {
	switch (data.type) {
		case 'data':
			return data.data;
		case 'text':
			return new TextEncoder().encode(data.text);
		case 'url':
			warnings.push({ type: 'unsupported', feature: 'file URL input' });
			return undefined;
		case 'reference':
			warnings.push({ type: 'unsupported', feature: 'file reference input' });
			return undefined;
	}
}

function toToolResultContent(
	toolCallId: string,
	output: LanguageModelV4ToolResultOutput,
): ContentToolResult {
	switch (output.type) {
		case 'text':
		case 'json':
			return { type: 'tool-result', toolCallId, result: output.value };
		case 'content':
			return { type: 'tool-result', toolCallId, result: output.value.map(toJsonContentPart) };
		case 'error-text':
		case 'error-json':
			return { type: 'tool-result', toolCallId, result: output.value, isError: true };
		case 'execution-denied':
			return {
				type: 'tool-result',
				toolCallId,
				result: output.reason ?? 'Tool execution was denied',
				isError: true,
			};
	}
}

type ToolResultContentPart = Extract<
	LanguageModelV4ToolResultOutput,
	{ type: 'content' }
>['value'][number];

/**
 * Chat models serialize a tool result as JSON. Binary file data and URL
 * objects do not survive that, so binary data becomes base64 and a URL
 * becomes its string form.
 */
function toJsonContentPart(part: ToolResultContentPart): JSONValue {
	return part.type === 'file' ? { ...part, data: toJsonFileData(part.data) } : part;
}

function toJsonFileData(data: SharedV4FileData): JSONValue {
	switch (data.type) {
		case 'data':
			return {
				type: 'data',
				data: typeof data.data === 'string' ? data.data : Buffer.from(data.data).toString('base64'),
			};
		case 'url':
			return { type: 'url', url: data.url.href };
		case 'reference':
			return { type: 'reference', reference: data.reference };
		case 'text':
			return { type: 'text', text: data.text };
	}
}

/** Converts a generated chat model message into AI SDK content parts. */
export function fromChatModelMessage(message: Message, provider: string): LanguageModelV4Content[] {
	// A chat model tool result carries no tool name. Take it from the tool call
	// with the same id in the same message.
	const toolNames = new Map<string, string>();
	const toolResultIds = new Set<string>();
	for (const block of message.content) {
		if (block.type === 'tool-call' && block.toolCallId) {
			toolNames.set(block.toolCallId, block.toolName);
		}
		if (block.type === 'tool-result') toolResultIds.add(block.toolCallId);
	}

	const content: LanguageModelV4Content[] = [];
	for (const block of message.content) {
		const part = fromMessageContent(block, toolNames, provider);
		if (part?.type === 'tool-call' && toolResultIds.has(part.toolCallId)) {
			// The model produced the result itself, so the caller must not run the tool.
			content.push({ ...part, providerExecuted: true });
		} else if (part) {
			content.push(part);
		}
	}
	return content;
}

function fromMessageContent(
	block: MessageContent,
	toolNames: Map<string, string>,
	provider: string,
): LanguageModelV4Content | undefined {
	const providerMetadata = toProviderMetadata(provider, block.providerMetadata);

	switch (block.type) {
		case 'text':
			return withMetadata({ type: 'text', text: block.text }, providerMetadata);
		case 'reasoning':
			return withMetadata({ type: 'reasoning', text: block.text }, providerMetadata);
		case 'file':
			return withMetadata(
				{
					type: 'file',
					mediaType: block.mediaType ?? 'application/octet-stream',
					data: { type: 'data', data: block.data },
				},
				providerMetadata,
			);
		case 'tool-call':
			return withMetadata(
				{
					type: 'tool-call',
					toolCallId: block.toolCallId ?? randomUUID(),
					toolName: block.toolName,
					input: block.input,
				},
				providerMetadata,
			);
		case 'invalid-tool-call':
			// The AI SDK validates tool input itself and reports a bad call to the
			// caller, so the call is forwarded as is. Without a name there is
			// nothing to forward.
			if (!block.name) return undefined;
			return withMetadata(
				{
					type: 'tool-call',
					toolCallId: block.toolCallId ?? randomUUID(),
					toolName: block.name,
					input: block.args ?? '{}',
				},
				providerMetadata,
			);
		case 'tool-result':
			return withMetadata(
				{
					type: 'tool-result',
					toolCallId: block.toolCallId,
					toolName: toolNames.get(block.toolCallId) ?? '',
					result: toJsonResult(block.result),
					isError: block.isError,
				},
				providerMetadata,
			);
		case 'citation':
			if (!block.url) return undefined;
			return withMetadata(
				{ type: 'source', sourceType: 'url', id: randomUUID(), url: block.url, title: block.title },
				providerMetadata,
			);
		case 'provider':
			return undefined;
	}
}

function withMetadata<T extends LanguageModelV4Content>(
	part: T,
	providerMetadata: SharedV4ProviderMetadata | undefined,
): T {
	return providerMetadata ? { ...part, providerMetadata } : part;
}

function toJsonResult(result: unknown): NonNullable<JSONValue> {
	if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
		return result;
	}
	return toJsonValue(result) ?? '';
}

/**
 * A round trip through JSON turns class instances such as a Date into plain
 * JSON. `isJSONValue` alone lets them pass, because it only inspects own
 * enumerable properties. `JSON.stringify` returns undefined for a function or
 * a symbol.
 */
function toJsonValue(value: unknown): NonNullable<JSONValue> | undefined {
	const serialized: string | undefined = JSON.stringify(value);
	if (serialized === undefined) return undefined;
	const parsed = jsonParse<unknown>(serialized);
	return isJSONValue(parsed) && parsed !== null ? parsed : undefined;
}

/**
 * Chat model metadata is a flat record that belongs to the chat model. The AI
 * SDK keys metadata by provider, so the record goes under the provider name.
 */
export function toProviderMetadata(
	provider: string,
	metadata: Record<string, unknown> | undefined,
): SharedV4ProviderMetadata | undefined {
	if (!metadata) return undefined;
	const value = toJsonValue(metadata);
	return isJSONObject(value) && Object.keys(value).length > 0 ? { [provider]: value } : undefined;
}
