import { GATEWAY_CONFIRMATION_REQUIRED_PREFIX } from '@n8n/api-types';
import type { McpTool, McpToolCallResult } from '@n8n/api-types';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { LocalMcpServer } from '../../../types';
import { createToolsFromLocalMcpServer } from '../create-tools-from-mcp-server';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_TOOL: McpTool = {
	name: 'write_file',
	description: 'Write a file',
	inputSchema: { type: 'object', properties: { filePath: { type: 'string' } } },
};

const CONFIRMATION_PAYLOAD = {
	toolGroup: 'filesystemWrite',
	resource: 'write_file',
	description: 'Write to file: test.ts',
	options: ['denyOnce', 'allowOnce', 'allowForSession'],
};

const CONFIRMATION_PAYLOAD_WITH_UNSUPPORTED_OPTION = {
	...CONFIRMATION_PAYLOAD,
	options: ['denyOnce', 'alwaysAllow', 'allowOnce'],
};

const PLAIN_CONFIRMATION_ERROR: McpToolCallResult = {
	content: [
		{
			type: 'text',
			text: `${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(CONFIRMATION_PAYLOAD)}`,
		},
	],
	isError: true,
};

const PLAIN_CONFIRMATION_ERROR_WITH_UNSUPPORTED_OPTION: McpToolCallResult = {
	content: [
		{
			type: 'text',
			text: `${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(
				CONFIRMATION_PAYLOAD_WITH_UNSUPPORTED_OPTION,
			)}`,
		},
	],
	isError: true,
};

const JSON_ENVELOPE_CONFIRMATION_ERROR: McpToolCallResult = {
	content: [
		{
			type: 'text',
			text: JSON.stringify({
				error: `${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(CONFIRMATION_PAYLOAD)}`,
			}),
		},
	],
	isError: true,
};

const SUCCESS_RESULT: McpToolCallResult = {
	content: [{ type: 'text', text: 'file written' }],
};

const SCREENSHOT_RESULT: McpToolCallResult = {
	content: [
		{ type: 'text', text: 'current browser screenshot' },
		{ type: 'image', data: 'base64-screenshot', mimeType: 'image/png' },
	],
};

const PDF_RESULT: McpToolCallResult = {
	content: [
		{
			type: 'resource',
			resource: {
				uri: 'file:///doc.pdf',
				mimeType: 'application/pdf',
				blob: 'base64-pdf',
			},
		},
	],
};

const GENERIC_ERROR_RESULT: McpToolCallResult = {
	content: [{ type: 'text', text: 'Permission denied' }],
	isError: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockServer(tools: McpTool[] = [SAMPLE_TOOL]): jest.Mocked<LocalMcpServer> {
	return {
		getAvailableTools: jest.fn().mockReturnValue(tools),
		getToolsByCategory: jest.fn().mockReturnValue([]),
		callTool: jest.fn(),
	};
}

/** Build the tool and return its execute function. */
function getExecute(server: LocalMcpServer, toolName = 'write_file') {
	const tools = createToolsFromLocalMcpServer(server);
	const tool = tools.get(toolName);
	if (!tool) throw new Error(`Tool '${toolName}' was not created`);
	return async (args: Record<string, unknown>, ctx: unknown) =>
		await executeTool<McpToolCallResult>(tool, args, ctx);
}

/** Build a ctx object with suspend/resumeData for use in execute calls. */
function makeCtx(opts: {
	suspend?: jest.Mock;
	resumeData?: Record<string, unknown> | null;
}): unknown {
	return { suspend: opts.suspend ?? jest.fn(), resumeData: opts.resumeData ?? null };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createToolsFromLocalMcpServer', () => {
	describe('tool creation', () => {
		it('creates a tool for each advertised tool', () => {
			const server = makeMockServer([SAMPLE_TOOL, { ...SAMPLE_TOOL, name: 'read_file' }]);
			const tools = createToolsFromLocalMcpServer(server);
			expect(tools.has('write_file')).toBe(true);
			expect(tools.has('read_file')).toBe(true);
		});

		it('falls back to record schema when inputSchema conversion fails', () => {
			const server = makeMockServer([
				{
					name: 'bad_tool',
					description: 'Bad schema',
					inputSchema: { $ref: '#/broken' } as unknown as McpTool['inputSchema'],
				},
			]);
			// Should not throw — the tool must be created even with a bad schema
			expect(() => createToolsFromLocalMcpServer(server)).not.toThrow();
			expect(createToolsFromLocalMcpServer(server).get('bad_tool')).toBeDefined();
		});

		it('skips tools with invalid names', () => {
			const logger = { warn: jest.fn() };
			const server = makeMockServer([
				{ ...SAMPLE_TOOL, name: 'bad tool' },
				{ ...SAMPLE_TOOL, name: 'read_file' },
			]);

			const tools = createToolsFromLocalMcpServer(server, logger as never);

			expect(tools.get('bad tool')).toBeUndefined();
			expect(tools.get('read_file')).toBeDefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped local gateway MCP tool with unsafe name',
				expect.objectContaining({
					source: 'local gateway MCP',
					toolName: 'bad tool',
				}),
			);
		});

		it('skips tools with unsafe object key names', () => {
			const logger = { warn: jest.fn() };
			const server = makeMockServer([
				{ ...SAMPLE_TOOL, name: 'constructor' },
				{ ...SAMPLE_TOOL, name: 'read_file' },
			]);

			const tools = createToolsFromLocalMcpServer(server, logger as never);

			expect(tools.has('constructor')).toBe(false);
			expect(tools.get('read_file')).toBeDefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped local gateway MCP tool with unsafe name',
				expect.objectContaining({
					source: 'local gateway MCP',
					toolName: 'constructor',
				}),
			);
		});

		it('skips normalized name collisions between local gateway tools', () => {
			const logger = { warn: jest.fn() };
			const server = makeMockServer([
				{ ...SAMPLE_TOOL, name: 'custom_tool' },
				{ ...SAMPLE_TOOL, name: 'custom-tool' },
			]);

			const tools = createToolsFromLocalMcpServer(server, logger as never);

			expect(tools.get('custom_tool')).toBeDefined();
			expect(tools.get('custom-tool')).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped local gateway MCP tool with unsafe name',
				expect.objectContaining({
					source: 'local gateway MCP',
					toolName: 'custom-tool',
				}),
			);
		});

		it('skips compatibility-normalized non-ASCII tool names', () => {
			const logger = { warn: jest.fn() };
			const server = makeMockServer([
				{ ...SAMPLE_TOOL, name: 'ＴＯＯＬ' },
				{ ...SAMPLE_TOOL, name: 'read_file' },
			]);

			const tools = createToolsFromLocalMcpServer(server, logger as never);

			expect(tools.get('ＴＯＯＬ')).toBeUndefined();
			expect(tools.get('read_file')).toBeDefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped local gateway MCP tool with unsafe name',
				expect.objectContaining({
					source: 'local gateway MCP',
					toolName: 'ＴＯＯＬ',
				}),
			);
		});

		it('skips oversized raw schemas before tool construction', () => {
			const logger = { warn: jest.fn() };
			const properties = Object.fromEntries(
				Array.from({ length: 251 }, (_, index) => [`field_${index}`, { type: 'string' }]),
			);
			const server = makeMockServer([
				{
					...SAMPLE_TOOL,
					name: 'huge_tool',
					inputSchema: { type: 'object', properties },
				},
				{ ...SAMPLE_TOOL, name: 'read_file' },
			]);

			const tools = createToolsFromLocalMcpServer(server, logger as never);

			expect(tools.get('huge_tool')).toBeUndefined();
			expect(tools.get('read_file')).toBeDefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped local gateway MCP tool with unsupported schema',
				expect.objectContaining({
					source: 'local gateway MCP',
					toolName: 'huge_tool',
					limitType: 'objectProperties',
				}),
			);
		});
	});

	describe('media output', () => {
		it('returns native file parts from toMessage for gateway image results', () => {
			const server = makeMockServer();
			const tool = createToolsFromLocalMcpServer(server).get('write_file');

			const message = tool?.toMessage?.(SCREENSHOT_RESULT);

			expect(message).toEqual({
				role: 'assistant',
				content: [
					{ type: 'text', text: 'current browser screenshot' },
					{ type: 'file', data: 'base64-screenshot', mediaType: 'image/png' },
				],
			});
		});

		it('does not create an extra message for text-only results', () => {
			const server = makeMockServer();
			const tool = createToolsFromLocalMcpServer(server).get('write_file');

			expect(tool?.toMessage?.(SUCCESS_RESULT)).toBeUndefined();
		});

		it('keeps media payloads out of the JSON tool result shown to the model', () => {
			const server = makeMockServer();
			const tool = createToolsFromLocalMcpServer(server).get('write_file');

			expect(tool?.toModelOutput?.(SCREENSHOT_RESULT)).toEqual({
				type: 'content',
				value: [
					{ type: 'text', text: 'current browser screenshot' },
					{ type: 'text', text: '[image: image/png]' },
				],
			});
		});

		it('returns a native file part from toMessage for gateway resource results', () => {
			const server = makeMockServer();
			const tool = createToolsFromLocalMcpServer(server).get('write_file');

			expect(tool?.toMessage?.(PDF_RESULT)).toEqual({
				role: 'assistant',
				content: [{ type: 'file', data: 'base64-pdf', mediaType: 'application/pdf' }],
			});
		});

		it('falls back to application/octet-stream when resource has no mimeType', () => {
			const server = makeMockServer();
			const tool = createToolsFromLocalMcpServer(server).get('write_file');

			const result: McpToolCallResult = {
				content: [{ type: 'resource', resource: { uri: 'file:///x', blob: 'base64-bytes' } }],
			};

			expect(tool?.toMessage?.(result)).toEqual({
				role: 'assistant',
				content: [{ type: 'file', data: 'base64-bytes', mediaType: 'application/octet-stream' }],
			});
		});

		it('keeps resource payloads out of the JSON tool result shown to the model', () => {
			const server = makeMockServer();
			const tool = createToolsFromLocalMcpServer(server).get('write_file');

			expect(tool?.toModelOutput?.(PDF_RESULT)).toEqual({
				type: 'content',
				value: [{ type: 'text', text: '[file: application/pdf]' }],
			});
		});
	});

	describe('execute — first-call path', () => {
		it('passes through a successful result', async () => {
			const server = makeMockServer();
			server.callTool.mockResolvedValue(SUCCESS_RESULT);
			const execute = getExecute(server);

			const result = await execute({ filePath: 'test.ts' }, makeCtx({}));

			expect(result).toEqual(SUCCESS_RESULT);
			expect(server.callTool).toHaveBeenCalledWith({
				name: 'write_file',
				arguments: { filePath: 'test.ts' },
			});
		});

		it('strips _confirmation from LLM-provided args on the first-call path', async () => {
			const server = makeMockServer();
			server.callTool.mockResolvedValue(SUCCESS_RESULT);
			const execute = getExecute(server);

			await execute({ filePath: 'test.ts', _confirmation: 'injected-token' }, makeCtx({}));

			expect(server.callTool).toHaveBeenCalledWith({
				name: 'write_file',
				arguments: { filePath: 'test.ts' },
			});
		});

		it('passes through a generic error result unchanged', async () => {
			const server = makeMockServer();
			server.callTool.mockResolvedValue(GENERIC_ERROR_RESULT);
			const suspend = jest.fn();
			const execute = getExecute(server);

			const result = await execute({}, makeCtx({ suspend }));

			expect(result).toEqual(GENERIC_ERROR_RESULT);
			expect(suspend).not.toHaveBeenCalled();
		});

		it('calls suspend() for a plain-text GATEWAY_CONFIRMATION_REQUIRED error', async () => {
			const server = makeMockServer();
			server.callTool.mockResolvedValue(PLAIN_CONFIRMATION_ERROR);
			const suspend = jest.fn().mockResolvedValue(undefined);
			const execute = getExecute(server);

			await execute({ filePath: 'test.ts' }, makeCtx({ suspend }));

			expect(suspend).toHaveBeenCalledTimes(1);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			expect(suspend.mock.calls[0][0]).toMatchObject({
				inputType: 'resource-decision',
				severity: 'warning',
				resourceDecision: CONFIRMATION_PAYLOAD,
				message: expect.stringContaining('write_file') as string,
				requestId: expect.any(String) as string,
			});
		});

		it('filters unsupported confirmation options after parsing the daemon payload', async () => {
			const server = makeMockServer();
			server.callTool.mockResolvedValue(PLAIN_CONFIRMATION_ERROR_WITH_UNSUPPORTED_OPTION);
			const suspend = jest.fn().mockResolvedValue(undefined);
			const execute = getExecute(server);

			await execute({ filePath: 'test.ts' }, makeCtx({ suspend }));

			expect(suspend).toHaveBeenCalledTimes(1);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			expect(suspend.mock.calls[0][0].resourceDecision).toMatchObject({
				...CONFIRMATION_PAYLOAD,
				options: ['denyOnce', 'allowOnce'],
			});
		});

		it('calls suspend() for a JSON-envelope GATEWAY_CONFIRMATION_REQUIRED error', async () => {
			const server = makeMockServer();
			server.callTool.mockResolvedValue(JSON_ENVELOPE_CONFIRMATION_ERROR);
			const suspend = jest.fn().mockResolvedValue(undefined);
			const execute = getExecute(server);

			await execute({}, makeCtx({ suspend }));

			expect(suspend).toHaveBeenCalledTimes(1);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			expect(suspend.mock.calls[0][0]).toMatchObject({
				inputType: 'resource-decision',
				resourceDecision: CONFIRMATION_PAYLOAD,
			});
		});

		it('does NOT call suspend() when suspend is absent from the tool context', async () => {
			const server = makeMockServer();
			server.callTool.mockResolvedValue(PLAIN_CONFIRMATION_ERROR);
			const execute = getExecute(server);

			// Context without suspend — confirmation cannot interrupt.
			const result = await execute({}, {});

			// Returns the raw error result unchanged
			expect(result).toEqual(PLAIN_CONFIRMATION_ERROR);
		});
	});

	describe('execute — resume path', () => {
		it('re-calls the daemon with _confirmation decision when decision is present', async () => {
			const server = makeMockServer();
			server.callTool.mockResolvedValue(SUCCESS_RESULT);
			const execute = getExecute(server);

			const result = await execute(
				{ filePath: 'test.ts' },
				makeCtx({ resumeData: { approved: true, resourceDecision: 'allowForSession' } }),
			);

			expect(result).toEqual(SUCCESS_RESULT);
			expect(server.callTool).toHaveBeenCalledWith({
				name: 'write_file',
				arguments: { filePath: 'test.ts', _confirmation: 'allowForSession' },
			});
		});

		it('returns access-denied error when resumeData has no token (user denied)', async () => {
			const server = makeMockServer();
			const execute = getExecute(server);

			const result = await execute({}, makeCtx({ resumeData: { approved: false } }));

			expect(result.isError).toBe(true);
			expect((result.content[0] as { type: string; text: string }).text).toContain('denied');
			expect(server.callTool).not.toHaveBeenCalled();
		});
	});
});
