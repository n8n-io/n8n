/* eslint-disable import-x/order */
import type { Mock, Mocked } from 'vitest';

vi.mock('@n8n/agents', () => ({
	McpClient: vi.fn(function () {
		return {
			listTools: vi.fn().mockResolvedValue([]),
			close: vi.fn().mockResolvedValue(undefined),
		};
	}),
}));

vi.mock('../../agent/sanitize-mcp-schemas', () => ({
	sanitizeMcpToolSchemas: vi.fn((tools: unknown) => tools),
}));

import { McpClient } from '@n8n/agents';
import { createResultError, createResultOk, UserError } from 'n8n-workflow';

import { sanitizeMcpToolSchemas } from '../../agent/sanitize-mcp-schemas';
import type { SsrfUrlValidator } from '../mcp-client-manager';
import { McpClientManager } from '../mcp-client-manager';

const mockedMcpClient = McpClient as unknown as Mock;
const mockedSanitizeMcpToolSchemas = sanitizeMcpToolSchemas as unknown as Mock;

interface LoggerMock {
	warn: Mock;
}

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never;

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

function createValidatorMock(): Mocked<SsrfUrlValidator> {
	return {
		validateUrl: vi.fn().mockResolvedValue(createResultOk(undefined)),
	} as Mocked<SsrfUrlValidator>;
}

describe('McpClientManager', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('protocol whitelist (always-on)', () => {
		it('accepts https URLs', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools(
					[{ name: 'github', url: 'https://api.github.com/mcp' }],
					mockLogger,
				),
			).resolves.toBeDefined();
			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
		});

		it('accepts http URLs', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools([{ name: 'local', url: 'http://localhost:3000/sse' }], mockLogger),
			).resolves.toBeDefined();
		});

		it('rejects file:// URLs with a UserError naming the server', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools([{ name: 'sneaky', url: 'file:///etc/passwd' }], mockLogger),
			).rejects.toThrow(UserError);
			await expect(
				manager.getRegularTools([{ name: 'sneaky', url: 'file:///etc/passwd' }], mockLogger),
			).rejects.toThrow(/MCP server "sneaky".*file:/);
			expect(mockedMcpClient).not.toHaveBeenCalled();
		});

		it('rejects ws:// URLs', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools([{ name: 'sock', url: 'ws://example.com/' }], mockLogger),
			).rejects.toThrow(/only http\(s\) URLs are allowed/);
			expect(mockedMcpClient).not.toHaveBeenCalled();
		});

		it('rejects malformed URLs', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools([{ name: 'broken', url: 'not a url' }], mockLogger),
			).rejects.toThrow(/invalid URL/);
			expect(mockedMcpClient).not.toHaveBeenCalled();
		});

		it('skips URL validation for stdio configs', async () => {
			const manager = new McpClientManager();
			await expect(
				manager.getRegularTools(
					[{ name: 'local-stdio', command: '/usr/bin/mcp-server', args: ['--port', '3000'] }],
					mockLogger,
				),
			).resolves.toBeDefined();
			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
		});
	});

	describe('server and schema filtering', () => {
		it('skips external MCP servers with unsafe names', async () => {
			const logger: LoggerMock = { warn: vi.fn() };
			const manager = new McpClientManager();

			await manager.getRegularTools(
				[
					{ name: 'bad name', url: 'https://bad.example.com/mcp' },
					{ name: 'safe_server', url: 'https://safe.example.com/mcp' },
				],
				logger as never,
			);

			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
			const mcpClientCalls = mockedMcpClient.mock.calls as Array<[Array<{ name: string }>]>;
			const [mcpClientConfig] = mcpClientCalls[0];
			expect(mcpClientConfig).not.toEqual(
				expect.arrayContaining([expect.objectContaining({ name: 'bad name' })]),
			);
			expect(mcpClientConfig).toEqual(
				expect.arrayContaining([expect.objectContaining({ name: 'safe_server' })]),
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped MCP server with unsafe name',
				expect.objectContaining({
					serverName: 'bad name',
					source: 'external MCP',
				}),
			);
		});

		it('logs tools skipped during schema sanitization', async () => {
			const logger: LoggerMock = { warn: vi.fn() };
			mockedSanitizeMcpToolSchemas.mockImplementationOnce(
				(_tools: unknown, options?: SanitizeOptions) => {
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
					return new Map();
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
			await manager.getRegularTools(
				[{ name: 'public', url: 'https://api.example.com/mcp' }],
				mockLogger,
			);
			// no validator → never invoked; confirm by absence of any later expectations
		});

		it('calls validateUrl for every configured URL when a validator is supplied', async () => {
			const validator = createValidatorMock();
			const manager = new McpClientManager(validator);
			await manager.getRegularTools(
				[
					{ name: 'a', url: 'https://a.example.com/mcp' },
					{ name: 'b', url: 'https://b.example.com/mcp' },
				],
				mockLogger,
			);
			expect(validator.validateUrl).toHaveBeenCalledTimes(2);
			expect(validator.validateUrl).toHaveBeenCalledWith('https://a.example.com/mcp');
			expect(validator.validateUrl).toHaveBeenCalledWith('https://b.example.com/mcp');
		});

		it('rejects with UserError when validateUrl returns blocked', async () => {
			const validator = createValidatorMock();
			validator.validateUrl.mockResolvedValue(createResultError(new Error('blocked: 10.0.0.1')));
			const manager = new McpClientManager(validator);
			await expect(
				manager.getRegularTools([{ name: 'internal', url: 'http://10.0.0.1/mcp' }], mockLogger),
			).rejects.toThrow(UserError);
			expect(mockedMcpClient).not.toHaveBeenCalled();
		});

		it('error message names the server and surfaces the policy reason', async () => {
			const validator = createValidatorMock();
			validator.validateUrl.mockResolvedValue(createResultError(new Error('blocked: 10.0.0.1')));
			const manager = new McpClientManager(validator);
			await expect(
				manager.getRegularTools([{ name: 'internal', url: 'http://10.0.0.1/mcp' }], mockLogger),
			).rejects.toThrow(/MCP server "internal".*blocked: 10\.0\.0\.1/);
		});

		it('skips SSRF check for stdio configs even when validator is supplied', async () => {
			const validator = createValidatorMock();
			const manager = new McpClientManager(validator);
			await manager.getRegularTools([{ name: 'stdio', command: '/usr/bin/mcp' }], mockLogger);
			expect(validator.validateUrl).not.toHaveBeenCalled();
		});
	});

	describe('disconnect', () => {
		it('disconnects every tracked client and clears caches', async () => {
			const manager = new McpClientManager();
			await manager.getRegularTools([{ name: 'a', url: 'https://a.example.com/' }], mockLogger);
			expect(mockedMcpClient).toHaveBeenCalledTimes(1);

			const disconnectMocks = mockedMcpClient.mock.results.map(
				(r) => (r.value as { close: Mock }).close,
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
			await manager.getRegularTools(configs, mockLogger);
			await manager.getRegularTools(configs, mockLogger);
			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
		});

		it('does not share cached clients across different scoped fetch cache keys', async () => {
			const manager = new McpClientManager();
			await manager.getRegularTools(
				[
					{
						name: 'shared',
						url: 'https://shared.example.com/',
						cacheKey: 'registry-connection:1',
					},
				],
				mockLogger,
			);
			await manager.getRegularTools(
				[
					{
						name: 'shared',
						url: 'https://shared.example.com/',
						cacheKey: 'registry-connection:2',
					},
				],
				mockLogger,
			);

			expect(mockedMcpClient).toHaveBeenCalledTimes(2);
		});

		it('reuses cached clients when scoped fetch cache key matches', async () => {
			const manager = new McpClientManager();
			await manager.getRegularTools(
				[
					{
						name: 'shared',
						url: 'https://shared.example.com/',
						cacheKey: 'registry-connection:1',
					},
				],
				mockLogger,
			);
			await manager.getRegularTools(
				[
					{
						name: 'shared',
						url: 'https://shared.example.com/',
						cacheKey: 'registry-connection:1',
					},
				],
				mockLogger,
			);

			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
		});
	});

	describe('concurrent dedup', () => {
		it('coalesces concurrent regular-tool calls with the same config into one client', async () => {
			const manager = new McpClientManager();
			const configs = [{ name: 'a', url: 'https://a.example.com/' }];

			const [tools1, tools2] = await Promise.all([
				manager.getRegularTools(configs, mockLogger),
				manager.getRegularTools(configs, mockLogger),
			]);

			expect(mockedMcpClient).toHaveBeenCalledTimes(1);
			expect(tools1).toBe(tools2);
		});

		it('lets the next call retry after an in-flight failure', async () => {
			const manager = new McpClientManager();
			const configs = [{ name: 'a', url: 'https://a.example.com/' }];

			mockedMcpClient.mockImplementationOnce(function () {
				return {
					listTools: vi.fn().mockRejectedValue(new Error('boom')),
					close: vi.fn().mockResolvedValue(undefined),
				};
			});

			await expect(manager.getRegularTools(configs, mockLogger)).rejects.toThrow('boom');
			// In-flight entry must be cleared so a retry actually re-attempts.
			await expect(manager.getRegularTools(configs, mockLogger)).resolves.toBeDefined();
			expect(mockedMcpClient).toHaveBeenCalledTimes(2);
		});
	});

	describe('disconnect interaction with in-flight work', () => {
		// Returns a deferred listTools promise we can resolve later, simulating a
		// long-running tool listing that's still pending when disconnect() runs.
		function deferListTools() {
			let resolve: (value: []) => void = () => {};
			const promise = new Promise<[]>((r) => {
				resolve = r;
			});
			return { promise, resolve };
		}

		it('does not coalesce new calls with in-flight work that disconnect severed', async () => {
			const manager = new McpClientManager();
			const configs = [{ name: 'a', url: 'https://a.example.com/' }];

			const deferred = deferListTools();
			mockedMcpClient.mockImplementationOnce(function () {
				return {
					listTools: vi.fn().mockReturnValue(deferred.promise),
					close: vi.fn().mockResolvedValue(undefined),
				};
			});

			const stranded = manager.getRegularTools(configs, mockLogger);
			// Yield so connectAndListTools registers the client before we tear down.
			await Promise.resolve();
			await manager.disconnect();

			// New call must start a fresh client, not join the stranded promise.
			await manager.getRegularTools(configs, mockLogger);
			expect(mockedMcpClient).toHaveBeenCalledTimes(2);

			// Cleanup: let the stranded promise settle so the test doesn't hang.
			deferred.resolve([]);
			await stranded.catch(() => {});
		});
	});

	describe('tool approval', () => {
		const configs = [{ name: 'a', url: 'https://a.example.com/' }];

		it('marks every server config as requiring approval by default', async () => {
			const manager = new McpClientManager();
			await manager.getRegularTools(configs, mockLogger);
			expect(mockedMcpClient).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ requireApproval: true })]),
			);
		});

		it('propagates requireApproval=false onto every server config', async () => {
			const manager = new McpClientManager();
			await manager.getRegularTools(configs, mockLogger, false);
			expect(mockedMcpClient).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ requireApproval: false })]),
			);
		});

		it('caches separately per approval mode', async () => {
			const manager = new McpClientManager();
			await manager.getRegularTools(configs, mockLogger, true);
			await manager.getRegularTools(configs, mockLogger, false);
			expect(mockedMcpClient).toHaveBeenCalledTimes(2);
		});
	});
});
