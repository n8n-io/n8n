import { defineComponent, h, inject, type Ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import {
	EditorEnabledFeaturesKey,
	type EditorEnabledFeatures,
} from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useExistingWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { IWorkflowDb } from '@/Interface';
import WorkflowPreviewHost from './WorkflowPreviewHost.vue';

const { injected } = vi.hoisted(() => ({
	injected: {
		enabledFeatures: undefined as Ref<EditorEnabledFeatures> | undefined,
	},
}));

vi.mock('@/app/views/NodeView.vue', () => ({
	default: defineComponent({
		name: 'NodeViewStub',
		setup() {
			injected.enabledFeatures = inject(EditorEnabledFeaturesKey);
			return () => h('div', { 'data-test-id': 'node-view-stub' });
		},
	}),
}));

const renderComponent = createComponentRenderer(WorkflowPreviewHost);

const documentId = createWorkflowDocumentId('preview-workflow', 'preview');
const workflow = { id: 'preview-workflow', nodes: [], connections: {} } as unknown as IWorkflowDb;

describe('WorkflowPreviewHost', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		injected.enabledFeatures = undefined;
		vi.spyOn(useNodeTypesStore(), 'loadNodeTypesIfNotLoaded').mockResolvedValue();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('node types', () => {
		const workflowWithNode = {
			id: 'preview-workflow',
			nodes: [{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 1, position: [0, 0] }],
			connections: {},
		} as unknown as IWorkflowDb;

		it('waits for the node types before it hydrates the preview', async () => {
			const { promise, resolve } = Promise.withResolvers<void>();
			vi.mocked(useNodeTypesStore().loadNodeTypesIfNotLoaded).mockReturnValueOnce(promise);
			const { queryByTestId, getByTestId } = renderComponent({
				pinia,
				props: { documentId, workflow: workflowWithNode },
			});

			await flushPromises();
			expect(queryByTestId('node-view-stub')).not.toBeInTheDocument();
			expect(useWorkflowDocumentStore(documentId).allNodes).toHaveLength(0);

			resolve();
			await waitFor(() => expect(getByTestId('node-view-stub')).toBeInTheDocument());
			expect(useWorkflowDocumentStore(documentId).allNodes).toHaveLength(1);
		});

		it('hydrates the preview when the node types fail to load', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.mocked(useNodeTypesStore().loadNodeTypesIfNotLoaded).mockRejectedValueOnce(
				new Error('node types'),
			);
			const { getByTestId } = renderComponent({
				pinia,
				props: { documentId, workflow: workflowWithNode },
			});

			await waitFor(() => expect(getByTestId('node-view-stub')).toBeInTheDocument());
			expect(useWorkflowDocumentStore(documentId).allNodes).toHaveLength(1);
		});

		it('does not hydrate after it unmounts while it waits', async () => {
			const { promise, resolve } = Promise.withResolvers<void>();
			vi.mocked(useNodeTypesStore().loadNodeTypesIfNotLoaded).mockReturnValueOnce(promise);
			const { unmount } = renderComponent({
				pinia,
				props: { documentId, workflow: workflowWithNode },
			});

			unmount();
			resolve();
			await flushPromises();

			expect(useExistingWorkflowDocumentStore(documentId)).toBeUndefined();
		});

		it('hydrates only the latest workflow when the props change while it waits', async () => {
			const { promise, resolve } = Promise.withResolvers<void>();
			vi.mocked(useNodeTypesStore().loadNodeTypesIfNotLoaded).mockReturnValueOnce(promise);
			const otherDocumentId = createWorkflowDocumentId('preview-workflow', 'other');
			const { rerender, getByTestId } = renderComponent({
				pinia,
				props: { documentId, workflow: workflowWithNode },
			});
			await rerender({ documentId: otherDocumentId, workflow: workflowWithNode });

			resolve();
			await waitFor(() => expect(getByTestId('node-view-stub')).toBeInTheDocument());

			expect(useWorkflowDocumentStore(otherDocumentId).allNodes).toHaveLength(1);
			expect(useExistingWorkflowDocumentStore(documentId)).toBeUndefined();
		});
	});

	it('provides read-only preview features and shows node issues by default', async () => {
		const { getByTestId } = renderComponent({ pinia, props: { documentId, workflow } });

		await waitFor(() => expect(getByTestId('node-view-stub')).toBeInTheDocument());

		expect(injected.enabledFeatures?.value).toEqual({
			readOnly: true,
			expandGroups: 'all',
			aiAssistant: false,
			aiBuilder: false,
			askAi: false,
			executionSuccessToasts: false,
			executionErrorToasts: false,
			showNodeIssues: true,
		});
	});

	it('hides node issues when the host opts out', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			props: { documentId, workflow, showNodeIssues: false },
		});

		await waitFor(() => expect(getByTestId('node-view-stub')).toBeInTheDocument());

		expect(injected.enabledFeatures?.value.showNodeIssues).toBe(false);
	});
});
