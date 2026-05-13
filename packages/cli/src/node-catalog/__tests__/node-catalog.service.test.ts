import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { NodeCatalogService } from '../node-catalog.service';

const mockSearchNodeTypes = jest.fn();
const mockGetNodeType = jest.fn();
const MockNodeTypeParser = jest.fn().mockImplementation(() => ({
	searchNodeTypes: mockSearchNodeTypes,
	getNodeType: mockGetNodeType,
}));
const mockSetSchemaBaseDirs = jest.fn();
const mockSearchInvoke = jest.fn().mockResolvedValue('search-result');
const mockGetInvoke = jest.fn().mockResolvedValue('get-result');
const mockSuggestInvoke = jest.fn().mockResolvedValue('suggest-result');
const mockCreateSearchTool = jest.fn((..._args: unknown[]) => ({ invoke: mockSearchInvoke }));

jest.mock('@n8n/ai-workflow-builder', () => ({
	NodeTypeParser: MockNodeTypeParser,
	createCodeBuilderSearchTool: (...args: unknown[]) => mockCreateSearchTool(...args),
	createCodeBuilderGetTool: jest.fn(() => ({ invoke: mockGetInvoke })),
	createGetSuggestedNodesTool: jest.fn(() => ({ invoke: mockSuggestInvoke })),
}));

jest.mock('@n8n/workflow-sdk', () => ({
	setSchemaBaseDirs: (...args: unknown[]) => mockSetSchemaBaseDirs(...(args as [string[]])),
}));

jest.mock('fs', () => ({
	existsSync: jest.fn().mockReturnValue(true),
}));

const mockLogger = (): Logger =>
	mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) });

describe('NodeCatalogService', () => {
	let service: NodeCatalogService;
	let loadNodesAndCredentials: jest.Mocked<LoadNodesAndCredentials>;
	let postProcessorCallback: (() => Promise<void>) | undefined;

	beforeEach(() => {
		jest.clearAllMocks();
		postProcessorCallback = undefined;

		loadNodesAndCredentials = mock<LoadNodesAndCredentials>({
			addPostProcessor: jest.fn().mockImplementation((cb: () => Promise<void>) => {
				postProcessorCallback = cb;
			}),
			postProcessLoaders: jest.fn(),
			collectTypes: jest.fn().mockResolvedValue({
				nodes: [{ name: 'n8n-nodes-base.webhook' }, { name: 'n8n-nodes-base.set' }],
			}),
		});
		Container.set(LoadNodesAndCredentials, loadNodesAndCredentials);

		MockNodeTypeParser.mockClear();

		service = new NodeCatalogService(loadNodesAndCredentials, mockLogger());
	});

	describe('getNodeTypeParser', () => {
		test('throws when called before initialize', () => {
			expect(() => service.getNodeTypeParser()).toThrow('NodeCatalogService not initialized');
		});

		test('returns parser after initialization', async () => {
			await service.initialize();

			const parser = service.getNodeTypeParser();
			expect(parser).toBeDefined();
			expect(MockNodeTypeParser).toHaveBeenCalledWith([
				{ name: 'n8n-nodes-base.webhook' },
				{ name: 'n8n-nodes-base.set' },
			]);
		});
	});

	describe('initialize', () => {
		test('loads node descriptions and creates parser', async () => {
			await service.initialize();

			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalled();
			expect(loadNodesAndCredentials.collectTypes).toHaveBeenCalled();
			expect(MockNodeTypeParser).toHaveBeenCalledTimes(1);
			expect(mockSetSchemaBaseDirs).toHaveBeenCalled();
		});

		test('calling initialize twice only runs doInitialize once', async () => {
			await service.initialize();
			await service.initialize();

			expect(loadNodesAndCredentials.collectTypes).toHaveBeenCalledTimes(1);
			expect(MockNodeTypeParser).toHaveBeenCalledTimes(1);
		});
	});

	describe('getNodeDefinitionDirs', () => {
		test('returns empty array before initialization', () => {
			expect(service.getNodeDefinitionDirs()).toEqual([]);
		});

		test('returns resolved dirs after initialization', async () => {
			await service.initialize();

			const dirs = service.getNodeDefinitionDirs();
			expect(dirs.length).toBeGreaterThan(0);
			for (const dir of dirs) {
				expect(dir).toContain('node-definitions');
			}
		});
	});

	describe('refreshNodeTypes', () => {
		test('rebuilds parser when called after init', async () => {
			await service.initialize();
			expect(MockNodeTypeParser).toHaveBeenCalledTimes(1);

			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{ name: 'n8n-nodes-base.webhook' },
					{ name: 'n8n-nodes-base.set' },
					{ name: 'n8n-nodes-base.httpRequest' },
				],
			} as never);

			expect(postProcessorCallback).toBeDefined();
			await postProcessorCallback!();

			expect(MockNodeTypeParser).toHaveBeenCalledTimes(2);
			expect(MockNodeTypeParser).toHaveBeenLastCalledWith([
				{ name: 'n8n-nodes-base.webhook' },
				{ name: 'n8n-nodes-base.set' },
				{ name: 'n8n-nodes-base.httpRequest' },
			]);
		});

		test('no-ops when nodeTypeParser is undefined (not initialized)', async () => {
			expect(postProcessorCallback).toBeDefined();
			await postProcessorCallback!();

			expect(MockNodeTypeParser).not.toHaveBeenCalled();
		});
	});

	describe('constructor', () => {
		test('registers a post-processor on LoadNodesAndCredentials', () => {
			expect(loadNodesAndCredentials.addPostProcessor).toHaveBeenCalledWith(expect.any(Function));
		});
	});

	describe('searchNodes', () => {
		test('returns cached result on repeated calls with same queries', async () => {
			await service.initialize();

			const result1 = await service.searchNodes(['gmail', 'slack']);
			const result2 = await service.searchNodes(['gmail', 'slack']);

			expect(result1).toBe('search-result');
			expect(result2).toBe('search-result');
			expect(mockSearchInvoke).toHaveBeenCalledTimes(1);
		});

		test('returns cached result regardless of query order', async () => {
			await service.initialize();

			await service.searchNodes(['gmail', 'slack']);
			await service.searchNodes(['slack', 'gmail']);

			expect(mockSearchInvoke).toHaveBeenCalledTimes(1);
		});

		test('calls tool for different queries', async () => {
			await service.initialize();

			await service.searchNodes(['gmail']);
			await service.searchNodes(['slack']);

			expect(mockSearchInvoke).toHaveBeenCalledTimes(2);
		});

		test('creates a separate tool instance per nodeFilter reference', async () => {
			await service.initialize();

			const filterA = () => true;
			const filterB = () => false;

			await service.searchNodes(['gmail'], { nodeFilter: filterA });
			await service.searchNodes(['gmail'], { nodeFilter: filterB });

			expect(mockCreateSearchTool).toHaveBeenCalledTimes(2);
			expect(mockCreateSearchTool).toHaveBeenNthCalledWith(
				1,
				expect.anything(),
				expect.objectContaining({ nodeFilter: filterA }),
			);
			expect(mockCreateSearchTool).toHaveBeenNthCalledWith(
				2,
				expect.anything(),
				expect.objectContaining({ nodeFilter: filterB }),
			);
		});

		test('caches filtered results independently of unfiltered results', async () => {
			await service.initialize();

			const filter = () => true;
			await service.searchNodes(['gmail']);
			await service.searchNodes(['gmail'], { nodeFilter: filter });
			await service.searchNodes(['gmail']);
			await service.searchNodes(['gmail'], { nodeFilter: filter });

			// Two distinct tool instances, each invoked once.
			expect(mockSearchInvoke).toHaveBeenCalledTimes(2);
		});
	});

	describe('getNodeTypes', () => {
		test('returns cached result on repeated calls with same nodeIds', async () => {
			await service.initialize();

			const result1 = await service.getNodeTypes(['n8n-nodes-base.set']);
			const result2 = await service.getNodeTypes(['n8n-nodes-base.set']);

			expect(result1).toBe('get-result');
			expect(result2).toBe('get-result');
			expect(mockGetInvoke).toHaveBeenCalledTimes(1);
		});

		test('handles object nodeIds in cache key', async () => {
			await service.initialize();
			const nodeId = { nodeId: 'n8n-nodes-base.gmail', resource: 'message', operation: 'send' };

			await service.getNodeTypes([nodeId]);
			await service.getNodeTypes([nodeId]);

			expect(mockGetInvoke).toHaveBeenCalledTimes(1);
		});

		test('is order-independent across nodeIds', async () => {
			await service.initialize();

			await service.getNodeTypes(['n8n-nodes-base.gmail', 'n8n-nodes-base.slack']);
			await service.getNodeTypes(['n8n-nodes-base.slack', 'n8n-nodes-base.gmail']);

			expect(mockGetInvoke).toHaveBeenCalledTimes(1);
		});
	});

	describe('getSuggestedNodes', () => {
		test('returns cached result on repeated calls with same categories', async () => {
			await service.initialize();

			const result1 = await service.getSuggestedNodes(['chatbot', 'notification']);
			const result2 = await service.getSuggestedNodes(['chatbot', 'notification']);

			expect(result1).toBe('suggest-result');
			expect(result2).toBe('suggest-result');
			expect(mockSuggestInvoke).toHaveBeenCalledTimes(1);
		});
	});

	describe('searchNodesStructured', () => {
		test('returns array of {nodeId, displayName, description} — no string blob', async () => {
			mockSearchNodeTypes.mockReturnValue([
				{
					id: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					description: 'Send messages and interact with Slack',
					version: 1,
					isTrigger: false,
				},
			]);
			await service.initialize();

			const results = await service.searchNodesStructured(['slack']);

			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0]).toMatchObject({
				nodeId: expect.any(String),
				displayName: expect.any(String),
				description: expect.any(String),
			});
			// verify dropped fields
			expect(results[0]).not.toHaveProperty('categories');
			expect(results[0]).not.toHaveProperty('score');
		});

		test('returns empty array when queries is empty', async () => {
			await service.initialize();

			const results = await service.searchNodesStructured([]);

			expect(results).toEqual([]);
			expect(mockSearchNodeTypes).not.toHaveBeenCalled();
		});

		test('deduplicates results across multiple queries by nodeId', async () => {
			mockSearchNodeTypes
				.mockReturnValueOnce([
					{
						id: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Slack node',
						version: 1,
						isTrigger: false,
					},
				])
				.mockReturnValueOnce([
					{
						id: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Slack node',
						version: 1,
						isTrigger: false,
					},
					{
						id: 'n8n-nodes-base.gmail',
						displayName: 'Gmail',
						description: 'Gmail node',
						version: 1,
						isTrigger: false,
					},
				]);
			await service.initialize();

			const results = await service.searchNodesStructured(['slack', 'gmail']);

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.nodeId)).toEqual([
				'n8n-nodes-base.slack',
				'n8n-nodes-base.gmail',
			]);
		});

		test('filters by hasCredential when opt is true', async () => {
			mockSearchNodeTypes.mockReturnValue([
				{
					id: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					description: 'Slack node',
					version: 1,
					isTrigger: false,
				},
				{
					id: 'n8n-nodes-base.set',
					displayName: 'Set',
					description: 'Set node',
					version: 1,
					isTrigger: false,
				},
			]);
			mockGetNodeType.mockImplementation((nodeId: string) => {
				if (nodeId === 'n8n-nodes-base.slack') {
					return { credentials: [{ name: 'slackApi' }] };
				}
				return { credentials: [] };
			});
			await service.initialize();

			const results = await service.searchNodesStructured(['anything'], { hasCredential: true });

			expect(results).toHaveLength(1);
			expect(results[0].nodeId).toBe('n8n-nodes-base.slack');
		});

		test('does not filter when hasCredential is false or unset', async () => {
			mockSearchNodeTypes.mockReturnValue([
				{
					id: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					description: 'Slack node',
					version: 1,
					isTrigger: false,
				},
				{
					id: 'n8n-nodes-base.set',
					displayName: 'Set',
					description: 'Set node',
					version: 1,
					isTrigger: false,
				},
			]);
			await service.initialize();

			const results = await service.searchNodesStructured(['anything']);

			expect(results).toHaveLength(2);
		});

		test('lazily initializes when called before explicit initialize', async () => {
			// fresh service — no `await service.initialize()` here
			mockSearchNodeTypes.mockReturnValue([
				{ id: 'n8n-nodes-base.slack', displayName: 'Slack', description: 'Slack' },
			]);
			const results = await service.searchNodesStructured(['slack']);
			expect(results).toEqual([expect.objectContaining({ nodeId: 'n8n-nodes-base.slack' })]);
		});
	});

	describe('getNodeSchema', () => {
		test('returns null for unknown nodeId', async () => {
			mockGetNodeType.mockReturnValue(null);
			await service.initialize();

			const result = await service.getNodeSchema('n8n-nodes-base.unknown');

			expect(result).toBeNull();
		});

		test('returns shape with nodeId/displayName/description/credentials/operations for nodes without resource/operation', async () => {
			mockGetNodeType.mockReturnValue({
				name: 'n8n-nodes-base.set',
				displayName: 'Set',
				description: 'Set workflow data',
				version: 1,
				properties: [{ name: 'values', type: 'fixedCollection', default: {} }],
				credentials: [],
			});
			await service.initialize();

			const result = await service.getNodeSchema('n8n-nodes-base.set');

			expect(result).toEqual({
				nodeId: 'n8n-nodes-base.set',
				displayName: 'Set',
				description: 'Set workflow data',
				credentials: [],
				operations: [
					expect.objectContaining({
						id: 'n8n-nodes-base.set',
						displayName: 'Set',
						inputSchema: expect.objectContaining({
							type: 'object',
							properties: expect.any(Object),
						}),
					}),
				],
			});
		});

		test('emits one entry per operation for nodes with an operation discriminator but no resource', async () => {
			mockGetNodeType.mockReturnValue({
				name: 'n8n-nodes-base.set',
				displayName: 'Set',
				description: 'Set workflow data',
				version: 1,
				properties: [
					{
						name: 'operation',
						type: 'options',
						default: 'json',
						options: [
							{ name: 'JSON', value: 'json' },
							{ name: 'Manual', value: 'manual' },
						],
					},
					{ name: 'values', type: 'fixedCollection', default: {} },
				],
				credentials: [],
			});
			await service.initialize();

			const result = await service.getNodeSchema('n8n-nodes-base.set');

			expect(result?.operations).toEqual([
				expect.objectContaining({
					id: 'n8n-nodes-base.set.json',
					operation: 'json',
				}),
				expect.objectContaining({
					id: 'n8n-nodes-base.set.manual',
					operation: 'manual',
				}),
			]);
			result?.operations.forEach((op) => {
				expect(op.id).not.toContain('default');
			});
		});

		test('extracts credentials list from the node type', async () => {
			mockGetNodeType.mockReturnValue({
				name: 'n8n-nodes-base.slack',
				displayName: 'Slack',
				description: 'Slack node',
				version: 1,
				properties: [],
				credentials: [{ name: 'slackApi', required: true }, { name: 'slackOAuth2Api' }],
			});
			await service.initialize();

			const result = await service.getNodeSchema('n8n-nodes-base.slack');

			expect(result?.credentials).toEqual([{ name: 'slackApi' }, { name: 'slackOAuth2Api' }]);
		});

		test('extracts resource/operation tuples when present', async () => {
			mockGetNodeType.mockReturnValue({
				name: 'n8n-nodes-base.slack',
				displayName: 'Slack',
				description: 'Slack node',
				version: 1,
				credentials: [{ name: 'slackApi' }],
				properties: [
					{
						name: 'resource',
						type: 'options',
						default: 'message',
						options: [
							{ name: 'Message', value: 'message' },
							{ name: 'Channel', value: 'channel' },
						],
					},
					{
						name: 'operation',
						type: 'options',
						default: 'send',
						displayOptions: { show: { resource: ['message'] } },
						options: [
							{
								name: 'Send',
								value: 'send',
								action: 'Send a message',
								description: 'Send a message',
							},
							{ name: 'Update', value: 'update' },
						],
					},
					{
						name: 'operation',
						type: 'options',
						default: 'get',
						displayOptions: { show: { resource: ['channel'] } },
						options: [{ name: 'Get', value: 'get' }],
					},
				],
			});
			await service.initialize();

			const result = await service.getNodeSchema('n8n-nodes-base.slack');

			expect(result?.operations).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 'n8n-nodes-base.slack.message.send',
						resource: 'message',
						operation: 'send',
						displayName: 'Send a message',
						description: 'Send a message',
						inputSchema: expect.objectContaining({ type: 'object' }),
					}),
					expect.objectContaining({
						id: 'n8n-nodes-base.slack.message.update',
						resource: 'message',
						operation: 'update',
					}),
					expect.objectContaining({
						id: 'n8n-nodes-base.slack.channel.get',
						resource: 'channel',
						operation: 'get',
					}),
				]),
			);
			expect(result?.operations).toHaveLength(3);
		});

		test('lazily initializes when called before explicit initialize', async () => {
			// fresh service — no `await service.initialize()` here
			mockGetNodeType.mockReturnValue({
				name: 'n8n-nodes-base.set',
				displayName: 'Set',
				description: 'Set workflow data',
				version: 1,
				properties: [],
				credentials: [],
			});
			const result = await service.getNodeSchema('n8n-nodes-base.set');
			expect(result?.nodeId).toBe('n8n-nodes-base.set');
		});
	});

	describe('cache invalidation', () => {
		test('clears all caches when node types are refreshed', async () => {
			await service.initialize();

			await service.searchNodes(['gmail']);
			await service.searchNodes(['gmail'], { nodeFilter: () => true });
			await service.getNodeTypes(['n8n-nodes-base.set']);
			await service.getSuggestedNodes(['chatbot']);

			expect(mockSearchInvoke).toHaveBeenCalledTimes(2);
			expect(mockGetInvoke).toHaveBeenCalledTimes(1);
			expect(mockSuggestInvoke).toHaveBeenCalledTimes(1);

			expect(postProcessorCallback).toBeDefined();
			await postProcessorCallback!();

			await service.searchNodes(['gmail']);
			await service.searchNodes(['gmail'], { nodeFilter: () => true });
			await service.getNodeTypes(['n8n-nodes-base.set']);
			await service.getSuggestedNodes(['chatbot']);

			expect(mockSearchInvoke).toHaveBeenCalledTimes(4);
			expect(mockGetInvoke).toHaveBeenCalledTimes(2);
			expect(mockSuggestInvoke).toHaveBeenCalledTimes(2);
		});
	});
});
