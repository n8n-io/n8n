import { setActivePinia, getActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import { STORES } from '@n8n/stores';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import type { IWorkflowDb } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createExecutionPreviewDocumentId,
	createWorkflowDocumentId,
	getWorkflowDocumentStoreId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	getWorkflowExecutionStateStoreId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import {
	createExecutionDataId,
	getExecutionDataStoreId,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';
import { useExecutionPreviewDocument } from './useExecutionPreviewDocument';

vi.mock('@/app/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => ({ showMessage, showError }),
	};
});

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: () => ({ run: vi.fn() }),
}));

const WORKFLOW_ID = 'test-workflow';
const EXECUTION_ID = 'execution-1';

function createExecution(overrides: Partial<IExecutionResponse> = {}): IExecutionResponse {
	return {
		id: EXECUTION_ID,
		workflowData: createTestWorkflow({
			id: WORKFLOW_ID,
			name: 'Executed Workflow',
			nodes: [createTestNode({ name: 'Node A' })],
			connections: {},
			pinData: { 'Node A': [{ json: { pinned: true } }] },
		}),
		finished: true,
		mode: 'production',
		status: 'success',
		startedAt: new Date(),
		createdAt: new Date(),
		data: {
			resultData: {
				runData: {
					'Node A': [],
				},
			},
		},
		...overrides,
	} as IExecutionResponse;
}

describe('useExecutionPreviewDocument', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(() => {
		setActivePinia(
			createTestingPinia({
				stubActions: false,
				initialState: {
					[STORES.NODE_TYPES]: {},
					[STORES.WORKFLOWS]: {
						workflowId: WORKFLOW_ID,
						workflow: mock<IWorkflowDb>({
							id: WORKFLOW_ID,
							nodes: [],
							connections: {},
							tags: [],
							usedCredentials: [],
						}),
					},
					[STORES.SETTINGS]: {
						settings: { enterprise: {} },
					},
				},
			}),
		);
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.getExecution = vi.fn().mockResolvedValue(createExecution());
	});

	it('hydrates the synthetic execution-preview document, never the editor document', async () => {
		const editorDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
		editorDocumentStore.setNodes([createTestNode({ name: 'Editor Node' })]);
		editorDocumentStore.setName('Editor Workflow');

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		expect(preview.documentStore.value?.documentId).toBe(
			createExecutionPreviewDocumentId(WORKFLOW_ID),
		);
		expect(preview.documentStore.value?.allNodes.map((node) => node.name)).toEqual(['Node A']);
		expect(preview.execution.value?.id).toBe(EXECUTION_ID);

		// The editor's document store is untouched
		expect(editorDocumentStore.allNodes.map((node) => node.name)).toEqual(['Editor Node']);
		expect(editorDocumentStore.name).toBe('Editor Workflow');
		expect(workflowsStore.workflowId).toBe(WORKFLOW_ID);
	});

	it('does not touch the editor execution-state store when loading', async () => {
		const editorStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId(WORKFLOW_ID));
		const editorExecution = createExecution({ id: 'editor-execution', mode: 'manual' });
		editorStateStore.setWorkflowExecutionData(editorExecution);

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		expect(editorStateStore.displayedExecutionId).toBe('editor-execution');
		expect(editorStateStore.activeExecution?.id).toBe('editor-execution');

		const previewStateStore = useWorkflowExecutionStateStore(
			createExecutionPreviewDocumentId(WORKFLOW_ID),
		);
		expect(previewStateStore.displayedExecutionId).toBe(EXECUTION_ID);
	});

	it('clears pin data on the preview document for production executions', async () => {
		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		expect(preview.isProductionExecutionPreview.value).toBe(true);
		expect(preview.documentStore.value?.getPinDataSnapshot()).toEqual({});
	});

	it('keeps pin data on the preview document for manual executions', async () => {
		workflowsStore.getExecution = vi.fn().mockResolvedValue(createExecution({ mode: 'manual' }));

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		expect(preview.isProductionExecutionPreview.value).toBe(false);
		expect(preview.documentStore.value?.getPinDataSnapshot()).toEqual({
			'Node A': [{ json: { pinned: true } }],
		});
	});

	it('reuses already-loaded terminal executions without re-fetching', async () => {
		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();
		expect(workflowsStore.getExecution).toHaveBeenCalledTimes(1);

		await preview.load();
		expect(workflowsStore.getExecution).toHaveBeenCalledTimes(1);
	});

	it('re-fetches non-terminal executions', async () => {
		workflowsStore.getExecution = vi
			.fn()
			.mockResolvedValue(createExecution({ status: 'waiting', finished: false }));

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();
		await preview.load();

		expect(workflowsStore.getExecution).toHaveBeenCalledTimes(2);
	});

	it('sets loadError and keeps the document store empty when the fetch fails', async () => {
		workflowsStore.getExecution = vi.fn().mockRejectedValue(new Error('Not found'));

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		expect(preview.loadError.value?.message).toBe('Not found');
		expect(preview.documentStore.value).toBeNull();
	});

	it('disposes all preview stores on dispose()', async () => {
		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		const previewDocumentId = createExecutionPreviewDocumentId(WORKFLOW_ID);
		const pinia = getActivePinia()!;

		expect(pinia.state.value[getWorkflowDocumentStoreId(previewDocumentId)]).toBeDefined();
		expect(pinia.state.value[getWorkflowExecutionStateStoreId(previewDocumentId)]).toBeDefined();
		expect(
			pinia.state.value[getExecutionDataStoreId(createExecutionDataId(EXECUTION_ID))],
		).toBeDefined();

		preview.dispose();

		expect(pinia.state.value[getWorkflowDocumentStoreId(previewDocumentId)]).toBeUndefined();
		expect(pinia.state.value[getWorkflowExecutionStateStoreId(previewDocumentId)]).toBeUndefined();
		expect(
			pinia.state.value[getExecutionDataStoreId(createExecutionDataId(EXECUTION_ID))],
		).toBeUndefined();
		expect(preview.documentStore.value).toBeNull();
	});

	it('keeps execution data alive on dispose() when the editor still references it', async () => {
		// The editor displays the same execution the preview loaded (e.g. the
		// user ran the workflow manually, then opened it in the executions tab).
		const editorStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId(WORKFLOW_ID));
		editorStateStore.setWorkflowExecutionData(createExecution({ mode: 'manual' }));

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();
		preview.dispose();

		// The shared per-execution data store survives — the editor still reads it
		const editorExecutionData = useExecutionDataStore(createExecutionDataId(EXECUTION_ID));
		expect(editorExecutionData.execution?.id).toBe(EXECUTION_ID);
		expect(editorStateStore.activeExecution?.id).toBe(EXECUTION_ID);
	});

	it('leaves no preview pinia state behind after repeated load/dispose cycles', async () => {
		const pinia = getActivePinia()!;

		// First cycle lazily instantiates shared editor-scope stores (inject
		// fallbacks); baseline after it so the loop asserts steady state.
		const firstPreview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await firstPreview.load();
		firstPreview.dispose();
		const statesBefore = Object.keys(pinia.state.value).sort();
		expect(statesBefore.filter((key) => key.includes('execution-preview'))).toEqual([]);

		for (let i = 0; i < 3; i++) {
			const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
			await preview.load();
			preview.dispose();
		}

		const statesAfter = Object.keys(pinia.state.value).sort();
		expect(statesAfter).toEqual(statesBefore);
	});
});
