import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	defaultNodeDescriptions,
} from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { SET_NODE_TYPE } from '@/app/constants';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useI18n } from '@n8n/i18n';
import { createTestingPinia } from '@pinia/testing';
import { createRunExecutionData } from 'n8n-workflow';
import { computed, shallowRef } from 'vue';
import OutputPanel from './OutputPanel.vue';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {}, params: {} }),
	RouterLink: vi.fn(),
}));

describe('OutputPanel redaction cause', () => {
	const i18n = useI18n();

	afterEach(async () => {
		await vi.dynamicImportSettled();
	});

	it.each([false, true])(
		'shows the credential cause without a sharing action (redactedError=%s)',
		(redactedError) => {
			const pinia = createTestingPinia({ stubActions: false });
			const node = createTestNode({ name: 'Gmail' });
			const workflow = createTestWorkflow({ nodes: [node] });
			const documentId = createWorkflowDocumentId(workflow.id);
			const documentStore = useWorkflowDocumentStore(documentId);
			documentStore.hydrate(workflow);
			useNDVStore(documentId).setActiveNodeName(node.name, 'other');
			useWorkflowExecutionStateStore(documentId).setWorkflowExecutionData(
				createTestWorkflowExecutionResponse({
					workflowData: workflow,
					data: createRunExecutionData({
						resultData: {
							runData: {
								[node.name]: [
									createTestTaskData({
										data: { main: [[]] },
										...(redactedError ? { redactedError: { type: 'NodeApiError' } } : {}),
									}),
								],
							},
						},
						redactionInfo: {
							isRedacted: true,
							reason: 'credential_inaccessible',
							canReveal: false,
							credentialIds: ['gmail-credential'],
						},
					}),
				}),
			);

			const { getByTestId, queryByTestId } = createComponentRenderer(OutputPanel, {
				pinia,
				props: { runIndex: 0, pushRef: 'pushRef', displayMode: 'schema', isReadOnly: true },
				global: {
					provide: {
						[WorkflowIdKey as symbol]: computed(() => workflow.id),
						[WorkflowDocumentStoreKey as symbol]: shallowRef(documentStore),
					},
				},
			})();

			expect(getByTestId('ndv-data-redacted')).toHaveTextContent(
				i18n.baseText('ndv.redacted.shareCredential.description'),
			);
			expect(getByTestId('ndv-data-redacted')).not.toHaveTextContent(
				i18n.baseText('ndv.redacted.noPermission.description'),
			);
			expect(queryByTestId('redacted-data-share-credential')).not.toBeInTheDocument();
			expect(queryByTestId('ndv-reveal-redacted-data')).not.toBeInTheDocument();
			expect(queryByTestId('ndv-redacted-error') !== null).toBe(redactedError);
		},
	);
});

describe('OutputPanel read-only actions (GOV-117)', () => {
	afterEach(async () => {
		await vi.dynamicImportSettled();
	});

	function renderOutputPanel(isReadOnly: boolean, withPinnedData = false) {
		const pinia = createTestingPinia({ stubActions: false });
		const node = createTestNode({ name: 'Set', type: SET_NODE_TYPE });
		const workflow = createTestWorkflow({
			nodes: [node],
			...(withPinnedData ? { pinData: { [node.name]: [{ json: { name: 'Pinned' } }] } } : {}),
		});
		const documentId = createWorkflowDocumentId(workflow.id);
		const documentStore = useWorkflowDocumentStore(documentId);
		documentStore.hydrate(workflow);
		useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);
		useNDVStore(documentId).setActiveNodeName(node.name, 'other');
		useWorkflowExecutionStateStore(documentId).setWorkflowExecutionData(
			createTestWorkflowExecutionResponse({
				workflowData: workflow,
				data: createRunExecutionData({
					resultData: {
						runData: {
							[node.name]: [createTestTaskData(), createTestTaskData()],
						},
					},
				}),
			}),
		);

		return createComponentRenderer(OutputPanel, {
			pinia,
			props: { runIndex: 0, pushRef: 'pushRef', displayMode: 'schema', isReadOnly },
			global: {
				provide: {
					[WorkflowIdKey as symbol]: computed(() => workflow.id),
					[WorkflowDocumentStoreKey as symbol]: shallowRef(documentStore),
				},
			},
		})();
	}

	it('keeps pin and edit available when the NDV can change the workflow', () => {
		const { getByTestId } = renderOutputPanel(false);

		expect(getByTestId('ndv-edit-pinned-data')).toBeEnabled();
		expect(getByTestId('ndv-pin-data')).toBeEnabled();
		expect(getByTestId('run-selector')).toBeInTheDocument();
	});

	it('hides pin and edit when the NDV is read-only and keeps run browsing', () => {
		const { getByTestId, queryByTestId } = renderOutputPanel(true);

		expect(queryByTestId('ndv-edit-pinned-data')).not.toBeInTheDocument();
		expect(queryByTestId('ndv-pin-data')).not.toBeInTheDocument();
		expect(getByTestId('run-selector')).toBeInTheDocument();
	});

	it('keeps the pinned-data notice and hides unpin when the NDV is read-only', () => {
		const { getByTestId, queryByTestId } = renderOutputPanel(true, true);

		expect(getByTestId('ndv-pinned-data-callout')).toBeInTheDocument();
		expect(queryByTestId('ndv-unpin-data')).not.toBeInTheDocument();
	});

	it('offers unpin when the NDV can change pinned data', () => {
		const { getByTestId } = renderOutputPanel(false, true);

		expect(getByTestId('ndv-unpin-data')).toBeInTheDocument();
	});
});
