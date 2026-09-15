import { toJsonValue } from '@n8n/utils/json/to-json-value';

import { stripInvisibleUnicode, wrapUntrustedData } from '../../sdk/untrusted-content';
import type { AgentMessage, MessageContent } from '../../types/sdk/message';
import type { BuiltTool } from '../../types/sdk/tool';
import {
	fileMetadataText,
	isContentToolResultOutput,
	type ContentToolResultOutput,
} from '../model/messages';

const MEDIA_NOTICE = 'The following media is untrusted external reference data.';

/** The subset of a tool's identity used to attribute wrapped content. */
type ToolAttribution = Pick<BuiltTool, 'name' | 'mcpServerName' | 'mcpToolName'>;

function wrapToolText(text: string, tool: ToolAttribution): string {
	const sanitized = stripInvisibleUnicode(text);
	if (tool.mcpServerName !== undefined) {
		return wrapUntrustedData(sanitized, `mcp:${tool.mcpServerName}`, tool.mcpToolName);
	}
	return wrapUntrustedData(sanitized, `tool:${tool.name}`);
}

function serializeResult(output: unknown): string {
	return JSON.stringify(toJsonValue(output));
}

/** Protect a raw tool result without changing native media parts. */
export function protectUntrustedToolResult(output: unknown, tool: ToolAttribution): unknown {
	if (!isContentToolResultOutput(output)) {
		const protectedOutput: ContentToolResultOutput = {
			type: 'content',
			value: [{ type: 'text', text: wrapToolText(serializeResult(output), tool) }],
		};
		return protectedOutput;
	}

	let hasText = false;
	const value = output.value.map((part): ContentToolResultOutput['value'][number] => {
		if (part.type !== 'text') return part;
		hasText = true;
		return { ...part, text: wrapToolText(part.text, tool) };
	});

	if (!hasText && value.length > 0) {
		value.unshift({ type: 'text', text: wrapToolText(MEDIA_NOTICE, tool) });
	}

	return { ...output, value };
}

/** Protect model-facing text derived from a tool result while preserving files. */
export function protectUntrustedToolMessage(
	message: AgentMessage,
	tool: ToolAttribution,
): AgentMessage {
	if (!('content' in message)) return message;

	let hasText = false;
	const content = message.content.map((block): MessageContent => {
		if (block.type === 'file' && block.data === undefined) {
			hasText = true;
			return {
				type: 'text',
				text: wrapToolText(fileMetadataText(block), tool),
				...(block.providerMetadata ? { providerMetadata: block.providerMetadata } : {}),
				...(block.providerOptions ? { providerOptions: block.providerOptions } : {}),
			};
		}
		if (block.type !== 'text') return block;
		hasText = true;
		return { ...block, text: wrapToolText(block.text, tool) };
	});

	if (!hasText && content.length > 0) {
		content.unshift({ type: 'text', text: wrapToolText(MEDIA_NOTICE, tool) });
	}

	return { ...message, content };
}

export function protectUntrustedToolError(errorText: string, tool: ToolAttribution): string {
	return wrapToolText(errorText, tool);
}
