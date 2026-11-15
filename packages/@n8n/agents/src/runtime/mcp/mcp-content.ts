import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

type McpContentBlock = CallToolResult['content'][number];

export type McpModelContentPart =
	| { type: 'text'; text: string }
	| { type: 'file'; data: { type: 'data'; data: string }; mediaType: string };

export function hasMcpMediaContent(content: McpContentBlock[]): boolean {
	return content.some(
		(block) => block.type === 'image' || (block.type === 'resource' && 'blob' in block.resource),
	);
}

export function mcpContentToModelParts(content: McpContentBlock[]): McpModelContentPart[] {
	return content
		.map(mcpBlockToModelPart)
		.filter((part): part is McpModelContentPart => part !== undefined);
}

function mcpBlockToModelPart(block: McpContentBlock): McpModelContentPart | undefined {
	if (block.type === 'text' && block.text) {
		return { type: 'text', text: block.text };
	}

	if (block.type === 'image' && block.data) {
		return {
			type: 'file',
			data: { type: 'data', data: block.data },
			mediaType: block.mimeType || 'image/png',
		};
	}

	if (block.type === 'resource') {
		if ('blob' in block.resource) {
			return {
				type: 'file',
				data: { type: 'data', data: block.resource.blob },
				mediaType: block.resource.mimeType ?? 'application/octet-stream',
			};
		}

		return {
			type: 'text',
			text: block.resource.text,
		};
	}

	return undefined;
}
