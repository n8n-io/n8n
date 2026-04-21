/* eslint-disable @typescript-eslint/no-unsafe-return */
import { McpBrowserError } from '../errors';
import { createSessionTools } from './session';
import { createMockConnection, findTool, structuredOf, TOOL_CONTEXT } from './test-helpers';

describe('createSessionTools', () => {
	const { connection } = createMockConnection();
	const tools = createSessionTools(connection);

	describe('browser_connect', () => {
		const tool = findTool(tools, 'browser_connect');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(tool.name).toBe('browser_connect');
			});

			it('has a non-empty description', () => {
				expect(tool.description.length).toBeGreaterThan(0);
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object (no required fields)', () => {
				expect(() => tool.inputSchema.parse({})).not.toThrow();
			});

			it('accepts valid browser name', () => {
				expect(() => tool.inputSchema.parse({ browser: 'chrome' })).not.toThrow();
			});

			it('accepts brave', () => {
				expect(() => tool.inputSchema.parse({ browser: 'brave' })).not.toThrow();
			});

			it('accepts edge', () => {
				expect(() => tool.inputSchema.parse({ browser: 'edge' })).not.toThrow();
			});

			it('accepts chromium', () => {
				expect(() => tool.inputSchema.parse({ browser: 'chromium' })).not.toThrow();
			});

			it('rejects unsupported browser', () => {
				expect(() => tool.inputSchema.parse({ browser: 'firefox' })).toThrow();
			});

			it('rejects non-string browser', () => {
				expect(() => tool.inputSchema.parse({ browser: 123 })).toThrow();
			});
		});

		describe('execute', () => {
			let freshConnection: ReturnType<typeof createMockConnection>;

			beforeEach(() => {
				freshConnection = createMockConnection();
			});

			it('calls connection.connect and returns browser and pages', async () => {
				const freshTools = createSessionTools(freshConnection.connection);
				const freshTool = findTool(freshTools, 'browser_connect');

				const result = await freshTool.execute({}, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(freshConnection.connection.connect).toHaveBeenCalled();
				expect(data.browser).toBe('chrome');
				expect(data.pages).toEqual([{ id: 'page1', title: 'Test Page', url: 'http://test.com' }]);
			});

			it('passes browser override to connect', async () => {
				const freshTools = createSessionTools(freshConnection.connection);
				const freshTool = findTool(freshTools, 'browser_connect');

				await freshTool.execute({ browser: 'brave' }, TOOL_CONTEXT);

				expect(freshConnection.connection.connect).toHaveBeenCalledWith('brave');
			});

			it('returns error when McpBrowserError is thrown', async () => {
				(freshConnection.connection.connect as jest.Mock).mockRejectedValue(
					new McpBrowserError('Already connected', 'Call browser_disconnect first'),
				);
				const freshTools = createSessionTools(freshConnection.connection);
				const freshTool = findTool(freshTools, 'browser_connect');

				const result = await freshTool.execute({}, TOOL_CONTEXT);

				expect(result.isError).toBe(true);
				const data = structuredOf(result);
				expect(data.error).toBe('Already connected');
				expect(data.hint).toBe('Call browser_disconnect first');
			});

			it('wraps generic errors in McpBrowserError', async () => {
				(freshConnection.connection.connect as jest.Mock).mockRejectedValue(
					new Error('Connection refused'),
				);
				const freshTools = createSessionTools(freshConnection.connection);
				const freshTool = findTool(freshTools, 'browser_connect');

				const result = await freshTool.execute({}, TOOL_CONTEXT);

				expect(result.isError).toBe(true);
				const data = structuredOf(result);
				expect(data.error).toBe('Connection refused');
			});
		});
	});

	describe('browser_disconnect', () => {
		const tool = findTool(tools, 'browser_disconnect');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(tool.name).toBe('browser_disconnect');
			});

			it('has a non-empty description', () => {
				expect(tool.description.length).toBeGreaterThan(0);
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => tool.inputSchema.parse({})).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls connection.disconnect and returns disconnected true', async () => {
				const fresh = createMockConnection();
				const freshTools = createSessionTools(fresh.connection);
				const freshTool = findTool(freshTools, 'browser_disconnect');

				const result = await freshTool.execute({}, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(fresh.connection.disconnect).toHaveBeenCalled();
				expect(data.disconnected).toBe(true);
			});

			it('returns error when disconnect throws', async () => {
				const fresh = createMockConnection();
				(fresh.connection.disconnect as jest.Mock).mockRejectedValue(
					new McpBrowserError('Disconnect failed'),
				);
				const freshTools = createSessionTools(fresh.connection);
				const freshTool = findTool(freshTools, 'browser_disconnect');

				const result = await freshTool.execute({}, TOOL_CONTEXT);

				expect(result.isError).toBe(true);
			});
		});
	});
});
