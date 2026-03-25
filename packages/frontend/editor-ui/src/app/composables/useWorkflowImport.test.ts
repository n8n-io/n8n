import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowRef } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowImport } from './useWorkflowImport';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { VIEWS } from '@/app/constants';

const mockResetWorkspace = vi.hoisted(() => vi.fn());
const mockInitializeWorkspace = vi.hoisted(() =>
	vi.fn().mockResolvedValue({ workflowDocumentStore: { id: 'mock-store' } }),
);
const mockFitView = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: vi.fn(() => ({
		resetWorkspace: mockResetWorkspace,
		initializeWorkspace: mockInitializeWorkspace,
		fitView: mockFitView,
	})),
}));

const mockRoute = vi.hoisted(() => ({ name: 'workflow' as string }));
vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRoute: vi.fn(() => mockRoute),
	};
});

vi.mock('@/app/utils/nodeViewUtils', () => ({
	getNodesWithNormalizedPosition: vi.fn((nodes) => nodes),
}));

describe('useWorkflowImport', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		mockRoute.name = VIEWS.WORKFLOW;
	});

	const createWorkflowData = (overrides: Partial<WorkflowDataUpdate> = {}): WorkflowDataUpdate =>
		({
			id: 'test-workflow',
			nodes: [{ name: 'Node 1', type: 'n8n-nodes-base.noOp', position: [0, 0] }],
			connections: {},
			...overrides,
		}) as WorkflowDataUpdate;

	it('should throw if workflow has no nodes', async () => {
		const storeRef = shallowRef(null);
		const { importWorkflowExact } = useWorkflowImport(storeRef);

		await expect(
			importWorkflowExact({ workflow: { connections: {} } as WorkflowDataUpdate }),
		).rejects.toThrow('Invalid workflow object');
	});

	it('should throw if workflow has no connections', async () => {
		const storeRef = shallowRef(null);
		const { importWorkflowExact } = useWorkflowImport(storeRef);

		await expect(
			importWorkflowExact({ workflow: { nodes: [] } as unknown as WorkflowDataUpdate }),
		).rejects.toThrow('Invalid workflow object');
	});

	it('should reset workspace, initialize, and fit view', async () => {
		const storeRef = shallowRef(null);
		const { importWorkflowExact } = useWorkflowImport(storeRef);

		await importWorkflowExact({ workflow: createWorkflowData() });

		expect(mockResetWorkspace).toHaveBeenCalledOnce();
		expect(mockInitializeWorkspace).toHaveBeenCalledOnce();
		expect(mockFitView).toHaveBeenCalledOnce();
	});

	it('should call resetWorkspace before initializeWorkspace', async () => {
		const callOrder: string[] = [];
		mockResetWorkspace.mockImplementation(() => callOrder.push('reset'));
		mockInitializeWorkspace.mockImplementation(async () => {
			callOrder.push('initialize');
			return { workflowDocumentStore: { id: 'mock-store' } };
		});

		const storeRef = shallowRef(null);
		const { importWorkflowExact } = useWorkflowImport(storeRef);

		await importWorkflowExact({ workflow: createWorkflowData() });

		expect(callOrder).toEqual(['reset', 'initialize']);
	});

	it('should update currentWorkflowDocumentStore with the new store', async () => {
		const mockStore = { id: 'new-store' };
		mockInitializeWorkspace.mockResolvedValue({ workflowDocumentStore: mockStore });

		const storeRef = shallowRef(null);
		const { importWorkflowExact } = useWorkflowImport(storeRef);

		await importWorkflowExact({ workflow: createWorkflowData() });

		expect(storeRef.value).toBe(mockStore);
	});

	it('should use workflow id from data on non-demo routes', async () => {
		mockRoute.name = VIEWS.WORKFLOW;

		const storeRef = shallowRef(null);
		const { importWorkflowExact } = useWorkflowImport(storeRef);

		await importWorkflowExact({ workflow: createWorkflowData({ id: 'my-workflow-id' }) });

		expect(mockInitializeWorkspace).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'my-workflow-id' }),
		);
	});

	it('should use "demo" id on demo routes', async () => {
		mockRoute.name = VIEWS.DEMO;

		const storeRef = shallowRef(null);
		const { importWorkflowExact } = useWorkflowImport(storeRef);

		await importWorkflowExact({ workflow: createWorkflowData({ id: 'ignored-id' }) });

		expect(mockInitializeWorkspace).toHaveBeenCalledWith(expect.objectContaining({ id: 'demo' }));
	});
});
