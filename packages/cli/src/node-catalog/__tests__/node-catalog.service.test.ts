import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityNodeTypesService } from '@/modules/community-packages/community-node-types.service';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';

import { NodeCatalogService } from '../node-catalog.service';

const MockNodeTypeParser = vi.fn();
const mockSetSchemaBaseDirs = vi.fn();
const mockSearchCodeBuilderNodes = vi.fn();
const mockGetNodeTypes = vi.fn().mockReturnValue('get-result');
const mockGetNodeTypeDefinition = vi.fn().mockReturnValue({
	nodeId: 'n8n-nodes-base.set',
	version: 'v1',
	content: 'builtin-raw-result',
});
const mockGetSuggestedNodes = vi.fn().mockReturnValue('suggest-result');
const mockGenerateNodeTypeFile = vi.fn().mockReturnValue('synth-result');
const mockFormatNodeResult = vi.fn((_parser: unknown, nodeId: string) => `block:${nodeId}`);

vi.mock('@n8n/ai-utilities/node-catalog', () => ({
	NodeTypeParser: MockNodeTypeParser,
	searchCodeBuilderNodes: (...args: unknown[]) => mockSearchCodeBuilderNodes(...args),
	getNodeTypes: (...args: unknown[]) => mockGetNodeTypes(...args),
	getNodeTypeDefinition: (...args: unknown[]) => mockGetNodeTypeDefinition(...args),
	getSuggestedNodes: (...args: unknown[]) => mockGetSuggestedNodes(...args),
	formatNodeResult: (...args: unknown[]) => mockFormatNodeResult(...(args as [unknown, string])),
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
		mockGetNodeTypes.mockReturnValue('get-result');
		mockGetNodeTypeDefinition.mockReturnValue({
			nodeId: 'n8n-nodes-base.set',
			version: 'v1',
			content: 'builtin-raw-result',
		});
		mockGetSuggestedNodes.mockReturnValue('suggest-result');
		mockGenerateNodeTypeFile.mockReturnValue('synth-result');
		mockFormatNodeResult.mockImplementation((_parser, nodeId) => `block:${nodeId}`);
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

	describe('includeUninstalled', () => {
		const verifiedEntry = (name: string, displayName = 'Firecrawl') => ({
			name,
			displayName,
			isInstalled: false,
			isOfficialNode: true,
			numberOfDownloads: 2520,
			nodeDescription: {
				// The registry publishes uninstalled nodes under a `-preview` package
				// name; the service must reindex them under their installed name.
				name: name.replace('n8n-nodes-', 'n8n-nodes-preview-'),
				displayName,
				version: 1,
				group: ['transform'],
				properties: [],
				inputs: ['main'],
				outputs: ['main'],
			},
		});

		beforeEach(() => {
			Container.set(
				CommunityPackagesConfig,
				mock<CommunityPackagesConfig>({ enabled: true, verifiedEnabled: true }),
			);
			Container.set(
				CommunityNodeTypesService,
				mock<CommunityNodeTypesService>({
					getCommunityNodeTypes: vi
						.fn()
						.mockResolvedValue([verifiedEntry('n8n-nodes-firecrawl.firecrawl')]),
				}),
			);
		});

		test('does not touch the verified catalog unless a caller opts in', async () => {
			const getCommunityNodeTypes = vi.fn().mockResolvedValue([]);
			Container.set(
				CommunityNodeTypesService,
				mock<CommunityNodeTypesService>({ getCommunityNodeTypes }),
			);
			await service.initialize();

			await service.searchNodes(['firecrawl']);
			await service.getNodeTypes(['n8n-nodes-firecrawl.firecrawl']);

			expect(getCommunityNodeTypes).not.toHaveBeenCalled();
		});

		test('appends verified matches below the installed results', async () => {
			await service.initialize();
			mockSearchCodeBuilderNodes.mockReturnValue({
				results: 'installed-block',
				queriesWithNoResults: ['firecrawl'],
			});

			const result = await service.searchNodes(['firecrawl'], { includeUninstalled: true });

			const verifiedBlock = 'block:n8n-nodes-firecrawl.firecrawl';
			expect(result.results).toContain('installed-block');
			expect(result.results).toContain('not installed on this instance');
			expect(result.results).toContain(verifiedBlock);
			expect(result.results.indexOf('installed-block')).toBeLessThan(
				result.results.indexOf(verifiedBlock),
			);
			// The second tier answered it, so it is no longer an unanswered query.
			expect(result.queriesWithNoResults).toEqual([]);
		});

		test('stays silent on a query the registry does not answer by name', async () => {
			await service.initialize();
			mockSearchCodeBuilderNodes.mockReturnValue({
				results: 'installed-block',
				queriesWithNoResults: [],
			});

			// Fuzzy matching would surface Firecrawl for this; precise matching does not.
			const result = await service.searchNodes(['slack'], { includeUninstalled: true });

			expect(result.results).toBe('installed-block');
			expect(mockFormatNodeResult).not.toHaveBeenCalled();
		});

		test('leaves results untouched when the verified catalog has no match', async () => {
			await service.initialize();
			mockSearchCodeBuilderNodes.mockReturnValue({
				results: 'installed-block',
				queriesWithNoResults: ['nonsense'],
			});

			const result = await service.searchNodes(['nonsense'], { includeUninstalled: true });

			expect(result).toEqual({
				results: 'installed-block',
				queriesWithNoResults: ['nonsense'],
			});
		});

		test('skips verified entries n8n has not vetted as official', async () => {
			Container.set(
				CommunityNodeTypesService,
				mock<CommunityNodeTypesService>({
					getCommunityNodeTypes: vi
						.fn()
						.mockResolvedValue([
							{ ...verifiedEntry('n8n-nodes-firecrawl.firecrawl'), isOfficialNode: false },
						]),
				}),
			);
			await service.initialize();

			await service.searchNodes(['firecrawl'], { includeUninstalled: true });

			// No verified tier built, so no second parser.
			expect(MockNodeTypeParser).toHaveBeenCalledTimes(1);
		});

		test('indexes verified nodes under their installed name, not the preview name', async () => {
			await service.initialize();
			await service.searchNodes(['firecrawl'], { includeUninstalled: true });

			// First construction is the installed tier, second is the verified tier.
			expect(MockNodeTypeParser).toHaveBeenCalledTimes(2);
			expect(MockNodeTypeParser).toHaveBeenLastCalledWith([
				expect.objectContaining({ name: 'n8n-nodes-firecrawl.firecrawl' }),
			]);
		});

		test('skips verified entries already installed here', async () => {
			Container.set(
				CommunityNodeTypesService,
				mock<CommunityNodeTypesService>({
					getCommunityNodeTypes: vi
						.fn()
						.mockResolvedValue([
							{ ...verifiedEntry('n8n-nodes-firecrawl.firecrawl'), isInstalled: true },
						]),
				}),
			);
			await service.initialize();

			await service.searchNodes(['firecrawl'], { includeUninstalled: true });

			// No verified tier built, so no second parser.
			expect(MockNodeTypeParser).toHaveBeenCalledTimes(1);
		});

		test('does not build the tier when verified packages are disabled', async () => {
			Container.set(
				CommunityPackagesConfig,
				mock<CommunityPackagesConfig>({ enabled: true, verifiedEnabled: false }),
			);
			const getCommunityNodeTypes = vi.fn();
			Container.set(
				CommunityNodeTypesService,
				mock<CommunityNodeTypesService>({ getCommunityNodeTypes }),
			);
			await service.initialize();

			await service.searchNodes(['firecrawl'], { includeUninstalled: true });

			expect(getCommunityNodeTypes).not.toHaveBeenCalled();
		});

		test('falls back to installed-only results when the catalog fetch fails', async () => {
			Container.set(
				CommunityNodeTypesService,
				mock<CommunityNodeTypesService>({
					getCommunityNodeTypes: vi.fn().mockRejectedValue(new Error('registry down')),
				}),
			);
			await service.initialize();
			mockSearchCodeBuilderNodes.mockReturnValue({
				results: 'installed-block',
				queriesWithNoResults: [],
			});

			const result = await service.searchNodes(['firecrawl'], { includeUninstalled: true });

			expect(result.results).toBe('installed-block');
		});

		test('does not serve an opt-in search result to a caller that did not opt in', async () => {
			await service.initialize();
			mockSearchCodeBuilderNodes.mockReturnValue({
				results: 'installed-block',
				queriesWithNoResults: [],
			});

			const optedIn = await service.searchNodes(['firecrawl'], { includeUninstalled: true });
			const plain = await service.searchNodes(['firecrawl']);

			expect(optedIn.results).toContain('not installed on this instance');
			expect(plain.results).toBe('installed-block');
		});

		test('does not serve an opt-in type definition to a caller that did not opt in', async () => {
			await service.initialize();
			const request = { nodeId: 'n8n-nodes-firecrawl.firecrawl' };

			const optedIn = await service.getNodeTypeDefinition(request, { includeUninstalled: true });
			const plain = await service.getNodeTypeDefinition(request);

			expect(optedIn.content).toContain('NOT INSTALLED');
			expect(plain.error).toContain('not found');
		});

		test('prefers the installed definition over the verified one', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-firecrawl.firecrawl',
						displayName: 'Firecrawl',
						version: 1,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypeDefinition(
				{ nodeId: 'n8n-nodes-firecrawl.firecrawl' },
				{ includeUninstalled: true },
			);

			expect(result.content).toBe('synth-result');
			expect(result.content).not.toContain('NOT INSTALLED');
		});

		test('drops the verified tier on node-type refresh', async () => {
			await service.initialize();
			await service.searchNodes(['firecrawl'], { includeUninstalled: true });
			expect(MockNodeTypeParser).toHaveBeenCalledTimes(2);

			await postProcessorCallback?.();
			await service.searchNodes(['firecrawl'], { includeUninstalled: true });

			// Installed rebuild on refresh, then the verified tier rebuilt on demand.
			expect(MockNodeTypeParser).toHaveBeenCalledTimes(4);
		});

		test('reports which verified nodes were offered', async () => {
			await service.initialize();

			const result = await service.searchNodes(['firecrawl'], { includeUninstalled: true });

			expect(result.uninstalledOffered).toEqual(['n8n-nodes-firecrawl.firecrawl']);
		});

		test('reports nothing offered when the registry did not answer', async () => {
			await service.initialize();

			const result = await service.searchNodes(['gmail'], { includeUninstalled: true });

			expect(result.uninstalledOffered).toBeUndefined();
		});

		test('retries the tier build after it came back empty', async () => {
			// A registry outage on the first opt-in must not disable discovery for
			// the life of the process.
			const getCommunityNodeTypes = vi
				.fn()
				.mockResolvedValueOnce([])
				.mockResolvedValue([verifiedEntry('n8n-nodes-firecrawl.firecrawl')]);
			Container.set(
				CommunityNodeTypesService,
				mock<CommunityNodeTypesService>({ getCommunityNodeTypes }),
			);
			await service.initialize();

			const first = await service.searchNodes(['firecrawl'], { includeUninstalled: true });
			expect(first.uninstalledOffered).toBeUndefined();

			const second = await service.searchNodes(['firecrawl'], { includeUninstalled: true });
			expect(second.uninstalledOffered).toEqual(['n8n-nodes-firecrawl.firecrawl']);
			expect(getCommunityNodeTypes).toHaveBeenCalledTimes(2);
		});

		test('does not rebuild the tier once it is built', async () => {
			const getCommunityNodeTypes = vi
				.fn()
				.mockResolvedValue([verifiedEntry('n8n-nodes-firecrawl.firecrawl')]);
			Container.set(
				CommunityNodeTypesService,
				mock<CommunityNodeTypesService>({ getCommunityNodeTypes }),
			);
			await service.initialize();

			await service.searchNodes(['firecrawl'], { includeUninstalled: true });
			await service.searchNodes(['tavily'], { includeUninstalled: true });

			expect(getCommunityNodeTypes).toHaveBeenCalledTimes(1);
		});

		test('rebuilds the tier once it outlives the registry refresh interval', async () => {
			// Without a TTL the first successful build would pin the tier for the
			// process lifetime, so a node verified later could never be discovered.
			const getCommunityNodeTypes = vi
				.fn()
				.mockResolvedValueOnce([verifiedEntry('n8n-nodes-firecrawl.firecrawl')])
				.mockResolvedValue([
					verifiedEntry('n8n-nodes-firecrawl.firecrawl'),
					verifiedEntry('n8n-nodes-tavily.tavily'),
				]);
			Container.set(
				CommunityNodeTypesService,
				mock<CommunityNodeTypesService>({ getCommunityNodeTypes }),
			);
			await service.initialize();

			vi.useFakeTimers();
			try {
				vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
				const before = await service.searchNodes(['tavily'], { includeUninstalled: true });
				expect(before.uninstalledOffered).toBeUndefined();

				// Just inside the window: still the first build.
				vi.setSystemTime(new Date('2026-01-01T07:59:00Z'));
				await service.searchNodes(['tavily'], { includeUninstalled: true });
				expect(getCommunityNodeTypes).toHaveBeenCalledTimes(1);

				// Past it: rebuilt, and the newly verified node is now discoverable.
				vi.setSystemTime(new Date('2026-01-01T08:01:00Z'));
				const after = await service.searchNodes(['tavily'], { includeUninstalled: true });

				expect(getCommunityNodeTypes).toHaveBeenCalledTimes(2);
				expect(after.uninstalledOffered).toEqual(['n8n-nodes-tavily.tavily']);
			} finally {
				vi.useRealTimers();
			}
		});

		describe('findUninstalledNodeTypes', () => {
			test('names the package that ships an uninstalled node type', async () => {
				await service.initialize();

				expect(await service.findUninstalledNodeTypes(['n8n-nodes-firecrawl.firecrawl'])).toEqual([
					{ nodeType: 'n8n-nodes-firecrawl.firecrawl', packageName: 'n8n-nodes-firecrawl' },
				]);
			});

			test('ignores node types the registry does not know', async () => {
				await service.initialize();

				expect(await service.findUninstalledNodeTypes(['n8n-nodes-base.set'])).toEqual([]);
			});

			test('reports nothing for an empty request without touching the registry', async () => {
				const getCommunityNodeTypes = vi.fn().mockResolvedValue([]);
				Container.set(
					CommunityNodeTypesService,
					mock<CommunityNodeTypesService>({ getCommunityNodeTypes }),
				);
				await service.initialize();

				expect(await service.findUninstalledNodeTypes([])).toEqual([]);
				expect(getCommunityNodeTypes).not.toHaveBeenCalled();
			});

			test('reports nothing when the verified catalog is unavailable', async () => {
				Container.set(
					CommunityNodeTypesService,
					mock<CommunityNodeTypesService>({
						getCommunityNodeTypes: vi.fn().mockRejectedValue(new Error('registry down')),
					}),
				);
				await service.initialize();

				expect(await service.findUninstalledNodeTypes(['n8n-nodes-firecrawl.firecrawl'])).toEqual(
					[],
				);
			});
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
						// A malformed description can't be expressed as an SDK type.
						name: 'n8n-nodes-malformed.malformed',
						group: 'transform',
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypes([
				'n8n-nodes-resend.resend',
				'n8n-nodes-malformed.malformed',
			]);

			// The resolvable node still comes through; the unresolvable one is noted, not thrown.
			expect(result).toContain('synth-result');
			expect(result).toContain('# Errors');
			expect(result).toContain('n8n-nodes-malformed.malformed');
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

		test('synthesizes a hidden built-in node instead of the on-disk lookup', async () => {
			// The build-time generator skips hidden nodes, so no on-disk artifact
			// exists for them even though search surfaces them (e.g. messageAnAgent).
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-base.messageAnAgent',
						version: 2,
						hidden: true,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
					{ name: 'n8n-nodes-base.set' },
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypes([
				'n8n-nodes-base.messageAnAgent',
				'n8n-nodes-base.set',
			]);

			expect(mockGenerateNodeTypeFile).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n-nodes-base.messageAnAgent' }),
			);
			expect(mockGetNodeTypes).toHaveBeenCalledWith(['n8n-nodes-base.set'], expect.anything());
			expect(result).toContain('synth-result');
			expect(result).toContain('get-result');
			expect(result).not.toContain('# Errors');
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

	describe('getNodeTypeDefinition', () => {
		test('returns raw built-in type definition content', async () => {
			await service.initialize();

			const result = await service.getNodeTypeDefinition({ nodeId: 'n8n-nodes-base.set' });

			expect(result).toEqual({ content: 'builtin-raw-result', version: 'v1' });
			expect(mockGetNodeTypeDefinition).toHaveBeenCalledWith(
				'n8n-nodes-base.set',
				undefined,
				expect.any(Array),
				{ resource: undefined, operation: undefined, mode: undefined },
			);
			expect(mockGenerateNodeTypeFile).not.toHaveBeenCalled();
		});

		test('does not cache error results', async () => {
			mockGetNodeTypeDefinition
				.mockReturnValueOnce({
					nodeId: 'n8n-nodes-base.set',
					content: '',
					error: 'temporary lookup error',
				})
				.mockReturnValueOnce({
					nodeId: 'n8n-nodes-base.set',
					version: 'v1',
					content: 'builtin-raw-result',
				});
			await service.initialize();

			const errorResult = await service.getNodeTypeDefinition({ nodeId: 'n8n-nodes-base.set' });
			const successResult = await service.getNodeTypeDefinition({ nodeId: 'n8n-nodes-base.set' });

			expect(errorResult).toEqual({ content: '', error: 'temporary lookup error' });
			expect(successResult).toEqual({ content: 'builtin-raw-result', version: 'v1' });
			expect(mockGetNodeTypeDefinition).toHaveBeenCalledTimes(2);
		});

		test('evicts least recently used definition result when cache byte budget is full', async () => {
			// each entry is ~921.6KB, so 18 (~16.6MB) fit within the 16MiB (~16.8MB)
			// budget and the 19th insert evicts exactly one LRU entry
			const largeDefinition = 'x'.repeat(900 * 1024);
			const nodeIdFor = (index: number) => `n8n-nodes-base.node${index}`;
			mockGetNodeTypeDefinition.mockImplementation((nodeId: string) => ({
				nodeId,
				version: 'v1',
				content: `${nodeId}-${largeDefinition}`,
			}));
			await service.initialize();

			for (let index = 0; index < 18; index++) {
				await service.getNodeTypeDefinition({ nodeId: nodeIdFor(index) });
			}

			await service.getNodeTypeDefinition({ nodeId: nodeIdFor(0) });
			await service.getNodeTypeDefinition({ nodeId: nodeIdFor(18) });

			mockGetNodeTypeDefinition.mockClear();

			await service.getNodeTypeDefinition({ nodeId: nodeIdFor(0) });
			await service.getNodeTypeDefinition({ nodeId: nodeIdFor(1) });

			expect(mockGetNodeTypeDefinition).toHaveBeenCalledTimes(1);
			expect(mockGetNodeTypeDefinition).toHaveBeenCalledWith(
				nodeIdFor(1),
				undefined,
				expect.any(Array),
				{ resource: undefined, operation: undefined, mode: undefined },
			);
		});

		test('synthesizes a hidden built-in node instead of the on-disk lookup', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-base.messageAnAgent',
						version: 2,
						hidden: true,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypeDefinition({
				nodeId: 'n8n-nodes-base.messageAnAgent',
			});

			expect(result).toEqual({ content: 'synth-result', version: '2' });
			expect(mockGenerateNodeTypeFile).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n-nodes-base.messageAnAgent' }),
			);
			expect(mockGetNodeTypeDefinition).not.toHaveBeenCalled();
		});

		test('synthesizes type definitions for a community node', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-resend.resend',
						version: 1,
						group: ['transform'],
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
						builderHint: { searchHint: 'Use Resend for transactional email.' },
					},
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypeDefinition({ nodeId: 'n8n-nodes-resend.resend' });

			expect(result).toEqual({
				content: 'synth-result',
				version: '1',
				builderHint: 'Use Resend for transactional email.',
			});
			expect(mockGenerateNodeTypeFile).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n-nodes-resend.resend' }),
			);
			expect(mockGetNodeTypeDefinition).not.toHaveBeenCalled();
		});

		test('selects the latest version of a community node by default', async () => {
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

			const result = await service.getNodeTypeDefinition({ nodeId: 'n8n-nodes-multi.multi' });

			expect(result.version).toBe('2');
			expect(mockGenerateNodeTypeFile).toHaveBeenCalledWith(
				expect.objectContaining({ version: 2 }),
			);
		});

		test('selects the requested version of a community node', async () => {
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

			const result = await service.getNodeTypeDefinition({
				nodeId: 'n8n-nodes-multi.multi',
				version: '1',
			});

			expect(result.version).toBe('1');
			expect(mockGenerateNodeTypeFile).toHaveBeenCalledWith(
				expect.objectContaining({ version: 1 }),
			);
		});

		test('synthesizes type definitions for a node with expression connections', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-dynamic.dynamic',
						version: 1,
						group: ['transform'],
						properties: [],
						inputs: '={{ $parameter.connections }}',
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypeDefinition({ nodeId: 'n8n-nodes-dynamic.dynamic' });

			expect(result.content).toBe('synth-result');
			expect(result.error).toBeUndefined();
		});

		test('returns a structured error when a node cannot be synthesized', async () => {
			loadNodesAndCredentials.collectTypes.mockResolvedValue({
				nodes: [
					{
						name: 'n8n-nodes-malformed.malformed',
						version: 1,
						group: 'transform',
						properties: [],
						inputs: ['main'],
						outputs: ['main'],
					},
				],
			} as never);
			await service.initialize();

			const result = await service.getNodeTypeDefinition({
				nodeId: 'n8n-nodes-malformed.malformed',
			});

			expect(result.content).toBe('');
			expect(result.error).toContain("could not be generated from the node's description");
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
