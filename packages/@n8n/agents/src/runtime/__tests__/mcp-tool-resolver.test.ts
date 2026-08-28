import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';

import { McpConnection, type McpCallToolResult } from '../mcp/mcp-connection';
import { McpToolResolver } from '../mcp/mcp-tool-resolver';

const mcpTool: Tool = {
	name: 'read_file',
	inputSchema: { type: 'object' },
};

function resolveTool() {
	const connection = new McpConnection({ name: 'files', url: 'https://example.test/mcp' });
	return new McpToolResolver().resolve(connection, [mcpTool])[0];
}

describe('McpToolResolver media output', () => {
	it('converts mixed text and image output to native model and message content', async () => {
		const result: McpCallToolResult = {
			content: [
				{ type: 'text', text: 'Current screenshot' },
				{ type: 'image', data: 'base64-image', mimeType: 'image/png' },
			],
		};
		const tool = resolveTool();

		expect(tool.toModelOutput?.(result)).toEqual({
			type: 'content',
			value: [
				{ type: 'text', text: 'Current screenshot' },
				{ type: 'image-data', data: 'base64-image', mediaType: 'image/png' },
			],
		});
		expect(await tool.toMessage?.(result)).toEqual({
			role: 'assistant',
			content: [
				{ type: 'text', text: 'Current screenshot' },
				{ type: 'file', data: 'base64-image', mediaType: 'image/png' },
			],
		});
	});

	it('converts PDF resource output to native model and message content', async () => {
		const result: McpCallToolResult = {
			content: [
				{
					type: 'resource',
					resource: {
						uri: 'file:///report.pdf',
						blob: 'base64-pdf',
						mimeType: 'application/pdf',
					},
				},
			],
		};
		const tool = resolveTool();

		expect(tool.toModelOutput?.(result)).toEqual({
			type: 'content',
			value: [{ type: 'file-data', data: 'base64-pdf', mediaType: 'application/pdf' }],
		});
		expect(await tool.toMessage?.(result)).toEqual({
			role: 'assistant',
			content: [{ type: 'file', data: 'base64-pdf', mediaType: 'application/pdf' }],
		});
	});
});
