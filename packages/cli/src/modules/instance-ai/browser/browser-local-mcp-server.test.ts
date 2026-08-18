import type { Logger } from '@n8n/backend-common';
import type { BrowserToolkit, ToolContext } from '@n8n/mcp-browser';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { BrowserLocalMcpServer } from './browser-local-mcp-server';

describe('BrowserLocalMcpServer', () => {
	function serverWithSchema(inputSchema: z.ZodTypeAny) {
		const toolkit = mock<BrowserToolkit>({
			tools: [
				{
					name: 'browser_click',
					description: 'Clicks an element',
					inputSchema,
					execute: async () => ({ content: [] }),
				},
			],
		});

		return new BrowserLocalMcpServer(toolkit, mock<ToolContext>(), mock<Logger>());
	}

	it('advertises tool input schemas with the 2020-12 keywords', () => {
		const server = serverWithSchema(
			z.object({ at: z.tuple([z.number(), z.number()]).rest(z.number()) }),
		);

		const [tool] = server.getAvailableTools();

		expect(tool.inputSchema.properties).toMatchObject({
			at: {
				type: 'array',
				prefixItems: [{ type: 'number' }, { type: 'number' }],
				items: { type: 'number' },
			},
		});
		expect(JSON.stringify(tool.inputSchema)).not.toContain('additionalItems');
	});

	it('skips a tool whose input schema is not an object', () => {
		const logger = mock<Logger>();
		const toolkit = mock<BrowserToolkit>({
			tools: [
				{
					name: 'browser_bad',
					description: 'Not an object schema',
					inputSchema: z.string(),
					execute: async () => ({ content: [] }),
				},
			],
		});

		const server = new BrowserLocalMcpServer(toolkit, mock<ToolContext>(), logger);

		expect(server.getAvailableTools()).toEqual([]);
		expect(logger.warn).toHaveBeenCalled();
	});
});
