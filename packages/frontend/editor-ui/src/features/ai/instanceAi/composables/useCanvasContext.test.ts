import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useCanvasContext } from './useCanvasContext';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockWorkflowsStore = {
	workflowId: 'wf-123',
	workflowName: 'My Test Workflow',
	allNodes: [
		{
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			parameters: { url: 'https://example.com' },
			position: [0, 0],
		},
		{
			name: 'Set',
			type: 'n8n-nodes-base.set',
			parameters: {},
			position: [200, 0],
		},
	],
	getNodeByName: vi.fn((name: string) => {
		return mockWorkflowsStore.allNodes.find((n) => n.name === name) ?? null;
	}),
};

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => mockWorkflowsStore),
}));

const mockUIStore = {
	lastSelectedNode: null as string | null,
};

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn(() => mockUIStore),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCanvasContext', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		mockWorkflowsStore.workflowId = 'wf-123';
		mockWorkflowsStore.workflowName = 'My Test Workflow';
		mockUIStore.lastSelectedNode = null;
		mockWorkflowsStore.getNodeByName.mockClear();
	});

	test('returns workflowId and name from workflow store', () => {
		const { canvasContext } = useCanvasContext();

		expect(canvasContext.value).toBeDefined();
		expect(canvasContext.value?.workflowId).toBe('wf-123');
		expect(canvasContext.value?.workflowName).toBe('My Test Workflow');
		expect(canvasContext.value?.nodeCount).toBe(2);
	});

	test('includes selected nodes when nodes are selected', () => {
		mockUIStore.lastSelectedNode = 'HTTP Request';

		const { canvasContext } = useCanvasContext();

		expect(canvasContext.value?.selectedNodes).toEqual([
			{
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://example.com' },
			},
		]);
	});

	test('returns undefined selectedNodes when no nodes selected', () => {
		mockUIStore.lastSelectedNode = null;

		const { canvasContext } = useCanvasContext();

		expect(canvasContext.value?.selectedNodes).toBeUndefined();
	});

	test('returns undefined when no workflow is loaded', () => {
		mockWorkflowsStore.workflowId = '';

		const { canvasContext } = useCanvasContext();

		expect(canvasContext.value).toBeUndefined();
	});

	test('omits parameters when node has empty parameters', () => {
		mockUIStore.lastSelectedNode = 'Set';

		const { canvasContext } = useCanvasContext();

		expect(canvasContext.value?.selectedNodes).toEqual([
			{
				name: 'Set',
				type: 'n8n-nodes-base.set',
			},
		]);
	});
});
