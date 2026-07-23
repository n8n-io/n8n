import { ref } from 'vue';
import { setActivePinia, getActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import { STORES } from '@n8n/stores';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import type { IWorkflowDb } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { MAX_PREVIEW_EXECUTIONS_IN_MEMORY } from '@/app/constants';
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
import { useLogsStore } from '@/app/stores/logs.store';
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

function executionDataStoreLives(executionId: string): boolean {
	return (
		getActivePinia()!.state.value[getExecutionDataStoreId(createExecutionDataId(executionId))] !==
		undefined
	);
}

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});

	return { promise, resolve, reject };
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

	it('opens the logs panel when the execution data is too large to display', async () => {
		const logsStore = useLogsStore();
		const toggleOpenSpy = vi.spyOn(logsStore, 'toggleOpen');
		workflowsStore.getExecution = vi
			.fn()
			.mockResolvedValue(createExecution({ dataTooLargeToDisplay: true }));

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		expect(toggleOpenSpy).toHaveBeenCalledWith(true);
	});

	it('does not open the logs panel for a normal execution', async () => {
		const logsStore = useLogsStore();
		const toggleOpenSpy = vi.spyOn(logsStore, 'toggleOpen');

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		expect(toggleOpenSpy).not.toHaveBeenCalled();
	});

	it('still renders the workflow canvas when the execution data is too large to display', async () => {
		workflowsStore.getExecution = vi
			.fn()
			.mockResolvedValue(createExecution({ dataTooLargeToDisplay: true }));

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		// the workflow snapshot still hydrates the canvas even though run data was skipped
		expect(preview.documentStore.value?.allNodes.map((node) => node.name)).toEqual(['Node A']);
		expect(preview.execution.value?.dataTooLargeToDisplay).toBe(true);
	});

	it('hydrates the synthetic execution-preview document, never the editor document', async () => {
		const editorDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
		editorDocumentStore.setNodes([createTestNode({ name: 'Editor Node' })]);
		editorDocumentStore.setName('Editor Workflow');

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		expect(preview.documentStore.value?.documentId).toBe(
			createExecutionPreviewDocumentId(WORKFLOW_ID, 'v1'),
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
			createExecutionPreviewDocumentId(WORKFLOW_ID, 'v1'),
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
		expect(preview.execution.value).toBeNull();
	});

	it('does not leave an execution data store behind when the fetch fails', async () => {
		workflowsStore.getExecution = vi.fn().mockRejectedValue(new Error('Not found'));

		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		// The reuse peek must not instantiate a store for an id that never loaded.
		expect(executionDataStoreLives(EXECUTION_ID)).toBe(false);
	});

	it('clears the rendered preview when the latest execution fetch fails after a successful load', async () => {
		const executionId = ref(EXECUTION_ID);
		workflowsStore.getExecution = vi.fn(async (id: string) => {
			if (id === 'execution-2') {
				throw new Error('Not found');
			}
			return createExecution({ id });
		});

		const preview = useExecutionPreviewDocument({ executionId });
		await preview.load();
		expect(preview.documentStore.value).not.toBeNull();
		expect(preview.execution.value?.id).toBe(EXECUTION_ID);

		executionId.value = 'execution-2';
		await preview.load();

		expect(preview.loadError.value?.message).toBe('Not found');
		expect(preview.documentStore.value).toBeNull();
		expect(preview.execution.value).toBeNull();
	});

	it('does not let an older failed request clear a newer successful preview', async () => {
		const delayedFailure = createDeferred<IExecutionResponse>();
		const executionId = ref('execution-late-failure');
		workflowsStore.getExecution = vi.fn((id: string) =>
			id === 'execution-late-failure'
				? delayedFailure.promise
				: Promise.resolve(createExecution({ id: 'execution-current' })),
		);

		const preview = useExecutionPreviewDocument({ executionId });
		const lateFailureLoad = preview.load();

		executionId.value = 'execution-current';
		await preview.load();
		expect(preview.execution.value?.id).toBe('execution-current');

		delayedFailure.reject(new Error('Late failure'));
		await lateFailureLoad;

		expect(preview.loadError.value).toBeNull();
		expect(preview.documentStore.value).not.toBeNull();
		expect(preview.execution.value?.id).toBe('execution-current');
	});

	it('disposes all preview stores on dispose()', async () => {
		const preview = useExecutionPreviewDocument({ executionId: () => EXECUTION_ID });
		await preview.load();

		const previewDocumentId = createExecutionPreviewDocumentId(WORKFLOW_ID, 'v1');
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

	it('releases retained execution data stores on dispose() even when the latest load failed', async () => {
		const executionId = ref(EXECUTION_ID);
		workflowsStore.getExecution = vi.fn(async (id: string) => {
			if (id === 'execution-2') {
				throw new Error('Not found');
			}
			return createExecution({ id });
		});

		const preview = useExecutionPreviewDocument({ executionId });
		await preview.load();
		expect(executionDataStoreLives(EXECUTION_ID)).toBe(true);

		// The latest load fails and nulls documentStore; dispose() must still
		// resolve the workflow id (from the tracked id, not documentStore) and
		// release the previously-loaded execution's data store.
		executionId.value = 'execution-2';
		await preview.load();
		expect(preview.documentStore.value).toBeNull();

		preview.dispose();
		expect(executionDataStoreLives(EXECUTION_ID)).toBe(false);
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

	it('gives each executed workflow version its own document store and disposes them all', async () => {
		const pinia = getActivePinia()!;

		// Two executions of the same workflow that ran against different versions
		// — and therefore different node sets.
		workflowsStore.getExecution = vi.fn(async (id: string) =>
			id === 'execution-v2'
				? createExecution({
						id: 'execution-v2',
						workflowData: createTestWorkflow({
							id: WORKFLOW_ID,
							versionId: 'v2',
							nodes: [createTestNode({ name: 'Node B' })],
							connections: {},
						}),
					})
				: createExecution(),
		);

		const executionId = ref(EXECUTION_ID);
		const preview = useExecutionPreviewDocument({ executionId });

		await preview.load();
		expect(preview.documentStore.value?.documentId).toBe(
			createExecutionPreviewDocumentId(WORKFLOW_ID, 'v1'),
		);

		// Switching to an execution of a different version hydrates a distinct
		// store rather than re-shaping the v1 one.
		executionId.value = 'execution-v2';
		await preview.load();
		expect(preview.documentStore.value?.documentId).toBe(
			createExecutionPreviewDocumentId(WORKFLOW_ID, 'v2'),
		);
		expect(preview.documentStore.value?.allNodes.map((node) => node.name)).toEqual(['Node B']);

		const idV1 = createExecutionPreviewDocumentId(WORKFLOW_ID, 'v1');
		const idV2 = createExecutionPreviewDocumentId(WORKFLOW_ID, 'v2');
		expect(pinia.state.value[getWorkflowDocumentStoreId(idV1)]).toBeDefined();
		expect(pinia.state.value[getWorkflowDocumentStoreId(idV2)]).toBeDefined();

		// dispose() releases every version's document store, not just the last.
		preview.dispose();
		expect(pinia.state.value[getWorkflowDocumentStoreId(idV1)]).toBeUndefined();
		expect(pinia.state.value[getWorkflowDocumentStoreId(idV2)]).toBeUndefined();
	});

	describe('in-memory execution cap', () => {
		it('evicts the least-recently-used execution once the in-memory cap is exceeded', async () => {
			workflowsStore.getExecution = vi.fn(async (id: string) => createExecution({ id }));

			const executionId = ref('exec-0');
			const preview = useExecutionPreviewDocument({ executionId });

			// Load one more than the cap (exec-0 … exec-10).
			for (let index = 0; index <= MAX_PREVIEW_EXECUTIONS_IN_MEMORY; index++) {
				executionId.value = `exec-${index}`;
				await preview.load();
			}

			// The oldest (exec-0) is evicted; the newest and the second-oldest survive.
			expect(executionDataStoreLives('exec-0')).toBe(false);
			expect(executionDataStoreLives('exec-1')).toBe(true);
			expect(executionDataStoreLives(`exec-${MAX_PREVIEW_EXECUTIONS_IN_MEMORY}`)).toBe(true);
		});

		it('never evicts an execution the editor still references, even when it is the oldest', async () => {
			workflowsStore.getExecution = vi.fn(async (id: string) => createExecution({ id }));

			// The editor displays exec-0 (e.g. the user ran it, then opened the
			// executions tab). Disposing its data store would blank the editor.
			const editorStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId(WORKFLOW_ID),
			);
			editorStateStore.setWorkflowExecutionData(createExecution({ id: 'exec-0', mode: 'manual' }));

			const executionId = ref('exec-0');
			const preview = useExecutionPreviewDocument({ executionId });
			for (let index = 0; index <= MAX_PREVIEW_EXECUTIONS_IN_MEMORY; index++) {
				executionId.value = `exec-${index}`;
				await preview.load();
			}

			// exec-0 is protected, so exec-1 is evicted as the oldest evictable.
			expect(executionDataStoreLives('exec-0')).toBe(true);
			expect(executionDataStoreLives('exec-1')).toBe(false);
		});

		it('protects a re-selected execution from being the next eviction victim', async () => {
			const getExecution = vi.fn(async (id: string) => createExecution({ id }));
			workflowsStore.getExecution = getExecution;

			const executionId = ref('exec-0');
			const preview = useExecutionPreviewDocument({ executionId });

			// Fill exactly to the cap (exec-0 … exec-9): no eviction yet.
			for (let index = 0; index < MAX_PREVIEW_EXECUTIONS_IN_MEMORY; index++) {
				executionId.value = `exec-${index}`;
				await preview.load();
			}
			const fetchesAfterFill = getExecution.mock.calls.length;

			// Re-select the oldest: reused from memory (no refetch) and now MRU.
			executionId.value = 'exec-0';
			await preview.load();
			expect(getExecution.mock.calls.length).toBe(fetchesAfterFill);

			// The next load evicts exec-1 (now the oldest), not the re-selected exec-0.
			executionId.value = 'exec-10';
			await preview.load();

			expect(executionDataStoreLives('exec-0')).toBe(true);
			expect(executionDataStoreLives('exec-1')).toBe(false);
		});

		it('refetches an execution that was evicted and then re-selected', async () => {
			const getExecution = vi.fn(async (id: string) => createExecution({ id }));
			workflowsStore.getExecution = getExecution;

			const executionId = ref('exec-0');
			const preview = useExecutionPreviewDocument({ executionId });
			for (let index = 0; index <= MAX_PREVIEW_EXECUTIONS_IN_MEMORY; index++) {
				executionId.value = `exec-${index}`;
				await preview.load();
			}
			expect(executionDataStoreLives('exec-0')).toBe(false);
			const fetchesBefore = getExecution.mock.calls.length;

			// exec-0's data store was disposed, so re-selecting it refetches.
			executionId.value = 'exec-0';
			await preview.load();
			expect(getExecution).toHaveBeenCalledWith('exec-0');
			expect(getExecution.mock.calls.length).toBe(fetchesBefore + 1);
		});
	});
});
