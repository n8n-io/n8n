import {
	defineComponent,
	h,
	inject,
	onBeforeUnmount,
	ref,
	shallowRef,
	type Ref,
	type ShallowRef,
} from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import {
	EditorEnabledFeaturesKey,
	WorkflowDocumentStoreKey,
	WorkflowIdKey,
} from '@/app/constants/injectionKeys';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import ExecutionPreviewHost from './ExecutionPreviewHost.vue';

const {
	mockDocumentStore,
	mockLoad,
	mockDispose,
	mockSetActiveNodeName,
	mockUnsetActiveNodeName,
	injected,
} = vi.hoisted(() => ({
	mockDocumentStore: {
		documentId: 'test-workflow@execution-preview',
		workflowId: 'test-workflow',
		getNodeById: vi.fn(),
		connectionsBySourceNode: {},
		setConnections: vi.fn(),
	},
	mockLoad: vi.fn(),
	mockDispose: vi.fn(),
	mockSetActiveNodeName: vi.fn(),
	mockUnsetActiveNodeName: vi.fn(),
	injected: {
		workflowId: undefined as Ref<string> | undefined,
		documentStore: undefined as ShallowRef<WorkflowDocumentStore | null> | undefined,
		documentStoreOnBeforeUnmount: undefined as WorkflowDocumentStore | null | undefined,
		enabledFeatures: undefined as Ref<Record<string, unknown>> | undefined,
	},
}));

// Reactive refs must be created after the vue import is initialized — at
// module scope here, not inside vi.hoisted.
const mockPreview = {
	documentStore: shallowRef<unknown>(null),
	execution: shallowRef<unknown>(null),
	isLoading: ref(false),
	loadError: ref<Error | null>(null),
	isProductionExecutionPreview: ref(false),
};

vi.mock('@/features/execution/executions/composables/useExecutionPreviewDocument', () => ({
	useExecutionPreviewDocument: vi.fn(() => ({
		...mockPreview,
		load: mockLoad,
		dispose: mockDispose,
	})),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: vi.fn(() => ({
		setActiveNodeName: mockSetActiveNodeName,
		unsetActiveNodeName: mockUnsetActiveNodeName,
	})),
}));

vi.mock('@/app/views/NodeView.vue', () => ({
	default: defineComponent({
		name: 'NodeViewStub',
		setup() {
			injected.workflowId = inject(WorkflowIdKey);
			injected.documentStore = inject(WorkflowDocumentStoreKey);
			injected.enabledFeatures = inject(EditorEnabledFeaturesKey);
			onBeforeUnmount(() => {
				injected.documentStoreOnBeforeUnmount = injected.documentStore?.value;
			});
			return () => h('div', { 'data-test-id': 'node-view-stub' });
		},
	}),
}));

vi.mock('@/features/execution/logs/components/LogsPanel.vue', () => ({
	default: defineComponent({
		name: 'LogsPanelStub',
		props: { isReadOnly: { type: Boolean, default: false } },
		setup(props) {
			return () =>
				h('div', {
					'data-test-id': 'logs-panel-stub',
					'data-read-only': String(props.isReadOnly),
				});
		},
	}),
}));

const renderComponent = createComponentRenderer(ExecutionPreviewHost, {
	global: {
		plugins: [createTestingPinia()],
	},
});

describe('ExecutionPreviewHost', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPreview.documentStore.value = null;
		mockPreview.execution.value = null;
		mockPreview.isLoading.value = false;
		mockPreview.loadError.value = null;
		injected.documentStoreOnBeforeUnmount = undefined;
		mockDispose.mockImplementation(() => {});
		mockLoad.mockImplementation(async () => {
			mockPreview.documentStore.value = mockDocumentStore;
			mockPreview.execution.value = { id: 'execution-1' } as IExecutionResponse;
		});
	});

	it('loads the execution on mount and renders the scoped subtree', async () => {
		const { getByTestId } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});

		expect(mockLoad).toHaveBeenCalledTimes(1);

		await waitFor(() => expect(getByTestId('node-view-stub')).toBeInTheDocument());

		// The subtree is scoped to the preview's stores via provides
		expect(injected.workflowId?.value).toBe('test-workflow');
		expect(injected.documentStore?.value).toBe(mockDocumentStore);
		expect(injected.enabledFeatures?.value).toEqual({
			readOnly: true,
			aiAssistant: false,
			aiBuilder: false,
			askAi: false,
			executionSuccessToasts: false,
			executionErrorToasts: false,
			expandGroups: 'errored',
		});
	});

	it('renders the read-only logs panel once execution data is present', async () => {
		const { getByTestId } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});

		await waitFor(() =>
			expect(getByTestId('logs-panel-stub')).toHaveAttribute('data-read-only', 'true'),
		);
	});

	it('shows the loading state until the document store exists', async () => {
		mockLoad.mockImplementation(async () => {});

		const { queryByTestId } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});

		await waitFor(() => expect(mockLoad).toHaveBeenCalled());
		expect(queryByTestId('node-view-stub')).not.toBeInTheDocument();
		expect(queryByTestId('logs-panel-stub')).not.toBeInTheDocument();
	});

	it('shows an error state when loading the execution fails', async () => {
		mockLoad.mockImplementation(async () => {
			mockPreview.loadError.value = new Error('Not found');
		});

		const { getByTestId, queryByTestId } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});

		await waitFor(() => expect(getByTestId('execution-preview-error')).toBeInTheDocument());
		expect(queryByTestId('node-view-stub')).not.toBeInTheDocument();
		expect(queryByTestId('logs-panel-stub')).not.toBeInTheDocument();
	});

	it('re-loads when the execution id changes and closes any open NDV', async () => {
		const { rerender } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});

		await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(1));

		await rerender({ executionId: 'execution-2' });

		await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
		expect(mockUnsetActiveNodeName).toHaveBeenCalled();
	});

	it('opens the deep-linked node in the NDV after loading', async () => {
		mockDocumentStore.getNodeById.mockReturnValue({ name: 'Deep Linked Node' });

		renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1', nodeId: 'node-123' },
		});

		await waitFor(() =>
			expect(mockSetActiveNodeName).toHaveBeenCalledWith('Deep Linked Node', 'other'),
		);
		expect(mockDocumentStore.getNodeById).toHaveBeenCalledWith('node-123');
	});

	it('disposes the preview stores on unmount', async () => {
		const { unmount } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});

		await waitFor(() => expect(mockLoad).toHaveBeenCalled());
		unmount();

		expect(mockDispose).toHaveBeenCalledTimes(1);
	});

	it('keeps the preview document injected until child teardown completes', async () => {
		mockDispose.mockImplementation(() => {
			mockPreview.documentStore.value = null;
		});

		const { getByTestId, unmount } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});

		await waitFor(() => expect(getByTestId('node-view-stub')).toBeInTheDocument());
		unmount();

		expect(injected.documentStoreOnBeforeUnmount).toBe(mockDocumentStore);
		expect(mockDispose).toHaveBeenCalledTimes(1);
		expect(mockPreview.documentStore.value).toBeNull();
	});

	it('defers the fit until canvas re-init when switching to a different workflow version', async () => {
		const emitSpy = vi.spyOn(canvasEventBus, 'emit');
		const documentIds = [
			'test-workflow@execution-preview/v1',
			'test-workflow@execution-preview/v2',
		];
		let loadIndex = 0;
		mockLoad.mockImplementation(async () => {
			mockPreview.documentStore.value = {
				...mockDocumentStore,
				documentId: documentIds[Math.min(loadIndex, documentIds.length - 1)],
			};
			mockPreview.execution.value = { id: `execution-${loadIndex + 1}` } as IExecutionResponse;
			loadIndex += 1;
		});

		const { rerender } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});
		// Let the first-load fit land, then clear so we assert only on the switch.
		await waitFor(() => expect(emitSpy).toHaveBeenCalledWith('fitView'));
		emitSpy.mockClear();

		await rerender({ executionId: 'execution-2' });

		await waitFor(() => expect(emitSpy).toHaveBeenCalledWith('fitView:onNodesInit'));
		expect(emitSpy).toHaveBeenCalledWith('setConnections:onNodesInit', expect.anything());
		expect(emitSpy).not.toHaveBeenCalledWith('fitView');
	});

	it('fits immediately when switching between executions of the same version', async () => {
		const emitSpy = vi.spyOn(canvasEventBus, 'emit');
		mockLoad.mockImplementation(async () => {
			mockPreview.documentStore.value = {
				...mockDocumentStore,
				documentId: 'test-workflow@execution-preview/v1',
			};
			mockPreview.execution.value = { id: 'execution' } as IExecutionResponse;
		});

		const { rerender } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});
		await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(1));

		emitSpy.mockClear();
		await rerender({ executionId: 'execution-2' });

		await waitFor(() => expect(emitSpy).toHaveBeenCalledWith('fitView'));
		expect(emitSpy).not.toHaveBeenCalledWith('fitView:onNodesInit');
	});
});
