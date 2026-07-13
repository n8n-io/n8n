/**
 * Regression test for the per-section store disposal in WorkflowSetupSectionBody.
 *
 * The component provides a workflow-document store keyed by `${workflowId}@${section.id}`
 * and its descendants materialize an NDV store for the same id. Pinia stores are
 * not freed on unmount, so the component must dispose both on teardown. Without
 * the dispose hooks these entries accumulate in `pinia.state` per section visited.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import { computed, ref } from 'vue';
import { renderComponent } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import type { INodeUi } from '@/Interface';

const displayNode = createTestNode({ name: 'Target', type: 'n8n-nodes-base.set' }) as INodeUi;

const mockContext = {
	workflowId: computed(() => 'wf-setup'),
	projectId: computed(() => undefined),
	credentialSelections: ref({}),
	getDisplayNode: vi.fn(() => displayNode),
	setCredential: vi.fn(),
	setParameterValue: vi.fn(),
};

vi.mock('../composables/useWorkflowSetupContext', () => ({
	useWorkflowSetupContext: () => mockContext,
}));

// Import after the mock is registered.
import WorkflowSetupSectionBody from './WorkflowSetupSectionBody.vue';

// A section with no credential type and no parameters so the heavy child
// components (NodeCredentials, ParameterInputList) are not rendered.
const section = {
	id: 'sec-1',
	targetNodeName: 'Target',
	credentialType: undefined,
	credentialTargetNodes: [],
	parameterNames: [],
	node: { type: 'n8n-nodes-base.set', typeVersion: 1 },
} as unknown as InstanceType<typeof WorkflowSetupSectionBody>['$props']['section'];

describe('WorkflowSetupSectionBody store disposal', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('disposes the scoped document and NDV stores on unmount', () => {
		const documentId = createWorkflowDocumentId('wf-setup', 'sec-1');

		const { unmount } = renderComponent(WorkflowSetupSectionBody, { props: { section } });

		// The host created the document store; simulate a descendant materializing
		// the NDV store for the same id.
		const documentStore = useWorkflowDocumentStore(documentId);
		const ndvStore = useNDVStore(documentId);
		ndvStore.setActiveNodeName('Target', 'other');

		const documentStoreId = documentStore.$id;
		const ndvStoreId = ndvStore.$id;
		const pinia = getActivePinia();

		expect(pinia?.state.value[documentStoreId]).toBeDefined();
		expect(pinia?.state.value[ndvStoreId]).toBeDefined();

		unmount();

		expect(pinia?.state.value[documentStoreId]).toBeUndefined();
		expect(pinia?.state.value[ndvStoreId]).toBeUndefined();
	});
});
