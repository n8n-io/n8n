import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { NodeCatalogService } from '../node-catalog.service';

const MockNodeTypeParser = jest.fn();
const mockSetSchemaBaseDirs = jest.fn();
const mockSearchCodeBuilderNodes = jest.fn();
const mockGetNodeTypes = jest.fn().mockReturnValue('# TypeScript Type Definitions\n\nget-result');
const mockGetSuggestedNodes = jest.fn().mockReturnValue('suggest-result');
const mockGenerateNodeTypeFile = jest.fn().mockReturnValue('synthesized-result');
const mockFsAccess = jest.fn().mockResolvedValue(undefined);

jest.mock('@n8n/ai-utilities/node-catalog', () => ({
	NodeTypeParser: MockNodeTypeParser,
	searchCodeBuilderNodes: (...args: unknown[]) => mockSearchCodeBuilderNodes(...args),
	getNodeTypes: (...args: unknown[]) => mockGetNodeTypes(...args),
	getSuggestedNodes: (...args: unknown[]) => mockGetSuggestedNodes(...args),
}));

jest.mock('@n8n/workflow-sdk', () => ({
	setSchemaBaseDirs: (...args: unknown[]) => mockSetSchemaBaseDirs(...(args as [string[]])),
	generateNodeTypeFile: (...args: unknown[]) => mockGenerateNodeTypeFile(...args),
}));

jest.mock('node:fs/promises', () => ({
	access: (...args: unknown[]) => mockFsAccess(...args),
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
		mockSearchCodeBuilderNodes.mockReturnValue({
			results: 'search-result',
			queriesWithNoResults: [],
		});
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

			expect(result1).toBe('# TypeScript Type Definitions\n\nget-result');
			expect(result2).toBe('# TypeScript Type Definitions\n\nget-result');
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

			// Per-node resolution calls the SDK once per unique ID. The second
			// service.getNodeTypes(...) invocation hits the outer cache, so we
			// see 2 SDK calls total (gmail + slack) rather than 4.
			expect(mockGetNodeTypes).toHaveBeenCalledTimes(2);
		});

		test('resolves community package directories via loadNodesAndCredentials.loaders', async () => {
			loadNodesAndCredentials.loaders = {
				'n8n-nodes-resend': {
					packageName: 'n8n-nodes-resend',
					directory: '/path/to/custom/n8n-nodes-resend',
				} as any,
			};

			await service.initialize();

			expect(service.getNodeDefinitionDirs()).toContain(
				path.join('/path/to/custom/n8n-nodes-resend', 'dist', 'node-definitions'),
			);
		});

		test('uses fallback synthesis when static file returns errors', async () => {
			mockGetNodeTypes.mockReturnValueOnce(
				"\n\n# Errors\n\nNode type 'n8n-nodes-resend.resend' not found.",
			);
			// nodeDescriptions is keyed by the short name (`name` on the description),
			// while MCP clients send fully qualified IDs. Both names must resolve.
			loadNodesAndCredentials.collectTypes.mockResolvedValueOnce({
				nodes: [{ name: 'resend', properties: [] }],
			} as any);

			await service.initialize();
			const result = await service.getNodeTypes(['n8n-nodes-resend.resend']);

			expect(result).toContain('# TypeScript Type Definitions');
			expect(result).toContain('// Synthesized type for n8n-nodes-resend.resend');
			expect(result).toContain('synthesized-result');
			expect(mockGenerateNodeTypeFile).toHaveBeenCalled();
		});

		test('returns unavailable error if synthesis fails', async () => {
			mockGetNodeTypes.mockReturnValueOnce(
				"\n\n# Errors\n\nNode type 'n8n-nodes-resend.resend' not found.",
			);
			loadNodesAndCredentials.collectTypes.mockResolvedValueOnce({
				nodes: [{ name: 'resend', properties: [] }],
			} as any);
			mockGenerateNodeTypeFile.mockImplementationOnce(() => {
				throw new Error('Synthesis failed');
			});

			await service.initialize();
			const result = await service.getNodeTypes(['n8n-nodes-resend.resend']);

			expect(result).toContain('# Errors');
			expect(result).toContain('type definitions could not be generated. Use validate_node_config');
		});

		test('returns not found error if node is missing in registry', async () => {
			mockGetNodeTypes.mockReturnValueOnce(
				"\n\n# Errors\n\nNode type 'n8n-nodes-resend.resend' not found.",
			);
			loadNodesAndCredentials.collectTypes.mockResolvedValueOnce({
				nodes: [],
			} as any);

			await service.initialize();
			const result = await service.getNodeTypes(['n8n-nodes-resend.resend']);

			expect(result).toContain('# Errors');
			expect(result).toContain("Node type 'n8n-nodes-resend.resend' not found. Use search_node");
		});

		test('returns empty string when called with no nodeIds', async () => {
			await service.initialize();
			const result = await service.getNodeTypes([]);
			expect(result).toBe('');
			// No SDK calls should happen for an empty request.
			expect(mockGetNodeTypes).not.toHaveBeenCalled();
		});

		test('invalidates directory and description caches on refreshNodeTypes', async () => {
			loadNodesAndCredentials.loaders = {
				'n8n-nodes-resend': {
					packageName: 'n8n-nodes-resend',
					directory: '/path/to/custom/n8n-nodes-resend',
				} as any,
			};

			await service.initialize();
			expect(service.getNodeDefinitionDirs().length).toBeGreaterThan(1);

			// Modify loaders to be empty
			loadNodesAndCredentials.loaders = {};
			loadNodesAndCredentials.collectTypes.mockResolvedValueOnce({
				nodes: [{ name: 'n8n-nodes-base.webhook' }],
			} as any);

			// Trigger refresh callback
			expect(postProcessorCallback).toBeDefined();
			await postProcessorCallback!();

			// Should have re-resolved and not contain resend since loader was removed
			const dirs = service.getNodeDefinitionDirs();
			expect(dirs.some((d) => d.includes('n8n-nodes-resend'))).toBe(false);
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

		test('a previously failed lookup succeeds after refresh once the loader arrives', async () => {
			// First init: the node isn't installed yet, so the registry returns an error.
			loadNodesAndCredentials.loaders = {
				'n8n-nodes-resend': {
					packageName: 'n8n-nodes-resend',
					directory: '/path/to/custom/n8n-nodes-resend',
				} as any,
			};
			mockGetNodeTypes.mockReturnValue(
				"\n\n# Errors\n\nNode type 'n8n-nodes-resend.resend' not found.",
			);
			loadNodesAndCredentials.collectTypes.mockResolvedValueOnce({
				nodes: [],
			} as any);

			await service.initialize();
			const firstResult = await service.getNodeTypes(['n8n-nodes-resend.resend']);
			expect(firstResult).toContain('not found');
			expect(mockGenerateNodeTypeFile).not.toHaveBeenCalled();

			// Now simulate installing the package: the next collectTypes returns
			// the description, and the SDK's getNodeTypes still has no static file.
			loadNodesAndCredentials.collectTypes.mockResolvedValueOnce({
				nodes: [{ name: 'resend', properties: [] }],
			} as any);

			expect(postProcessorCallback).toBeDefined();
			await postProcessorCallback!();

			// The stale "not found" entry must have been evicted; synthesis should now run.
			mockGenerateNodeTypeFile.mockClear();
			const secondResult = await service.getNodeTypes(['n8n-nodes-resend.resend']);
			expect(secondResult).toContain('Synthesized type');
			expect(mockGenerateNodeTypeFile).toHaveBeenCalledTimes(1);
		});

		test('concurrent getNodeTypes during refresh sees consistent (old or new) state', async () => {
			// Initial state: no resend node available.
			mockGetNodeTypes.mockReturnValue(
				"\n\n# Errors\n\nNode type 'n8n-nodes-resend.resend' not found.",
			);
			loadNodesAndCredentials.collectTypes.mockResolvedValueOnce({
				nodes: [{ name: 'n8n-nodes-base.set' }],
			} as any);

			await service.initialize();
			const initialResult = await service.getNodeTypes(['n8n-nodes-base.set']);
			expect(initialResult).toContain('# TypeScript Type Definitions');

			// Build a "stuck" deferred promise that lets us pause collectTypes
			// mid-refresh while another getNodeTypes runs concurrently.
			let resolveCollect!: (value: { nodes: unknown[]; credentials: unknown[] }) => void;
			const collectPromise = new Promise<{ nodes: unknown[]; credentials: unknown[] }>(
				(resolve) => {
					resolveCollect = resolve;
				},
			);

			loadNodesAndCredentials.collectTypes.mockReturnValueOnce(collectPromise as never);

			// Start refresh; it should pause awaiting collectTypes.
			const refreshPromise = postProcessorCallback!();

			// While the refresh is paused, the old snapshot is still published.
			// Reading a *new* ID must work against the OLD snapshot, not crash
			// or return a half-built state. The SDK still returns the same static
			// result for the old node, so the response stays coherent.
			mockGetNodeTypes.mockClear();
			mockGetNodeTypes.mockReturnValue(
				'# TypeScript Type Definitions\n\n## n8n-nodes-base.httpRequest\n\nold-content',
			);
			const concurrentResult = await service.getNodeTypes(['n8n-nodes-base.httpRequest']);
			expect(concurrentResult).toContain('old-content');

			// Now release the refresh: resend becomes available.
			resolveCollect({
				nodes: [{ name: 'n8n-nodes-base.set' }, { name: 'resend' }],
				credentials: [],
			});
			await refreshPromise;

			// After refresh completes, the new snapshot is published atomically.
			// (nodeDescriptions is now keyed by short "resend".)
			mockGetNodeTypes.mockClear();
			mockGetNodeTypes.mockReturnValue(
				"\n\n# Errors\n\nNode type 'n8n-nodes-resend.resend' not found.",
			);
			const postResult = await service.getNodeTypes(['n8n-nodes-resend.resend']);
			expect(postResult).toContain('Synthesized type');
		});
	});

	describe('canonical name extraction', () => {
		test('resolves fully qualified node IDs through the short-name registry', async () => {
			// nodeDescriptions are keyed by short name, but callers send
			// fully qualified IDs like "n8n-nodes-resend.resend".
			mockGetNodeTypes.mockReturnValue(
				"\n\n# Errors\n\nNode type 'n8n-nodes-resend.resend' not found.",
			);
			loadNodesAndCredentials.collectTypes.mockResolvedValueOnce({
				nodes: [{ name: 'resend', properties: [] }],
			} as any);

			await service.initialize();
			const result = await service.getNodeTypes(['n8n-nodes-resend.resend']);

			expect(mockGenerateNodeTypeFile).toHaveBeenCalledTimes(1);
			// The synthesized block keeps the original qualified ID in the header.
			expect(result).toContain('// Synthesized type for n8n-nodes-resend.resend');
		});

		test('uses the original ID when there is no dot (no package prefix)', async () => {
			mockGetNodeTypes.mockReturnValueOnce("\n\n# Errors\n\nNode type 'resend' not found.");
			loadNodesAndCredentials.collectTypes.mockResolvedValueOnce({
				nodes: [{ name: 'resend', properties: [] }],
			} as any);

			await service.initialize();
			const result = await service.getNodeTypes(['resend']);

			expect(mockGenerateNodeTypeFile).toHaveBeenCalledTimes(1);
			expect(result).toContain('// Synthesized type for resend');
		});
	});

	describe('resolveBuiltinNodeDefinitionDirs error tolerance', () => {
		test('does not throw when fs.access rejects with EACCES', async () => {
			loadNodesAndCredentials.loaders = {
				'permission-locked': {
					packageName: 'permission-locked',
					directory: '/locked/community/node',
				} as any,
			};

			// Simulate EACCES for the community loader path only; built-in dirs
			// keep succeeding.
			mockFsAccess.mockImplementation(async (p: unknown) => {
				if (typeof p === 'string' && p.includes('locked/community/node')) {
					const err = new Error('permission denied') as NodeJS.ErrnoException;
					err.code = 'EACCES';
					throw err;
				}
			});

			await service.initialize();

			const dirs = service.getNodeDefinitionDirs();
			expect(dirs.every((d) => !d.includes('locked/community/node'))).toBe(true);
		});
	});
});
