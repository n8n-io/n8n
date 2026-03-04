import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { WorkflowBuilderToolsService } from '../tools/workflow-builder/workflow-builder-tools.service';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

const MockNodeTypeParser = jest.fn();
const mockSetSchemaBaseDirs = jest.fn();

jest.mock('@n8n/ai-workflow-builder', () => ({
	NodeTypeParser: MockNodeTypeParser,
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
});
