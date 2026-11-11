import { defineComponent, h, inject, type Ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import {
	EditorEnabledFeaturesKey,
	type EditorEnabledFeatures,
} from '@/app/constants/injectionKeys';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
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
	});

	it('provides read-only preview features and shows node issues by default', async () => {
		const { getByTestId } = renderComponent({ pinia, props: { documentId, workflow } });

		await waitFor(() => expect(getByTestId('node-view-stub')).toBeInTheDocument());

		expect(injected.enabledFeatures?.value).toEqual({
			readOnly: true,
			expandGroups: 'all',
			aiAssistant: false,
			aiBuilder: false,
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
