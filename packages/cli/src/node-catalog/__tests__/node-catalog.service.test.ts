import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { NodeCatalogService } from '../node-catalog.service';

const MockNodeTypeParser = vi.fn();
const mockSetSchemaBaseDirs = vi.fn();
const mockSearchCodeBuilderNodes = vi.fn();
const mockGetNodeTypes = vi.fn().mockReturnValue('get-result');
const mockGetSuggestedNodes = vi.fn().mockReturnValue('suggest-result');
const mockGenerateNodeTypeFile = vi.fn().mockReturnValue('synth-result');

vi.mock('@n8n/ai-utilities/node-catalog', () => ({
	NodeTypeParser: MockNodeTypeParser,
	searchCodeBuilderNodes: (...args: unknown[]) => mockSearchCodeBuilderNodes(...args),
	getNodeTypes: (...args: unknown[]) => mockGetNodeTypes(...args),
	getSuggestedNodes: (...args: unknown[]) => mockGetSuggestedNodes(...args),
}));

vi.mock('@n8n/workflow-sdk', () => ({
	setSchemaBaseDirs: (...args: unknown[]) => mockSetSchemaBaseDirs(...(args as [string[]])),
	generateNodeTypeFile: (...args: unknown[]) => mockGenerateNodeTypeFile(...args),
}));

vi.mock('fs', () => ({
	existsSync: vi.fn().mockReturnValue(true),
}));

const mockLogger = (): Logger => mock<Logger>({ scoped: vi.fn().mockReturnValue(mock<Logger>()) });

describe('NodeCatalogService', () => {
	let service: NodeCatalogService;
	let loadNodesAndCredentials: Mocked<LoadNodesAndCredentials>;
	let postProcessorCallback: (() => Promise<void>) | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchCodeBuilderNodes.mockReturnValue({
			results: 'search-result',
			queriesWithNoResults: [],
		});
		postProcessorCallback = undefined;

		loadNodesAndCredentials = mock<LoadNodesAndCredentials>({
			addPostProcessor: vi.fn().mockImplementation((cb: () => Promise<void>) => {
				postProcessorCallback = cb;
			}),
			postProcessLoaders: vi.fn(),
			collectTypes: vi.fn().mockResolvedValue({
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

			expect(result1.results).toBe('search-result');
			expect(result2.results).toBe('search-result');
			expect(mockSearchCodeBuilderNodes).toHaveBeenCalledTimes(1);
		});

		test('returns queriesWithNoResults metadata', async () => {
			mockSearchCodeBuilderNodes.mockReturnValueOnce({
				results: 'search-result',
				queriesWithNoResults: ['missing-node'],
			});
			await service.initialize();

			const result = await service.searchNodes(['missing-node']);

			expect(result).toEqual({
				results: 'search-result',
				queriesWithNoResults: ['missing-node'],
			});
		});

		test('returns cached result regardless of query order', async () => {
			await service.initialize();

			await service.searchNodes(['gmail', 'slack']);
			await service.searchNodes(['slack', 'gmail']);

			expect(mockSearchCodeBuilderNodes).toHaveBeenCalledTimes(1);
		});

		test('calls search for different queries', async () => {
			await service.initialize();

			await service.searchNodes(['gmail']);
			await service.searchNodes(['slack']);

			expect(mockSearchCodeBuilderNodes).toHaveBeenCalledTimes(2);
		});

		test('uses separate search state per nodeFilter reference', async () => {
			await service.initialize();

			const filterA = () => true;
			const filterB = () => false;

			await service.searchNodes(['gmail'], { nodeFilter: filterA });
			await service.searchNodes(['gmail'], { nodeFilter: filterB });

			expect(mockSearchCodeBuilderNodes).toHaveBeenCalledTimes(2);
			expect(mockSearchCodeBuilderNodes).toHaveBeenNthCalledWith(
				1,
				expect.anything(),
				['gmail'],
				expect.objectContaining({ nodeFilter: filterA }),
			);
			expect(mockSearchCodeBuilderNodes).toHaveBeenNthCalledWith(
				2,
				expect.anything(),
				['gmail'],
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

			// Two distinct search states, each invoked once.
			expect(mockSearchCodeBuilderNodes).toHaveBeenCalledTimes(2);
		});
	});

	describe('getNodeTypes', () => {
		test('returns cached result on repeated calls with same nodeIds', async () => {
			await service.initialize();

			const result1 = await service.getNodeTypes(['n8n-nodes-base.set']);
			const result2 = await service.getNodeTypes(['n8n-nodes-base.set']);

			expect(result1).toBe('get-result');
			expect(result2).toBe('get-result');
			expect(mockGetNodeTypes).toHaveBeenCalledTimes(1);
		});

		test('handles object nodeIds in cache key', async () => {
			await service.initialize();
			const nodeId = { nodeId: 'n8n-nodes-base.gmail', resource: 'message', operation: 'send' };

			await service.getNodeTypes([nodeId]);
			await service.getNodeTypes([nodeId]);

			expect(mockGetNodeTypes).toHaveBeenCalledTimes(1);
		});

		test('is order-independent across nodeIds', async () => {
			await service.initialize();

			await service.getNodeTypes(['n8n-nodes-base.gmail', 'n8n-nodes-base.slack']);
			await service.getNodeTypes(['n8n-nodes-base.slack', 'n8n-nodes-base.gmail']);

			expect(mockGetNodeTypes).toHaveBeenCalledTimes(1);
		});

		test('synthesizes type definitions for a community node instead of the on-disk lookup', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-resend.resend',
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypes(['n8n-nodes-resend.resend']);

			expect(mockGenerateNodeTypeFile).toHaveBeenCalledTimes(1);
			expect(result).toContain('synth-result');
			// Community nodes have no on-disk artifact, so the disk lookup is skipped.
			expect(mockGetNodeTypes).not.toHaveBeenCalled();
		});

		test('uses the on-disk lookup for built-in nodes', async () => {
			await service.initialize();

			const result = await service.getNodeTypes(['n8n-nodes-base.set']);

			expect(mockGetNodeTypes).toHaveBeenCalledTimes(1);
			expect(mockGetNodeTypes).toHaveBeenCalledWith(
				['n8n-nodes-base.set'],
				expect.objectContaining({ nodeDefinitionDirs: expect.any(Array) }),
			);
			expect(result).toBe('get-result');
			expect(mockGenerateNodeTypeFile).not.toHaveBeenCalled();
		});

		test('degrades gracefully when a node type cannot be synthesized', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-resend.resend',
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
					{
						// Expression-computed inputs can't be expressed as an SDK type.
						name: 'n8n-nodes-dynamic.dynamic',
						group: ['transform'],
						properties: [],
						inputs: '={{ $json.connections }}',
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypes([
				'n8n-nodes-resend.resend',
				'n8n-nodes-dynamic.dynamic',
			]);

			// The resolvable node still comes through; the unresolvable one is noted, not thrown.
			expect(result).toContain('synth-result');
			expect(result).toContain('# Errors');
			expect(result).toContain('n8n-nodes-dynamic.dynamic');
		});

		test('synthesizes the latest version of a versioned node by default', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-multi.multi',
						version: 1,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
					{
						name: 'n8n-nodes-multi.multi',
						version: 2,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			await service.getNodeTypes(['n8n-nodes-multi.multi']);

			expect(mockGenerateNodeTypeFile).toHaveBeenCalledTimes(1);
			expect(mockGenerateNodeTypeFile).toHaveBeenCalledWith(
				expect.objectContaining({ version: 2 }),
			);
		});

		test('synthesizes the requested version of a versioned node', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-multi.multi',
						version: 1,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
					{
						name: 'n8n-nodes-multi.multi',
						version: 2,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			await service.getNodeTypes([{ nodeId: 'n8n-nodes-multi.multi', version: '1' }]);

			expect(mockGenerateNodeTypeFile).toHaveBeenCalledWith(
				expect.objectContaining({ version: 1 }),
			);
		});

		test('reports an error for an unknown requested version instead of downgrading', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-multi.multi',
						version: 1,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
					{
						name: 'n8n-nodes-multi.multi',
						version: 2,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypes([
				{ nodeId: 'n8n-nodes-multi.multi', version: '5' },
			]);

			// No silent downgrade: the missing version is reported with what's available.
			expect(mockGenerateNodeTypeFile).not.toHaveBeenCalled();
			expect(result).toContain("Version '5' not found for node 'n8n-nodes-multi.multi'");
			expect(result).toContain('Available versions: 1, 2');
		});
	});

	describe('getSuggestedNodes', () => {
		test('returns cached result on repeated calls with same categories', async () => {
			await service.initialize();

			const result1 = await service.getSuggestedNodes(['chatbot', 'notification']);
			const result2 = await service.getSuggestedNodes(['chatbot', 'notification']);

			expect(result1).toBe('suggest-result');
			expect(result2).toBe('suggest-result');
			expect(mockGetSuggestedNodes).toHaveBeenCalledTimes(1);
		});
	});

	describe('cache invalidation', () => {
		test('clears all caches when node types are refreshed', async () => {
			await service.initialize();

			await service.searchNodes(['gmail']);
			await service.searchNodes(['gmail'], { nodeFilter: () => true });
			await service.getNodeTypes(['n8n-nodes-base.set']);
			await service.getSuggestedNodes(['chatbot']);

			expect(mockSearchCodeBuilderNodes).toHaveBeenCalledTimes(2);
			expect(mockGetNodeTypes).toHaveBeenCalledTimes(1);
			expect(mockGetSuggestedNodes).toHaveBeenCalledTimes(1);

			expect(postProcessorCallback).toBeDefined();
			await postProcessorCallback!();

			await service.searchNodes(['gmail']);
			await service.searchNodes(['gmail'], { nodeFilter: () => true });
			await service.getNodeTypes(['n8n-nodes-base.set']);
			await service.getSuggestedNodes(['chatbot']);

			expect(mockSearchCodeBuilderNodes).toHaveBeenCalledTimes(4);
			expect(mockGetNodeTypes).toHaveBeenCalledTimes(2);
			expect(mockGetSuggestedNodes).toHaveBeenCalledTimes(2);
		});
	});
});
