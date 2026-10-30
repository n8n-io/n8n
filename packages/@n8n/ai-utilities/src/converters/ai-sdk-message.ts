import type {
	JSONObject,
	JSONValue,
	LanguageModelV3Content,
	LanguageModelV3Message,
	LanguageModelV3Prompt,
	LanguageModelV3ToolResultOutput,
	SharedV3ProviderMetadata,
	SharedV3Warning,
} from '@ai-sdk/provider';
import { isJSONObject, isJSONValue } from '@ai-sdk/provider';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type { ContentToolResult, Message, MessageContent } from '../types/message';

type PromptPart = Exclude<LanguageModelV3Message['content'], string>[number];

/** Converts an AI SDK prompt into the messages a chat model takes. */
export function toChatModelMessages(prompt: LanguageModelV3Prompt): {
	messages: Message[];
	warnings: SharedV3Warning[];
} {
	const messages: Message[] = [];
	const warnings: SharedV3Warning[] = [];

	for (const message of prompt) {
		if (message.role === 'system') {
			messages.push({ role: 'system', content: [{ type: 'text', text: message.content }] });
			continue;
		}

		const content: MessageContent[] = [];
		for (const part of message.content) {
			const block = toMessageContent(part, warnings);
			if (block) content.push(block);
		}
		if (content.length > 0) {
			messages.push({ role: message.role, content });
		}
	}

	return { messages, warnings };
}

function toMessageContent(
	part: PromptPart,
	warnings: SharedV3Warning[],
): MessageContent | undefined {
	switch (part.type) {
		case 'text':
			return { type: 'text', text: part.text };
		case 'reasoning':
			return { type: 'reasoning', text: part.text };
		case 'file':
			if (part.data instanceof URL) {
				warnings.push({ type: 'unsupported', feature: 'file URL input' });
				return undefined;
			}
			return { type: 'file', mediaType: part.mediaType, data: part.data };
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

function toToolResultContent(
	toolCallId: string,
	output: LanguageModelV3ToolResultOutput,
): ContentToolResult {
	switch (output.type) {
		case 'text':
		case 'json':
		case 'content':
			return { type: 'tool-result', toolCallId, result: output.value };
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

/** Converts a generated chat model message into AI SDK content parts. */
export function fromChatModelMessage(message: Message): LanguageModelV3Content[] {
	// A chat model tool result carries no tool name. Take it from the tool call
	// with the same id in the same message.
	const toolNames = new Map<string, string>();
	for (const block of message.content) {
		if (block.type === 'tool-call' && block.toolCallId) {
			toolNames.set(block.toolCallId, block.toolName);
		}
	}

	const content: LanguageModelV3Content[] = [];
	for (const block of message.content) {
		const part = fromMessageContent(block, toolNames);
		if (part) content.push(part);
	}
	return content;
}

function fromMessageContent(
	block: MessageContent,
	toolNames: Map<string, string>,
): LanguageModelV3Content | undefined {
	const providerMetadata = toProviderMetadata(block.providerMetadata);

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
					data: block.data,
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

function withMetadata<T extends LanguageModelV3Content>(
	part: T,
	providerMetadata: SharedV3ProviderMetadata | undefined,
): T {
	return providerMetadata ? { ...part, providerMetadata } : part;
}

function toJsonResult(result: unknown): NonNullable<JSONValue> {
	if (result === null || result === undefined) return '';
	if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
		return result;
	}
	// A round trip through JSON turns class instances such as a Date into plain
	// JSON. `isJSONValue` alone lets them pass, because it only inspects own
	// enumerable properties. `JSON.stringify` returns undefined for a function
	// or a symbol.
	const serialized: string | undefined = JSON.stringify(result);
	if (serialized === undefined) return '';
	const parsed = jsonParse<unknown>(serialized);
	return isJSONValue(parsed) && parsed !== null ? parsed : serialized;
}

/** Keeps the entries of chat model provider metadata that the AI SDK accepts. */
export function toProviderMetadata(
	metadata: Record<string, unknown> | undefined,
): SharedV3ProviderMetadata | undefined {
	if (!metadata) return undefined;
	const entries = Object.entries(metadata).filter((entry): entry is [string, JSONObject] =>
		isJSONObject(entry[1]),
	);
	return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
