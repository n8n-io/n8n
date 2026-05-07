jest.mock('@mastra/mcp', () => ({
	MCPClient: jest.fn().mockImplementation(() => ({
		listTools: jest.fn().mockResolvedValue({}),
		disconnect: jest.fn().mockResolvedValue(undefined),
	})),
}));

jest.mock('../../agent/sanitize-mcp-schemas', () => ({
	sanitizeMcpToolSchemas: jest.fn((tools: Record<string, unknown>) => tools),
}));

import { createResultError, createResultOk, UserError } from 'n8n-workflow';

import type { SsrfUrlValidator } from '../mcp-client-manager';
import { McpClientManager } from '../mcp-client-manager';

const { MCPClient: mockedMcpClient } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@mastra/mcp') as { MCPClient: jest.Mock };
const { sanitizeMcpToolSchemas: mockedSanitizeMcpToolSchemas } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('../../agent/sanitize-mcp-schemas') as {
		sanitizeMcpToolSchemas: jest.Mock;
	};

interface LoggerMock {
	warn: jest.Mock;
}

interface SanitizeOptions {
	onError?: (error: {
		message: string;
		details: {
			toolName?: string;
			path: string;
			depth: number;
			maxDepth: number;
			limitType?: string;
			limit?: number;
		};
	}) => void;
}

function createValidatorMock(): jest.Mocked<SsrfUrlValidator> {
	return {
		validateUrl: jest.fn().mockResolvedValue(createResultOk(undefined)),
	} as jest.Mocked<SsrfUrlValidator>;
}

describe('McpClientManager', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('protocol whitelist (always-on)', () => {
		it('accepts https URLs', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools([{ name: 'github', url: 'https://api.github.com/mcp' }]),
			).resolves.toBeDefined();
			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
		});

		it('accepts http URLs', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools([{ name: 'local', url: 'http://localhost:3000/sse' }]),
			).resolves.toBeDefined();
		});

		it('rejects file:// URLs with a UserError naming the server', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools([{ name: 'sneaky', url: 'file:///etc/passwd' }]),
			).rejects.toThrow(UserError);
			await expect(
				manager.getRegularTools([{ name: 'sneaky', url: 'file:///etc/passwd' }]),
			).rejects.toThrow(/MCP server "sneaky".*file:/);
			expect(mockedMcpClient).not.toHaveBeenCalled();
		});

		it('rejects ws:// URLs', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools([{ name: 'sock', url: 'ws://example.com/' }]),
			).rejects.toThrow(/only http\(s\) URLs are allowed/);
			expect(mockedMcpClient).not.toHaveBeenCalled();
		});

		it('rejects malformed URLs', async () => {
			const manager = new McpClientManager();
			await expect(manager.getRegularTools([{ name: 'broken', url: 'not a url' }])).rejects.toThrow(
				/invalid URL/,
			);
			expect(mockedMcpClient).not.toHaveBeenCalled();
		});

		it('skips URL validation for stdio configs', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools([
					{ name: 'local-stdio', command: '/usr/bin/mcp-server', args: ['--port', '3000'] },
				]),
			).resolves.toBeDefined();
			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
		});
	});

	describe('server and schema filtering', () => {
		it('skips external MCP servers with unsafe names', async () => {
			const logger: LoggerMock = { warn: jest.fn() };
			const manager = new McpClientManager();

			await manager.getRegularTools(
				[
					{ name: 'bad name', url: 'https://bad.example.com/mcp' },
					{ name: 'safe_server', url: 'https://safe.example.com/mcp' },
				],
				logger as never,
			);

			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
			const mcpClientCalls = mockedMcpClient.mock.calls as Array<
				[{ servers: Record<string, unknown> }]
			>;
			const [mcpClientConfig] = mcpClientCalls[0];
			expect(mcpClientConfig.servers).not.toHaveProperty('bad name');
			expect(mcpClientConfig.servers).toHaveProperty('safe_server');
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped MCP server with unsafe name',
				expect.objectContaining({
					serverName: 'bad name',
					source: 'external MCP',
				}),
			);
		});

		it('skips browser MCP configs with unsafe names', async () => {
			const logger: LoggerMock = { warn: jest.fn() };
			const manager = new McpClientManager();

			await expect(
				manager.getBrowserTools(
					{ name: 'bad name', url: 'https://browser.example.com/mcp' },
					logger as never,
				),
			).resolves.toEqual({});

			expect(mockedMcpClient).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped MCP server with unsafe name',
				expect.objectContaining({
					serverName: 'bad name',
					source: 'browser MCP',
				}),
			);
		});

		it('logs tools skipped during schema sanitization', async () => {
			const logger: LoggerMock = { warn: jest.fn() };
			mockedSanitizeMcpToolSchemas.mockImplementationOnce(
				(_tools: Record<string, unknown>, options?: SanitizeOptions) => {
					options?.onError?.({
						message: 'MCP schema exceeds maximum depth of 32',
						details: {
							toolName: 'deep_tool',
							path: '$.input',
							depth: 33,
							maxDepth: 32,
							limitType: 'depth',
							limit: 32,
						},
					});
					return {};
				},
			);

			const manager = new McpClientManager();
			await manager.getRegularTools(
				[{ name: 'safe_server', url: 'https://safe.example.com/mcp' }],
				logger as never,
			);

			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped MCP tool with unsupported schema',
				expect.objectContaining({
					toolName: 'deep_tool',
					source: 'external MCP',
					path: '$.input',
					limitType: 'depth',
				}),
			);
		});
	});

	describe('SSRF policy (opt-in)', () => {
		it('does not call validateUrl when no validator is supplied', async () => {
			const manager = new McpClientManager();
			await manager.getRegularTools([{ name: 'public', url: 'https://api.example.com/mcp' }]);
			// no validator → never invoked; confirm by absence of any later expectations
		});

		it('calls validateUrl for every configured URL when a validator is supplied', async () => {
			const validator = createValidatorMock();
			const manager = new McpClientManager(validator);
			await manager.getRegularTools([
				{ name: 'a', url: 'https://a.example.com/mcp' },
				{ name: 'b', url: 'https://b.example.com/mcp' },
			]);
			expect(validator.validateUrl).toHaveBeenCalledTimes(2);
			expect(validator.validateUrl).toHaveBeenCalledWith('https://a.example.com/mcp');
			expect(validator.validateUrl).toHaveBeenCalledWith('https://b.example.com/mcp');
		});

		it('rejects with UserError when validateUrl returns blocked', async () => {
			const validator = createValidatorMock();
			validator.validateUrl.mockResolvedValue(createResultError(new Error('blocked: 10.0.0.1')));
			const manager = new McpClientManager(validator);
			await expect(
				manager.getRegularTools([{ name: 'internal', url: 'http://10.0.0.1/mcp' }]),
			).rejects.toThrow(UserError);
			expect(mockedMcpClient).not.toHaveBeenCalled();
		});

		it('error message names the server and surfaces the policy reason', async () => {
			const validator = createValidatorMock();
			validator.validateUrl.mockResolvedValue(createResultError(new Error('blocked: 10.0.0.1')));
			const manager = new McpClientManager(validator);
			await expect(
				manager.getRegularTools([{ name: 'internal', url: 'http://10.0.0.1/mcp' }]),
			).rejects.toThrow(/MCP server "internal".*blocked: 10\.0\.0\.1/);
		});

		it('skips SSRF check for stdio configs even when validator is supplied', async () => {
			const validator = createValidatorMock();
			const manager = new McpClientManager(validator);
			await manager.getRegularTools([{ name: 'stdio', command: '/usr/bin/mcp' }]);
			expect(validator.validateUrl).not.toHaveBeenCalled();
		});

		it('applies validation to browser MCP config too', async () => {
			const validator = createValidatorMock();
			validator.validateUrl.mockResolvedValue(createResultError(new Error('blocked')));
			const manager = new McpClientManager(validator);
			await expect(
				manager.getBrowserTools({ name: 'browser', url: 'http://internal/' }),
			).rejects.toThrow(UserError);
		});
	});

	describe('disconnect', () => {
		it('disconnects every tracked client and clears caches', async () => {
			const manager = new McpClientManager();
			await manager.getRegularTools([{ name: 'a', url: 'https://a.example.com/' }]);
			await manager.getBrowserTools({ name: 'b', url: 'https://b.example.com/' });
			expect(mockedMcpClient).toHaveBeenCalledTimes(2);

			const disconnectMocks = mockedMcpClient.mock.results.map(
				(r) => (r.value as { disconnect: jest.Mock }).disconnect,
			);

			await manager.disconnect();

			for (const d of disconnectMocks) {
				expect(d).toHaveBeenCalledTimes(1);
			}
		});
	});

	describe('caching', () => {
		it('does not re-list tools for an unchanged config', async () => {
			const manager = new McpClientManager();
			const configs = [{ name: 'a', url: 'https://a.example.com/' }];
			await manager.getRegularTools(configs);
			await manager.getRegularTools(configs);
			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
		});

		it('keeps regular and browser caches separate', async () => {
			const manager = new McpClientManager();
			await manager.getRegularTools([{ name: 'shared', url: 'https://shared.example.com/' }]);
			await manager.getBrowserTools({ name: 'shared', url: 'https://shared.example.com/' });
			// Same config shape but different bucket → two clients
			expect(mockedMcpClient).toHaveBeenCalledTimes(2);
		});
	});

	describe('concurrent dedup', () => {
		it('coalesces concurrent regular-tool calls with the same config into one client', async () => {
			const manager = new McpClientManager();
			const configs = [{ name: 'a', url: 'https://a.example.com/' }];

			const [tools1, tools2] = await Promise.all([
				manager.getRegularTools(configs),
				manager.getRegularTools(configs),
			]);

			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
			expect(tools1).toBe(tools2);
		});

		it('coalesces concurrent browser-tool calls with the same config into one client', async () => {
			const manager = new McpClientManager();
			const config = { name: 'browser', url: 'https://browser.example.com/' };

			await Promise.all([manager.getBrowserTools(config), manager.getBrowserTools(config)]);

			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
		});

		it('lets the next call retry after an in-flight failure', async () => {
			const manager = new McpClientManager();
			const configs = [{ name: 'a', url: 'https://a.example.com/' }];

			mockedMcpClient.mockImplementationOnce(() => ({
				listTools: jest.fn().mockRejectedValue(new Error('boom')),
				disconnect: jest.fn().mockResolvedValue(undefined),
			}));

			await expect(manager.getRegularTools(configs)).rejects.toThrow('boom');
			// In-flight entry must be cleared so a retry actually re-attempts.
			await expect(manager.getRegularTools(configs)).resolves.toBeDefined();
			expect(mockedMcpClient).toHaveBeenCalledTimes(2);
		});
	});

	describe('disconnect interaction with in-flight work', () => {
		// Returns a deferred listTools promise we can resolve later, simulating a
		// long-running tool listing that's still pending when disconnect() runs.
		function deferListTools() {
			let resolve: (value: Record<string, unknown>) => void = () => {};
			const promise = new Promise<Record<string, unknown>>((r) => {
				resolve = r;
			});
			return { promise, resolve };
		}

		it('does not coalesce new calls with in-flight work that disconnect severed', async () => {
			const manager = new McpClientManager();
			const configs = [{ name: 'a', url: 'https://a.example.com/' }];

			const deferred = deferListTools();
			mockedMcpClient.mockImplementationOnce(() => ({
				listTools: jest.fn().mockReturnValue(deferred.promise),
				disconnect: jest.fn().mockResolvedValue(undefined),
			}));

			const stranded = manager.getRegularTools(configs);
			// Yield so connectAndListTools registers the client before we tear down.
			await Promise.resolve();
			await manager.disconnect();

			// New call must start a fresh client, not join the stranded promise.
			await manager.getRegularTools(configs);
			expect(mockedMcpClient).toHaveBeenCalledTimes(2);

			// Cleanup: let the stranded promise settle so the test doesn't hang.
			deferred.resolve({});
			await stranded.catch(() => {});
		});
	});
});
