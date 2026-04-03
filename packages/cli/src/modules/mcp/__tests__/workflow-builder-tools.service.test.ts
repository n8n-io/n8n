import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { WorkflowBuilderToolsService } from '../tools/workflow-builder/workflow-builder-tools.service';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

const MockNodeTypeParser = jest.fn();
const mockSetSchemaBaseDirs = jest.fn();
const mockSearchInvoke = jest.fn().mockResolvedValue('search-result');
const mockGetInvoke = jest.fn().mockResolvedValue('get-result');
const mockSuggestInvoke = jest.fn().mockResolvedValue('suggest-result');

jest.mock('@n8n/ai-workflow-builder', () => ({
	NodeTypeParser: MockNodeTypeParser,
	createCodeBuilderSearchTool: jest.fn(() => ({ invoke: mockSearchInvoke })),
	createCodeBuilderGetTool: jest.fn(() => ({ invoke: mockGetInvoke })),
	createGetSuggestedNodesTool: jest.fn(() => ({ invoke: mockSuggestInvoke })),
}));

jest.mock('@n8n/workflow-sdk', () => ({
	setSchemaBaseDirs: (...args: unknown[]) => mockSetSchemaBaseDirs(...args),
}));

jest.mock('fs', () => ({
	existsSync: jest.fn().mockReturnValue(true),
}));

const mockLogger = (): Logger =>
	mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) });

describe('WorkflowBuilderToolsService', () => {
	let service: WorkflowBuilderToolsService;
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

		service = new WorkflowBuilderToolsService(loadNodesAndCredentials, mockLogger());
	});

	describe('getNodeTypeParser', () => {
		test('throws when called before initialize', () => {
			expect(() => service.getNodeTypeParser()).toThrow(
				'WorkflowBuilderToolsService not initialized',
			);
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
			// Should have found dirs for n8n-nodes-base and @n8n/n8n-nodes-langchain
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

			// Simulate post-processor callback (refreshNodeTypes)
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
			// Call postProcessor before init
			expect(postProcessorCallback).toBeDefined();
			await postProcessorCallback!();

			// Should not create a parser since service was never initialized
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

	describe('cache invalidation', () => {
		test('clears all caches when node types are refreshed', async () => {
			await service.initialize();

			// Populate caches
			await service.searchNodes(['gmail']);
			await service.getNodeTypes(['n8n-nodes-base.set']);
			await service.getSuggestedNodes(['chatbot']);

			expect(mockSearchInvoke).toHaveBeenCalledTimes(1);
			expect(mockGetInvoke).toHaveBeenCalledTimes(1);
			expect(mockSuggestInvoke).toHaveBeenCalledTimes(1);

			// Trigger refresh
			expect(postProcessorCallback).toBeDefined();
			await postProcessorCallback!();

			// Same calls should invoke tools again (cache was cleared)
			await service.searchNodes(['gmail']);
			await service.getNodeTypes(['n8n-nodes-base.set']);
			await service.getSuggestedNodes(['chatbot']);

			expect(mockSearchInvoke).toHaveBeenCalledTimes(2);
			expect(mockGetInvoke).toHaveBeenCalledTimes(2);
			expect(mockSuggestInvoke).toHaveBeenCalledTimes(2);
		});
	});
});
