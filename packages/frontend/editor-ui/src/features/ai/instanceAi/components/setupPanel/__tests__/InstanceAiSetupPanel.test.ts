import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import type { InstanceAiSetupItem } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';
import type { SetupPanelRow } from '../../../composables/useSetupPanelState';
import InstanceAiSetupPanel from '../InstanceAiSetupPanel.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const { stateMock, actionsMock, showMessageMock, testCredentialMock } = vi.hoisted(() => ({
	stateMock: {
		rows: [] as SetupPanelRow[],
		nodesByName: {} as Record<string, INodeUi>,
		refreshWorkflow: vi.fn().mockResolvedValue(undefined),
	},
	actionsMock: {
		bindCredential: vi.fn(),
		applyParameterValues: vi.fn(),
		executeWorkflow: vi.fn(),
		flushPendingApplies: vi.fn(),
	},
	showMessageMock: vi.fn(),
	testCredentialMock: vi.fn(),
}));

vi.mock('../../../instanceAi.store', () => ({
	useThread: () => ({ messages: [], setupItemsByWorkflowId: {}, sendMessage: vi.fn() }),
}));

vi.mock('../../../composables/useSetupPanelState', async () => {
	const { computed } = await import('vue');
	return {
		useSetupPanelState: () => ({
			rows: computed(() => stateMock.rows),
			rowSource: computed(() => 'derived'),
			workflowProjectId: computed(() => undefined),
			isAgentBuilding: computed(() => false),
			getNodeByName: (name: string) => stateMock.nodesByName[name],
			refreshWorkflow: stateMock.refreshWorkflow,
		}),
	};
});

vi.mock('../../../composables/useSetupPanelActions', async () => {
	const { computed } = await import('vue');
	return {
		useSetupPanelActions: () => ({ ...actionsMock, pendingApplyCount: computed(() => 0) }),
	};
});

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageMock }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ myProjects: [{ id: 'p1' }], getMyProjects: vi.fn() }),
}));

vi.mock('@/features/credentials/composables/useCredentialTestInBackground', () => ({
	useCredentialTestInBackground: () => ({
		testCredentialInBackground: testCredentialMock,
		isCredentialTypeTestable: () => true,
		hydrateCredentialTestResults: vi.fn(),
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialById: vi.fn(),
		getCredentialTypeByName: (type: string) =>
			type === 'notionApi' ? { displayName: 'Notion API' } : undefined,
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ getNodeType: () => null }),
}));

const credentialItem: InstanceAiSetupItem = {
	id: 'wf1:credential:notionApi',
	kind: 'credential',
	credentialType: 'notionApi',
	nodeBindings: [{ nodeName: 'Notion' }],
};

const parametersItem: InstanceAiSetupItem = {
	id: 'wf1:parameters:Send Slack',
	kind: 'parameters',
	nodeName: 'Send Slack',
	parameterNames: ['channel'],
};

const slackNode = {
	id: 'node-1',
	name: 'Send Slack',
	type: 'n8n-nodes-base.slack',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} as INodeUi;

const renderComponent = createComponentRenderer(InstanceAiSetupPanel, {
	props: { workflowId: 'wf1', projectId: 'p1' },
	global: {
		stubs: {
			InstanceAiSetupPanelDetail: true,
			CredentialIcon: true,
			NodeIcon: true,
		},
	},
});

describe('InstanceAiSetupPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		stateMock.rows = [];
		stateMock.nodesByName = {};
	});

	it('renders nothing when there are no rows', () => {
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('instance-ai-setup-panel')).toBeNull();
	});

	it('renders one row per item with name and done status', () => {
		stateMock.rows = [
			{ item: credentialItem, isDone: true },
			{ item: parametersItem, isDone: false },
		];

		const { getByTestId, getAllByTestId, getByText } = renderComponent();

		expect(getByTestId('instance-ai-setup-panel')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-setup-panel-row')).toHaveLength(2);
		// App name resolves through the credential type's display name.
		expect(getByText('Notion')).toBeInTheDocument();
		expect(getByText('Send Slack')).toBeInTheDocument();

		const doneStatuses = getAllByTestId('instance-ai-setup-panel-row-done');
		expect(doneStatuses).toHaveLength(1);
		expect(doneStatuses[0]).toHaveTextContent('instanceAi.setupPanel.connected');
	});

	it('drills into a row and back without losing the list', async () => {
		stateMock.rows = [{ item: parametersItem, isDone: false }];
		stateMock.nodesByName = { 'Send Slack': slackNode };

		const { getByTestId, getAllByTestId, queryByTestId, queryAllByTestId } = renderComponent();

		await fireEvent.click(getAllByTestId('instance-ai-setup-panel-row')[0]);

		expect(getByTestId('instance-ai-setup-panel-back')).toBeInTheDocument();
		expect(queryAllByTestId('instance-ai-setup-panel-row')).toHaveLength(0);

		await fireEvent.click(getByTestId('instance-ai-setup-panel-back'));

		expect(queryByTestId('instance-ai-setup-panel-back')).toBeNull();
		expect(getAllByTestId('instance-ai-setup-panel-row')).toHaveLength(1);
	});

	it('does not open a detail while the item has no resolvable node', async () => {
		stateMock.rows = [{ item: parametersItem, isDone: false }];

		const { getAllByTestId, queryByTestId } = renderComponent();

		const row = getAllByTestId('instance-ai-setup-panel-row')[0];
		expect(row).toBeDisabled();

		await fireEvent.click(row);

		expect(queryByTestId('instance-ai-setup-panel-back')).toBeNull();
	});
});
