import { createUser } from '@/__tests__/data/users';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { createRunExecutionData, NodeConnectionTypes, type RedactionInfo } from 'n8n-workflow';
import { computed, shallowRef } from 'vue';
import InputPanel from './InputPanel.vue';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {}, params: {} }),
	RouterLink: vi.fn(),
}));

const credentialDescription =
	"This execution used a credential you don't have access to, so its data is hidden.";
const noPermissionDescription =
	'Execution data has been redacted. You do not have the permissions to reveal it.';

function renderRedactedExecution(reason: RedactionInfo['reason'], canShareCredential = false) {
	const pinia = createTestingPinia({ stubActions: false });
	mockedStore(useUsersStore).currentUser = createUser({
		globalScopes: canShareCredential ? ['credential:share'] : [],
	});

	const sourceNode = createTestNode({
		name: 'Gmail',
		type: 'n8n-nodes-base.gmail',
		credentials: { gmailOAuth2: { id: 'gmail-credential', name: 'Shared Gmail' } },
	});
	const activeNode = createTestNode({ name: 'Edit Fields' });
	const workflow = createTestWorkflow({
		nodes: [sourceNode, activeNode],
		connections: {
			[sourceNode.name]: {
				[NodeConnectionTypes.Main]: [
					[{ node: activeNode.name, type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
		},
	});
	const documentId = createWorkflowDocumentId(workflow.id);
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	workflowDocumentStore.hydrate(workflow);
	useWorkflowExecutionStateStore(documentId).setWorkflowExecutionData(
		createTestWorkflowExecutionResponse({
			workflowData: workflow,
			status: 'success',
			data: createRunExecutionData({
				resultData: {
					runData: {
						[sourceNode.name]: [createTestTaskData({ data: { main: [[]] } })],
						[activeNode.name]: [createTestTaskData({ data: { main: [[]] } })],
					},
				},
				redactionInfo: {
					isRedacted: true,
					reason,
					canReveal: false,
					credentialIds: reason === 'credential_inaccessible' ? ['gmail-credential'] : undefined,
				},
			}),
		}),
	);

	return createComponentRenderer(InputPanel, {
		pinia,
		props: {
			pushRef: 'pushRef',
			runIndex: 0,
			currentNodeName: sourceNode.name,
			activeNodeName: activeNode.name,
			displayMode: 'schema',
			focusedMappableInput: '',
			isMappingOnboarded: false,
			readOnly: true,
		},
		global: {
			provide: {
				[WorkflowIdKey as symbol]: computed(() => workflow.id),
				[WorkflowDocumentStoreKey as symbol]: shallowRef(workflowDocumentStore),
			},
		},
	})();
}

describe('InputPanel redaction cause', () => {
	afterEach(async () => {
		await vi.dynamicImportSettled();
	});

	// IAM-1832: The credential cause must stay visible without permission to share it.
	it('shows the credential cause without a share link when the viewer cannot share it', () => {
		const { getByTestId, queryByTestId } = renderRedactedExecution('credential_inaccessible');

		expect(queryByTestId('redacted-data-share-credential')).not.toBeInTheDocument();
		expect(queryByTestId('ndv-reveal-redacted-data')).not.toBeInTheDocument();
		expect(getByTestId('ndv-data-redacted')).toHaveTextContent(credentialDescription);
		expect(getByTestId('ndv-data-redacted')).not.toHaveTextContent(noPermissionDescription);
	});

	it('shows the credential cause and share link when the viewer can share it', () => {
		const { getByTestId } = renderRedactedExecution('credential_inaccessible', true);

		expect(getByTestId('ndv-data-redacted')).toHaveTextContent(credentialDescription);
		expect(getByTestId('redacted-data-share-credential')).toHaveTextContent(
			'Give yourself access to Shared Gmail',
		);
		expect(getByTestId('ndv-data-redacted')).not.toHaveTextContent(noPermissionDescription);
	});

	it('keeps the no-permission text for workflow-policy redaction', () => {
		const { getByTestId, queryByTestId } = renderRedactedExecution('workflow_redaction_policy');

		expect(getByTestId('ndv-data-redacted')).toHaveTextContent(noPermissionDescription);
		expect(getByTestId('ndv-data-redacted')).not.toHaveTextContent(credentialDescription);
		expect(queryByTestId('redacted-data-share-credential')).not.toBeInTheDocument();
		expect(queryByTestId('ndv-reveal-redacted-data')).not.toBeInTheDocument();
	});
});
