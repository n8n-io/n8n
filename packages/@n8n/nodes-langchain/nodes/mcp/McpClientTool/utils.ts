import type { Base64ContentBlock, PlainTextContentBlock } from '@langchain/core/messages';
import { DynamicStructuredTool, type DynamicStructuredToolInput } from '@langchain/core/tools';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { Toolkit } from 'langchain/agents';
import { type IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { convertJsonSchemaToZod } from '@utils/schemaParsing';

import type { McpToolIncludeMode } from './types';
import type { McpTool } from '../shared/types';

// MCP content types (simplified from @modelcontextprotocol/sdk/types)
export type McpContentItem =
	| { type: 'text'; text: string }
	| { type: 'image'; data: string; mimeType: string }
	| { type: 'audio'; data: string; mimeType: string }
	| {
			type: 'resource';
			resource: { uri: string; mimeType?: string; text?: string; blob?: string };
	  };

// LangChain standard content block format
type LangChainTextContent = PlainTextContentBlock & { type: 'text' };
type LangChainMediaContent = Base64ContentBlock & { type: 'image' | 'audio' };
type LangChainContent = LangChainTextContent | LangChainMediaContent;

const textContent = (text: string): LangChainTextContent => ({
	type: 'text',
	source_type: 'text',
	text,
});

const mediaContent = (
	type: 'image' | 'audio',
	mime_type: string,
	data: string,
): LangChainMediaContent => ({
	type,
	source_type: 'base64',
	mime_type,
	data,
});

const getMediaType = (mimeType: string): 'image' | 'audio' | null => {
	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('audio/')) return 'audio';
	return null;
};

const convertItem = (item: McpContentItem): LangChainContent[] => {
	switch (item.type) {
		case 'text':
			return [textContent(item.text)];
		case 'image':
			return [mediaContent('image', item.mimeType, item.data)];
		case 'audio':
			return [mediaContent('audio', item.mimeType, item.data)];
		case 'resource': {
			const { text, blob, mimeType } = item.resource;
			if (text) return [textContent(text)];
			if (blob && mimeType) {
				const type = getMediaType(mimeType);
				if (type) return [mediaContent(type, mimeType, blob)];
			}
			return [];
		}
		default:
			return item satisfies never;
	}
};

/**
 * Converts MCP content to LangChain standard content block format.
 * Returns a plain string for single text responses, or structured content array for mixed/media content.
 */
export function convertMcpContentToLangChain(
	content: McpContentItem[],
): string | LangChainContent[] {
	const result = content.flatMap(convertItem);

	if (result.length === 1 && result[0].type === 'text') {
		return result[0].text;
	}

	return result;
}

export function getSelectedTools({
	mode,
	includeTools,
	excludeTools,
	tools,
}: {
	mode: McpToolIncludeMode;
	includeTools?: string[];
	excludeTools?: string[];
	tools: McpTool[];
}) {
	switch (mode) {
		case 'selected': {
			if (!includeTools?.length) return tools;
			const include = new Set(includeTools);
			return tools.filter((tool) => include.has(tool.name));
		}
		case 'except': {
			const except = new Set(excludeTools ?? []);
			return tools.filter((tool) => !except.has(tool.name));
		}
		case 'all':
		default:
			return tools;
	}
}

export const getErrorDescriptionFromToolCall = (result: unknown): string | undefined => {
	if (result && typeof result === 'object') {
		if ('content' in result && Array.isArray(result.content)) {
			const errorMessage = (result.content as Array<{ type: 'text'; text: string }>).find(
				(content) => content && typeof content === 'object' && typeof content.text === 'string',
			)?.text;
			return errorMessage;
		} else if ('toolResult' in result && typeof result.toolResult === 'string') {
			return result.toolResult;
		}
		if ('message' in result && typeof result.message === 'string') {
			return result.message;
		}
	}

	return undefined;
};

export const createCallTool =
	(name: string, client: Client, timeout: number, onError: (error: string) => void) =>
	async (args: IDataObject) => {
		let result: Awaited<ReturnType<Client['callTool']>>;

		function handleError(error: unknown) {
			const errorDescription =
				getErrorDescriptionFromToolCall(error) ?? `Failed to execute tool "${name}"`;
			onError(errorDescription);
			return errorDescription;
		}

		try {
			result = await client.callTool({ name, arguments: args }, CompatibilityCallToolResultSchema, {
				timeout,
			});
		} catch (error) {
			return handleError(error);
		}

		if (result.isError) {
			return handleError(result);
		}

		if (result.toolResult !== undefined) {
			return result.toolResult;
		}

		if (result.content !== undefined) {
			return convertMcpContentToLangChain(result.content as McpContentItem[]);
		}

		return result;
	};

export function mcpToolToDynamicTool(
	tool: McpTool,
	onCallTool: DynamicStructuredToolInput['func'],
): DynamicStructuredTool {
	const rawSchema = convertJsonSchemaToZod(tool.inputSchema);

	// Ensure we always have an object schema for structured tools
	const objectSchema =
		rawSchema instanceof z.ZodObject ? rawSchema : z.object({ value: rawSchema });

	return new DynamicStructuredTool({
		name: tool.name,
		description: tool.description ?? '',
		schema: objectSchema,
		func: onCallTool,
		metadata: { isFromToolkit: true },
	});
}

export class McpToolkit extends Toolkit {
	constructor(public tools: DynamicStructuredTool[]) {
		super();
	}
}
