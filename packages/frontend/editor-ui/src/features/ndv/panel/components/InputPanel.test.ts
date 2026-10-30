import { createTestNode, createTestTaskData, createTestWorkflow } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import InputPanel, { type Props } from './InputPanel.vue';
import { createTestingPinia } from '@pinia/testing';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from '@n8n/stores/users.store';
import { mock } from 'vitest-mock-extended';
import {
	createRunExecutionData,
	NodeConnectionTypes,
	type IConnections,
	type INodeExecutionData,
	type IRunData,
	type RedactionInfo,
} from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { computed, shallowRef } from 'vue';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';

import {
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return { ...actual, injectWorkflowDocumentStore: vi.fn() };
});

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({}),
		useRoute: () => ({ meta: {}, params: {} }),
		RouterLink: vi.fn(),
	};
});

const nodes = [
	createTestNode({ id: 'node1', name: 'Node 1' }),
	createTestNode({ id: 'node2', name: 'Node 2' }),
	createTestNode({ name: 'Agent' }),
	createTestNode({ name: 'Tool' }),
];

const render = (
	props: Partial<Props> = {},
	pinData?: INodeExecutionData[],
	runData?: IRunData,
	redaction?: { info: RedactionInfo; canShareCredential: boolean },
) => {
	const connections: IConnections = {
		[nodes[0].name]: {
			[NodeConnectionTypes.Main]: [
				[{ node: nodes[1].name, type: NodeConnectionTypes.Main, index: 0 }],
			],
		},
		[nodes[1].name]: {
			[NodeConnectionTypes.Main]: [
				[{ node: nodes[2].name, type: NodeConnectionTypes.Main, index: 0 }],
			],
		},
		[nodes[3].name]: {
			[NodeConnectionTypes.AiMemory]: [
				[{ node: nodes[2].name, type: NodeConnectionTypes.AiMemory, index: 0 }],
			],
		},
	};

	const pinia = createTestingPinia({
		stubActions: false,
	});
	setActivePinia(pinia);

	if (redaction) {
		mockedStore(useUsersStore).currentUser = mock<IUser>({
			globalScopes: redaction.canShareCredential ? ['credential:share'] : [],
		});
	}

	const workflow = createTestWorkflow({ nodes, connections });

	const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));
	workflowDocumentStore.hydrate(workflow);

	vi.mocked(injectWorkflowDocumentStore).mockReturnValue(shallowRef(workflowDocumentStore));

	if (pinData) {
		workflowDocumentStore.setPinData(Object.fromEntries(nodes.map((n) => [n.name, pinData])));
	}

	if (runData) {
		// The component reads run data via `injectWorkflowExecutionStateStore()`,
		// which resolves through the execution-state store keyed by the injected
		// workflow document's id.
		useWorkflowExecutionStateStore(createWorkflowDocumentId(workflow.id)).setWorkflowExecutionData({
			id: redaction ? 'redacted-execution' : '',
			workflowData: {
				id: '',
				name: '',
				active: false,
				activeVersionId: null,
				isArchived: false,
				createdAt: '',
				updatedAt: '',
				nodes,
				connections,
				versionId: '',
			},
			finished: false,
			mode: 'trigger',
			status: 'success',
			startedAt: new Date(),
			createdAt: new Date(),
			data: createRunExecutionData({
				resultData: { runData },
				redactionInfo: redaction?.info,
			}),
		});
	}

	return createComponentRenderer(InputPanel, {
		props: {
			pushRef: 'pushRef',
			runIndex: 0,
			currentNodeName: nodes[0].name,
			activeNodeName: nodes[1].name,
			displayMode: 'schema',
			focusedMappableInput: '',
			isMappingOnboarded: false,
		},
		global: {
			provide: {
				[WorkflowIdKey as unknown as string]: computed(() => workflow.id),
				[WorkflowDocumentStoreKey as symbol]: shallowRef(workflowDocumentStore),
			},
			stubs: {
				InputPanelPinButton: { template: '<button data-test-id="ndv-pin-data"></button>' },
			},
		},
	})({ props });
};

describe('InputPanel', () => {
	afterEach(async () => {
		// Tab assertions can finish while the schema view still loads.
		await vi.dynamicImportSettled();
	});

	it('renders the schema view', async () => {
		const { getByTestId, queryByTestId } = render({}, [{ json: { name: 'Test' } }]);

		await vi.dynamicImportSettled();

		expect(queryByTestId('ndv-data-size-warning')).not.toBeInTheDocument();
		expect(getByTestId('ndv-input-panel')).toBeInTheDocument();
		expect(getByTestId('run-data-schema-header')).toHaveTextContent('Variables and context');
		expect(getByTestId('ndv-search')).toBeInTheDocument();
	});

	it("opens mapping tab by default if the node hasn't run yet", async () => {
		const { findByTestId } = render({ activeNodeName: 'Tool' });

		expect(await findByTestId('radio-button-mapping')).toBeChecked();
		expect(await findByTestId('radio-button-debugging')).not.toBeChecked();
	});

	it('opens debugging tab by default if the node has already run', async () => {
		const { findByTestId } = render({ activeNodeName: 'Tool' }, undefined, {
			Tool: [
				{
					startTime: 0,
					executionTime: 0,
					executionIndex: 0,
					source: [],
					data: {},
				},
			],
		});

		expect(await findByTestId('radio-button-mapping')).not.toBeChecked();
		expect(await findByTestId('radio-button-debugging')).toBeChecked();
	});

	// IAM-1832: The redaction cause must remain visible without credential sharing permission.
	it.each<{
		reason: RedactionInfo['reason'];
		canShareCredential: boolean;
		description: string;
	}>([
		{
			reason: 'credential_inaccessible',
			canShareCredential: false,
			description:
				"This execution used a credential you don't have access to, so its data is hidden.",
		},
		{
			reason: 'credential_inaccessible',
			canShareCredential: true,
			description:
				"This execution used a credential you don't have access to, so its data is hidden.",
		},
		{
			reason: 'workflow_redaction_policy',
			canShareCredential: false,
			description:
				'Execution data has been redacted. You do not have the permissions to reveal it.',
		},
	])(
		'shows the cause for $reason with credential sharing permission=$canShareCredential',
		({ reason, canShareCredential, description }) => {
			const { getByTestId, queryByTestId } = render(
				{ displayMode: 'table', readOnly: true },
				undefined,
				{
					[nodes[0].name]: [createTestTaskData()],
					[nodes[1].name]: [createTestTaskData()],
				},
				{
					info: {
						isRedacted: true,
						reason,
						canReveal: false,
						credentialIds: reason === 'credential_inaccessible' ? ['inaccessible-credential'] : [],
					},
					canShareCredential,
				},
			);

			const shareLink = queryByTestId('redacted-data-share-credential');
			if (canShareCredential) {
				expect(shareLink).toHaveTextContent('Give yourself access');
			} else {
				expect(shareLink).not.toBeInTheDocument();
			}
			expect(getByTestId('ndv-data-redacted')).toHaveTextContent(description);
		},
	);
});
