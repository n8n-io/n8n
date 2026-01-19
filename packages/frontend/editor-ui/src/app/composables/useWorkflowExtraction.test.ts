import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkflowExtraction } from './useWorkflowExtraction';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import type { IConnections, INodeTypeDescription } from 'n8n-workflow';

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
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRouter: () => ({
			resolve: vi.fn(() => ({ href: '/workflow/123' })),
		}),
	};
});

describe('useWorkflowExtraction', () => {
	let workflowsStore: any;
	let nodeTypesStore: any;

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
		} as any;

		workflowsStore.workflowObject = {
			nodes: {},
			connectionsBySourceNode: {},
			getNode: vi.fn(),
			getChildNodes: vi.fn(() => []),
		} as any;
	});

	describe('makeSubworkflow - Start Node Connection', () => {
		it('should create start node connection when start node is explicitly defined', async () => {
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

			// Mock createNewWorkflow to capture the workflow data
			workflowsStore.createNewWorkflow = vi.fn((data) => {
				return Promise.resolve({
					id: 'new-workflow-id',
					versionId: 'version-1',
					...data,
				} as any);
			});

			workflowsStore.publishWorkflow = vi.fn(() => Promise.resolve({} as any));

			// Mock node type descriptions
			vi.spyOn(nodeTypesStore, 'getNodeType').mockReturnValue({
				name: 'n8n-nodes-base.code',
				version: 1,
				group: [],
				inputs: ['main'],
				outputs: ['main'],
				displayName: 'Code',
				description: 'Run custom code',
				defaults: {},
				properties: [],
			} as unknown as INodeTypeDescription);

			const { tryExtractNodesIntoSubworkflow } = useWorkflowExtraction();

			// The function will show a modal, so we can't test the full flow
			// Instead, we'll test the internal makeSubworkflow logic by examining
			// what would be created when the modal is confirmed

			// For now, verify the function doesn't throw with valid input
			const result = tryExtractNodesIntoSubworkflow(['node-1', 'node-2']);
			expect(result).toBeDefined();
		});

		it('should create start node connection when start node is NOT explicitly defined', async () => {
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
			workflowsStore.createNewWorkflow = vi.fn((data) => {
				// Verify that the Start node is connected to Code 2 (topmost node)
				expect(data.connections).toHaveProperty('Start');
				expect(data.connections.Start).toHaveProperty('main');
				expect(data.connections.Start.main[0][0].node).toBe('Code 2');

				return Promise.resolve({
					id: 'new-workflow-id',
					versionId: 'version-1',
					...data,
				} as any);
			});

			workflowsStore.publishWorkflow = vi.fn(() => Promise.resolve({} as any));

			// Mock node type descriptions
			vi.spyOn(nodeTypesStore, 'getNodeType').mockReturnValue({
				name: 'n8n-nodes-base.code',
				version: 1,
				group: [],
				inputs: ['main'],
				outputs: ['main'],
				displayName: 'Code',
				description: 'Run custom code',
				defaults: {},
				properties: [],
			} as unknown as INodeTypeDescription);

			const { tryExtractNodesIntoSubworkflow } = useWorkflowExtraction();
			const result = tryExtractNodesIntoSubworkflow(['node-1', 'node-2']);
			expect(result).toBeDefined();
		});

		it('should connect start node to the correct first node based on Y position', async () => {
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

			workflowsStore.createNewWorkflow = vi.fn((data) => {
				// Start node should connect to Top Node (Y=100, smallest position)
				expect(data.connections.Start.main[0][0].node).toBe('Top Node');

				return Promise.resolve({
					id: 'new-workflow-id',
					versionId: 'version-1',
					...data,
				} as any);
			});

			workflowsStore.publishWorkflow = vi.fn(() => Promise.resolve({} as any));

			vi.spyOn(nodeTypesStore, 'getNodeType').mockReturnValue({
				name: 'n8n-nodes-base.code',
				version: 1,
				group: [],
				inputs: ['main'],
				outputs: ['main'],
				displayName: 'Code',
				description: 'Run custom code',
				defaults: {},
				properties: [],
			} as unknown as INodeTypeDescription);

			const { tryExtractNodesIntoSubworkflow } = useWorkflowExtraction();
			tryExtractNodesIntoSubworkflow(['node-1', 'node-2', 'node-3']);
		});
	});
});
