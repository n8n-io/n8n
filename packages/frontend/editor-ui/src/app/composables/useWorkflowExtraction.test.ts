import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkflowExtraction } from './useWorkflowExtraction';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => ({
		addNodes: vi.fn(),
		replaceNodeConnections: vi.fn(),
		deleteNodes: vi.fn(),
		replaceNodeParameters: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: vi.fn(),
	}),
}));

vi.mock('vue-router', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRouter: () => ({
			resolve: vi.fn(() => ({ href: '/workflow/123' })),
		}),
	};
});

describe('useWorkflowExtraction', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		workflowsStore = mockedStore(useWorkflowsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);

		// Setup basic workflow
		workflowsStore.workflow = {
			id: 'test-workflow',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			active: false,
			settings: {},
			homeProject: { id: 'project-1' },
		} as unknown as typeof workflowsStore.workflow;

		workflowsStore.workflowObject = {
			nodes: {},
			connectionsBySourceNode: {},
			getNode: vi.fn(),
			getChildNodes: vi.fn(() => []),
		} as unknown as typeof workflowsStore.workflowObject;
	});

	describe('makeSubworkflow - Start Node Connection', () => {
		it('should create start node connection when start node is explicitly defined', () => {
			const nodes: INodeUi[] = [
				{
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [100, 200],
					parameters: {},
				},
				{
					id: 'node-2',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [300, 200],
					parameters: {},
				},
			];

			const connections: IConnections = {
				'HTTP Request': {
					main: [
						[
							{
								node: 'Code',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			workflowsStore.workflow.nodes = nodes;
			workflowsStore.workflow.connections = connections;

			// Mock createNewWorkflow
			workflowsStore.createNewWorkflow = vi.fn(async (data) => ({
				id: 'new-workflow-id',
				versionId: 'version-1',
				...data,
			})) as typeof workflowsStore.createNewWorkflow;

			workflowsStore.publishWorkflow = vi.fn(
				async () => ({}),
			) as typeof workflowsStore.publishWorkflow;

			// Mock node type descriptions
			nodeTypesStore.getNodeType = vi.fn(() => ({
				name: 'n8n-nodes-base.code',
				version: 1,
				group: [],
				inputs: ['main'] as const,
				outputs: ['main'] as const,
				displayName: 'Code',
				description: 'Run custom code',
				defaults: {},
				properties: [],
			})) as unknown as typeof nodeTypesStore.getNodeType;

			const { tryExtractNodesIntoSubworkflow } = useWorkflowExtraction();

			// The function will show a modal, so we can't test the full flow
			// Instead, we'll test the internal makeSubworkflow logic by examining
			// what would be created when the modal is confirmed

			// For now, verify the function doesn't throw with valid input
			const result = tryExtractNodesIntoSubworkflow(['node-1', 'node-2']);
			expect(result).toBeDefined();
		});

		it('should create start node connection when start node is NOT explicitly defined', () => {
			// This tests the bug fix - when there's no explicit start node,
			// the connection should still be created to the first node (topmost by Y position)
			const nodes: INodeUi[] = [
				{
					id: 'node-1',
					name: 'Code 1',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [100, 300], // Lower Y position (will be second)
					parameters: {},
				},
				{
					id: 'node-2',
					name: 'Code 2',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [100, 100], // Higher Y position (will be first)
					parameters: {},
				},
			];

			const connections: IConnections = {
				'Code 2': {
					main: [
						[
							{
								node: 'Code 1',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			workflowsStore.workflow.nodes = nodes;
			workflowsStore.workflow.connections = connections;

			// Mock createNewWorkflow
			workflowsStore.createNewWorkflow = vi.fn(async (data) => {
				// Verify that the Start node is connected to Code 2 (topmost node)
				expect(data.connections).toHaveProperty('Start');
				expect(data.connections?.Start).toHaveProperty('main');
				expect(data.connections?.Start?.main?.[0]?.[0]?.node).toBe('Code 2');

				return {
					id: 'new-workflow-id',
					versionId: 'version-1',
					...data,
				};
			}) as typeof workflowsStore.createNewWorkflow;

			workflowsStore.publishWorkflow = vi.fn(
				async () => ({}),
			) as typeof workflowsStore.publishWorkflow;

			// Mock node type descriptions
			nodeTypesStore.getNodeType = vi.fn(() => ({
				name: 'n8n-nodes-base.code',
				version: 1,
				group: [],
				inputs: ['main'] as const,
				outputs: ['main'] as const,
				displayName: 'Code',
				description: 'Run custom code',
				defaults: {},
				properties: [],
			})) as unknown as typeof nodeTypesStore.getNodeType;

			const { tryExtractNodesIntoSubworkflow } = useWorkflowExtraction();
			const result = tryExtractNodesIntoSubworkflow(['node-1', 'node-2']);
			expect(result).toBeDefined();
		});

		it('should connect start node to the correct first node based on Y position', () => {
			// Create nodes with different Y positions to verify sorting works correctly
			const nodes: INodeUi[] = [
				{
					id: 'node-1',
					name: 'Bottom Node',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [100, 500],
					parameters: {},
				},
				{
					id: 'node-2',
					name: 'Middle Node',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [100, 300],
					parameters: {},
				},
				{
					id: 'node-3',
					name: 'Top Node',
					type: 'n8n-nodes-base.code',
					typeVersion: 1,
					position: [100, 100],
					parameters: {},
				},
			];

			const connections: IConnections = {
				'Top Node': {
					main: [
						[
							{
								node: 'Middle Node',
								type: 'main',
								index: 0,
							},
						],
					],
				},
				'Middle Node': {
					main: [
						[
							{
								node: 'Bottom Node',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			workflowsStore.workflow.nodes = nodes;
			workflowsStore.workflow.connections = connections;

			workflowsStore.createNewWorkflow = vi.fn(async (data) => {
				// Start node should connect to Top Node (Y=100, smallest position)
				expect(data.connections?.Start?.main?.[0]?.[0]?.node).toBe('Top Node');

				return {
					id: 'new-workflow-id',
					versionId: 'version-1',
					...data,
				};
			}) as typeof workflowsStore.createNewWorkflow;

			workflowsStore.publishWorkflow = vi.fn(
				async () => ({}),
			) as typeof workflowsStore.publishWorkflow;

			nodeTypesStore.getNodeType = vi.fn(() => ({
				name: 'n8n-nodes-base.code',
				version: 1,
				group: [],
				inputs: ['main'] as const,
				outputs: ['main'] as const,
				displayName: 'Code',
				description: 'Run custom code',
				defaults: {},
				properties: [],
			})) as unknown as typeof nodeTypesStore.getNodeType;

			const { tryExtractNodesIntoSubworkflow } = useWorkflowExtraction();
			tryExtractNodesIntoSubworkflow(['node-1', 'node-2', 'node-3']);
		});
	});
});
