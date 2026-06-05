import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type {
	FilePart,
	ModelMessage,
	TextPart,
	TextStreamPart,
	ToolCallPart,
	ToolResultPart,
	ToolSet,
} from 'ai';

import { toJsonValue } from './json-value';
import { fromAiMessages } from './messages';
import type { AgentMessage } from '../types/sdk/message';

type AiStreamPart = TextStreamPart<ToolSet>;
type PartialTextContentPart = { type: 'text'; text: string; providerMetadata?: ProviderOptions };
type PartialDirectContentPart = Extract<
	AiStreamPart,
	{ type: 'source' | 'file' | 'tool-call' | 'tool-result' | 'tool-error' }
>;
type PartialResponseContentPart = PartialTextContentPart | PartialDirectContentPart;

function isPartialDirectContentPart(chunk: AiStreamPart): chunk is PartialDirectContentPart {
	return (
		chunk.type === 'source' ||
		chunk.type === 'file' ||
		chunk.type === 'tool-call' ||
		chunk.type === 'tool-result' ||
		chunk.type === 'tool-error'
	);
}

export class PartialResponseAccumulator {
	private readonly content: PartialResponseContentPart[] = [];

	private readonly textById = new Map<string, PartialTextContentPart>();

	add(chunk: AiStreamPart): void {
		if (chunk.type === 'text-start') {
			this.getOrCreateTextPart(chunk.id, chunk.providerMetadata);
			return;
		}

		if (chunk.type === 'text-delta') {
			const textPart = this.getOrCreateTextPart(chunk.id, chunk.providerMetadata);
			textPart.text += chunk.text;
			return;
		}

		if (isPartialDirectContentPart(chunk)) {
			this.content.push(chunk);
		}
	}

	toAgentMessages(): AgentMessage[] {
		return fromAiMessages(this.toModelMessages());
	}

	private getOrCreateTextPart(
		id: string,
		providerMetadata: ProviderOptions | undefined,
	): PartialTextContentPart {
		const existing = this.textById.get(id);
		if (existing) return existing;

		const textPart: PartialTextContentPart = {
			type: 'text',
			text: '',
			...(providerMetadata !== undefined ? { providerMetadata } : {}),
		};
		this.textById.set(id, textPart);
		this.content.push(textPart);
		return textPart;
	}

	private toModelMessages(): ModelMessage[] {
		const assistantContent: Array<TextPart | FilePart | ToolCallPart> = [];
		const toolContent: ToolResultPart[] = [];

		for (const part of this.content) {
			if (part.type === 'source') continue;

			if (part.type === 'text') {
				if (part.text.length === 0) continue;
				assistantContent.push({
					type: 'text',
					text: part.text,
					...(part.providerMetadata !== undefined
						? { providerOptions: part.providerMetadata }
						: {}),
				});
				continue;
			}

			if (part.type === 'file') {
				assistantContent.push({
					type: 'file',
					data: part.file.base64,
					mediaType: part.file.mediaType,
					...(part.providerMetadata !== undefined
						? { providerOptions: part.providerMetadata }
						: {}),
				});
				continue;
			}

			if (part.type === 'tool-call') {
				assistantContent.push({
					type: 'tool-call',
					toolCallId: part.toolCallId,
					toolName: part.toolName,
					input: part.input,
					...(part.providerExecuted !== undefined
						? { providerExecuted: part.providerExecuted }
						: {}),
					...(part.providerMetadata !== undefined
						? { providerOptions: part.providerMetadata }
						: {}),
				});
				continue;
			}

			if (part.type === 'tool-result' || part.type === 'tool-error') {
				toolContent.push({
					type: 'tool-result',
					toolCallId: part.toolCallId,
					toolName: part.toolName,
					output:
						part.type === 'tool-result'
							? toToolResultOutput(part.output)
							: toToolErrorOutput(part.error),
					...(part.providerMetadata !== undefined
						? { providerOptions: part.providerMetadata }
						: {}),
				});
			}
		}

		const messages: ModelMessage[] = [];
		if (assistantContent.length > 0) {
			messages.push({ role: 'assistant', content: assistantContent });
		}
		if (toolContent.length > 0) {
			messages.push({ role: 'tool', content: toolContent });
		}
		return messages;
	}
}

function toToolResultOutput(output: unknown): ToolResultPart['output'] {
	if (typeof output === 'string') return { type: 'text', value: output };
	return { type: 'json', value: toJsonValue(output) };
}

function toToolErrorOutput(error: unknown): ToolResultPart['output'] {
	if (typeof error === 'string') return { type: 'error-text', value: error };
	return { type: 'error-json', value: toJsonValue(error) };
}
