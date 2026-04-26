import { GATEWAY_CONFIRMATION_REQUIRED_PREFIX } from '@n8n/api-types';
import type { McpTool, McpToolCallResult } from '@n8n/api-types';

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

const PLAIN_CONFIRMATION_ERROR: McpToolCallResult = {
	content: [
		{
			type: 'text',
			text: `${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(CONFIRMATION_PAYLOAD)}`,
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
	const tool = tools[toolName];
	if (!tool?.execute) throw new Error(`Tool '${toolName}' has no execute function`);
	return tool.execute.bind(tool) as (
		args: Record<string, unknown>,
		ctx: unknown,
	) => Promise<McpToolCallResult>;
}

/** Build a ctx object with suspend/resumeData for use in execute calls. */
function makeCtx(opts: {
	suspend?: jest.Mock;
	resumeData?: Record<string, unknown> | null;
}): unknown {
	return { agent: { suspend: opts.suspend ?? jest.fn(), resumeData: opts.resumeData ?? null } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createToolsFromLocalMcpServer', () => {
	describe('tool creation', () => {
		it('creates a tool for each advertised tool', () => {
			const server = makeMockServer([SAMPLE_TOOL, { ...SAMPLE_TOOL, name: 'read_file' }]);
			const tools = createToolsFromLocalMcpServer(server);
			expect(Object.keys(tools)).toContain('write_file');
			expect(Object.keys(tools)).toContain('read_file');
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
			expect(createToolsFromLocalMcpServer(server)['bad_tool']).toBeDefined();
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

		it('does NOT call suspend() when ctx.agent is absent', async () => {
			const server = makeMockServer();
			server.callTool.mockResolvedValue(PLAIN_CONFIRMATION_ERROR);
			const execute = getExecute(server);

			// ctx without agent — suspend is unavailable
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
