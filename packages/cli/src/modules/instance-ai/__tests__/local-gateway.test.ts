import { LocalGateway } from '../filesystem/local-gateway';
import type { LocalGatewayEvent } from '../filesystem/local-gateway';
import type { McpTool } from '@n8n/api-types';

const SAMPLE_TOOL: McpTool = {
	name: 'read_file',
	description: 'Read a file',
	inputSchema: { type: 'object', properties: { filePath: { type: 'string' } } },
};

const EMPTY_CAPABILITIES = { rootPath: 'project', tools: [], toolCategories: [] };

describe('LocalGateway', () => {
	let gateway: LocalGateway;

	beforeEach(() => {
		gateway = new LocalGateway();
	});

	afterEach(() => {
		gateway.disconnect();
	});

	describe('init', () => {
		it('should mark gateway as connected and store tools', () => {
			expect(gateway.isConnected).toBe(false);

			gateway.init({ rootPath: 'my-project', tools: [SAMPLE_TOOL], toolCategories: [] });

			expect(gateway.isConnected).toBe(true);
			expect(gateway.rootPath).toBe('my-project');
			expect(gateway.connectedAt).toBeTruthy();
			expect(gateway.getAvailableTools()).toEqual([SAMPLE_TOOL]);
		});
	});

	describe('disconnect', () => {
		it('should mark gateway as disconnected and clear tools', () => {
			gateway.init({ rootPath: 'my-project', tools: [SAMPLE_TOOL], toolCategories: [] });

			gateway.disconnect();

			expect(gateway.isConnected).toBe(false);
			expect(gateway.rootPath).toBeNull();
			expect(gateway.connectedAt).toBeNull();
			expect(gateway.getAvailableTools()).toEqual([]);
		});

		it('should reject pending requests on disconnect', async () => {
			gateway.init(EMPTY_CAPABILITIES);

			const callPromise = gateway.callTool({
				name: 'read_file',
				arguments: { filePath: 'test.ts' },
			});
			gateway.disconnect();

			await expect(callPromise).rejects.toThrow('disconnected');
		});
	});

	describe('callTool (gateway round-trip)', () => {
		it('should emit filesystem-request event and resolve on response', async () => {
			gateway.init(EMPTY_CAPABILITIES);

			const events: LocalGatewayEvent[] = [];
			gateway.onRequest((event) => events.push(event));

			const callPromise = gateway.callTool({
				name: 'read_file',
				arguments: { filePath: 'src/index.ts' },
			});

			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('filesystem-request');
			expect(events[0].payload.toolCall.name).toBe('read_file');
			expect(events[0].payload.toolCall.arguments.filePath).toBe('src/index.ts');

			const fileContent = {
				path: 'src/index.ts',
				content: 'console.log("hello")',
				truncated: false,
				totalLines: 1,
			};
			const resolved = gateway.resolveRequest(events[0].payload.requestId, {
				content: [{ type: 'text', text: JSON.stringify(fileContent) }],
			});
			expect(resolved).toBe(true);

			const result = await callPromise;
			expect((result.content[0] as { type: 'text'; text: string }).text).toContain('console.log');
		});

		it('should reject on error string response', async () => {
			gateway.init(EMPTY_CAPABILITIES);

			const events: LocalGatewayEvent[] = [];
			gateway.onRequest((event) => events.push(event));

			const callPromise = gateway.callTool({
				name: 'read_file',
				arguments: { filePath: 'missing.ts' },
			});

			gateway.resolveRequest(events[0].payload.requestId, undefined, 'File not found');

			await expect(callPromise).rejects.toThrow('File not found');
		});

		it('should reject on isError result', async () => {
			gateway.init(EMPTY_CAPABILITIES);

			const events: LocalGatewayEvent[] = [];
			gateway.onRequest((event) => events.push(event));

			const callPromise = gateway.callTool({
				name: 'read_file',
				arguments: { filePath: 'missing.ts' },
			});

			gateway.resolveRequest(events[0].payload.requestId, {
				content: [{ type: 'text', text: 'File too large' }],
				isError: true,
			});

			// isError results are passed through so the tool layer can inspect them
			const result = await callPromise;
			expect(result.isError).toBe(true);
			expect((result.content[0] as { type: 'text'; text: string }).text).toBe('File too large');
		});

		it('should throw when gateway is not connected', async () => {
			await expect(
				gateway.callTool({ name: 'read_file', arguments: { filePath: 'test.ts' } }),
			).rejects.toThrow('not connected');
		});

		it('should timeout after 60 seconds', async () => {
			jest.useFakeTimers();

			gateway.init(EMPTY_CAPABILITIES);

			const callPromise = gateway.callTool({
				name: 'read_file',
				arguments: { filePath: 'slow.ts' },
			});

			jest.advanceTimersByTime(60_001);

			await expect(callPromise).rejects.toThrow('timed out');

			jest.useRealTimers();
		});

		it('should dispatch different tool names correctly', async () => {
			gateway.init(EMPTY_CAPABILITIES);

			const events: LocalGatewayEvent[] = [];
			gateway.onRequest((event) => events.push(event));

			const treeText = 'project/\n  src/\n    index.ts';
			const callPromise = gateway.callTool({ name: 'get_file_tree', arguments: { dirPath: '.' } });

			expect(events[0].payload.toolCall.name).toBe('get_file_tree');
			expect(events[0].payload.toolCall.arguments.dirPath).toBe('.');

			gateway.resolveRequest(events[0].payload.requestId, {
				content: [{ type: 'text', text: treeText }],
			});

			const result = await callPromise;
			expect((result.content[0] as { type: 'text'; text: string }).text).toBe(treeText);
		});
	});

	describe('resolveRequest', () => {
		it('should return false for unknown requestId', () => {
			expect(gateway.resolveRequest('unknown_id', { content: [] })).toBe(false);
		});
	});

	describe('resolveRequest with isError results', () => {
		const CONFIRMATION_PAYLOAD = {
			toolGroup: 'filesystemWrite',
			resource: 'write_file',
			description: 'Write to file: test.ts',
			options: { allowOnce: 'token-allow-once', denyOnce: 'token-deny-once' },
		};
		const rawErrorText = `GATEWAY_CONFIRMATION_REQUIRED::${JSON.stringify(CONFIRMATION_PAYLOAD)}`;

		it('should resolve with isError result so the tool layer can inspect it', async () => {
			gateway.init(EMPTY_CAPABILITIES);

			const requestEvents: LocalGatewayEvent[] = [];
			gateway.onRequest((e) => requestEvents.push(e));

			const callPromise = gateway.callTool({
				name: 'write_file',
				arguments: { filePath: 'test.ts' },
			});

			const errorResult = {
				content: [{ type: 'text' as const, text: rawErrorText }],
				isError: true as const,
			};
			gateway.resolveRequest(requestEvents[0].payload.requestId, errorResult);

			const result = await callPromise;
			expect(result.isError).toBe(true);
			expect((result.content[0] as { type: 'text'; text: string }).text).toBe(rawErrorText);
		});
	});

	describe('getStatus', () => {
		it('should return disconnected status by default', () => {
			const status = gateway.getStatus();
			expect(status.connected).toBe(false);
			expect(status.connectedAt).toBeNull();
			expect(status.directory).toBeNull();
		});

		it('should return connected status after init', () => {
			gateway.init({ rootPath: 'my-project', tools: [], toolCategories: [] });

			const status = gateway.getStatus();
			expect(status.connected).toBe(true);
			expect(status.connectedAt).toBeTruthy();
			expect(status.directory).toBe('my-project');
		});
	});

	describe('onRequest', () => {
		it('should return unsubscribe function that stops event delivery', async () => {
			gateway.init(EMPTY_CAPABILITIES);

			const events: LocalGatewayEvent[] = [];
			const unsubscribe = gateway.onRequest((event) => events.push(event));

			const p1 = gateway
				.callTool({ name: 'read_file', arguments: { filePath: 'test1.ts' } })
				.catch(() => {});
			expect(events).toHaveLength(1);

			unsubscribe();

			const p2 = gateway
				.callTool({ name: 'read_file', arguments: { filePath: 'test2.ts' } })
				.catch(() => {});
			// No new event after unsubscribe
			expect(events).toHaveLength(1);

			gateway.disconnect();
			await p1;
			await p2;
		});
	});
});
