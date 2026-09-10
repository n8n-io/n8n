import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reactive } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import type { InstanceAiSetupItem } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';
import type { SetupPanelRow } from '../../../composables/useSetupPanelState';
import InstanceAiSetupPanel from '../InstanceAiSetupPanel.vue';

vi.mock('../../../composables/useSetupPanelTelemetry', () => ({
	useSetupPanelTelemetry: () => ({
		trackConnectionStarted: vi.fn(),
		trackConnectionCompleted: vi.fn(),
	}),
}));

const {
	actionsMock,
	showMessageMock,
	testCredentialMock,
	oauthMock,
	openCredentialMock,
	credentialsMock,
} = vi.hoisted(() => ({
	oauthMock: {
		isOAuthCredentialType: vi.fn(() => false),
		canOAuthCredentialQuickConnect: vi.fn(() => false),
		createAndAuthorize: vi.fn(),
		cancelAuthorize: vi.fn(),
	},
	openCredentialMock: vi.fn(),
	credentialsMock: {
		getCredentialById: vi.fn(),
		getUsableCredentialByType: vi.fn<() => Array<{ id: string; name: string }>>(() => []),
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

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => oauthMock,
}));
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openNewCredential: openCredentialMock }),
}));

const stateMock = reactive({
	rows: [] as SetupPanelRow[],
	nodesByName: {} as Record<string, INodeUi>,
	credentialsAvailable: true,
	refreshWorkflow: vi.fn().mockResolvedValue(undefined),
});

vi.mock('../../../instanceAi.store', () => ({
	useThread: () => ({
		id: 'thread-1',
		messages: [],
		setupItemsByWorkflowId: {},
		sendMessage: vi.fn(),
	}),
}));

vi.mock('../../../composables/useSetupPanelState', async () => {
	const { computed } = await import('vue');
	return {
		useSetupPanelState: () => ({
			rows: computed(() => stateMock.rows),
			rowSource: computed(() => 'derived'),
			credentialsAvailable: computed(() => stateMock.credentialsAvailable),
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
		...credentialsMock,
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
			InstanceAiSetupCredential: true,
			CredentialIcon: true,
			NodeIcon: true,
		},
	},
});

describe('InstanceAiSetupPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		localStorage.clear();
		stateMock.credentialsAvailable = true;
		stateMock.rows = [];
		stateMock.nodesByName = {};
		oauthMock.isOAuthCredentialType.mockReturnValue(false);
		oauthMock.canOAuthCredentialQuickConnect.mockReturnValue(false);
		credentialsMock.getUsableCredentialByType.mockReturnValue([]);
	});

	it('renders nothing when there are no rows', () => {
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('instance-ai-setup-panel')).toBeNull();
	});

	it('hides pre-existing connections and keeps unrelated parameters in Details', () => {
		stateMock.rows = [
			{ item: credentialItem, isDone: true },
			{ item: parametersItem, isDone: false },
		];
		const { getAllByTestId, queryByText, getByText } = renderComponent();
		expect(getAllByTestId('setup-panel-row')).toHaveLength(1);
		expect(queryByText('Notion')).toBeNull();
		expect(getByText('Details')).toBeVisible();
	});

	it('waits for fresh credentials before recording pending visibility', async () => {
		stateMock.credentialsAvailable = false;
		stateMock.rows = [{ item: credentialItem, isDone: false }];
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('instance-ai-setup-panel')).toBeNull();
		stateMock.rows = [{ item: credentialItem, isDone: true }];
		stateMock.credentialsAvailable = true;
		await Promise.resolve();
		expect(queryByTestId('instance-ai-setup-panel')).toBeNull();
	});

	it('keeps a newly completed service visible after remount and removes obsolete requirements', async () => {
		stateMock.rows = [{ item: credentialItem, isDone: false }];
		const first = renderComponent();
		expect(first.getByRole('button', { name: /Notion/ })).toBeVisible();
		stateMock.rows = [{ item: credentialItem, isDone: true }];
		await Promise.resolve();
		first.unmount();
		const second = renderComponent();
		expect(second.getByRole('button', { name: 'Notion Complete' })).toBeVisible();
		stateMock.rows = [{ item: parametersItem, isDone: false }];
		await Promise.resolve();
		expect(second.queryByText('Notion')).toBeNull();
		expect(second.getByText('Details')).toBeVisible();
	});

	it('can open an early credential without a node once its project and type are ready', async () => {
		stateMock.rows = [{ item: { ...credentialItem, nodeBindings: [] }, isDone: false }];
		const { getByRole, getByTestId } = renderComponent();
		await fireEvent.click(getByRole('button', { name: /Notion/ }));
		expect(getByTestId('setup-panel-back')).toBeVisible();
	});

	it('opens an overlay and keeps the checklist in place beneath it', async () => {
		stateMock.rows = [{ item: parametersItem, isDone: false }];
		stateMock.nodesByName = { 'Send Slack': slackNode };

		const { getByTestId, getAllByTestId, queryByTestId, queryAllByTestId } = renderComponent();

		await fireEvent.click(getAllByTestId('setup-panel-row')[0]);

		expect(getByTestId('setup-panel-back')).toBeInTheDocument();
		expect(queryAllByTestId('setup-panel-row')).toHaveLength(1);
		expect(getAllByTestId('setup-panel-row')[0].closest('ul')).toHaveAttribute('inert');

		await fireEvent.click(getByTestId('setup-panel-back'));

		expect(queryByTestId('setup-panel-back')).toBeNull();
		expect(getAllByTestId('setup-panel-row')).toHaveLength(1);
	});

	it('connects managed OAuth directly from the row and keeps cancellation pending', async () => {
		oauthMock.isOAuthCredentialType.mockReturnValue(true);
		oauthMock.canOAuthCredentialQuickConnect.mockReturnValue(true);
		stateMock.rows = [{ item: credentialItem, isDone: false }];
		oauthMock.createAndAuthorize
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ id: 'cred-1' });
		credentialsMock.getCredentialById.mockReturnValue({ id: 'cred-1', name: 'Account' });
		actionsMock.bindCredential.mockResolvedValue('applied');
		const { getByRole, queryByRole } = renderComponent();
		await userEvent.click(getByRole('button', { name: 'Connect' }));
		expect(oauthMock.createAndAuthorize).toHaveBeenCalledWith('notionApi', undefined, {
			projectId: 'p1',
			workflowId: 'wf1',
		});
		expect(actionsMock.bindCredential).not.toHaveBeenCalled();
		expect(queryByRole('dialog')).toBeNull();
		await userEvent.click(getByRole('button', { name: 'Connect' }));
		await waitFor(() =>
			expect(actionsMock.bindCredential).toHaveBeenCalledWith(credentialItem, {
				id: 'cred-1',
				name: 'Account',
			}),
		);
	});

	it('opens the credential picker instead of a direct OAuth action when an account is available', async () => {
		oauthMock.isOAuthCredentialType.mockReturnValue(true);
		oauthMock.canOAuthCredentialQuickConnect.mockReturnValue(true);
		credentialsMock.getUsableCredentialByType.mockReturnValue([{ id: 'cred-1', name: 'Account' }]);
		stateMock.rows = [{ item: credentialItem, isDone: false }];
		const { getByRole, queryByRole } = renderComponent();
		expect(queryByRole('button', { name: 'Connect' })).toBeNull();
		await userEvent.click(getByRole('button', { name: /Notion/ }));
		expect(getByRole('dialog', { name: 'Notion' })).toBeVisible();
		expect(oauthMock.createAndAuthorize).not.toHaveBeenCalled();
	});

	it('opens Advanced setup from the row with workflow context', async () => {
		oauthMock.isOAuthCredentialType.mockReturnValue(true);
		oauthMock.canOAuthCredentialQuickConnect.mockReturnValue(true);
		stateMock.rows = [{ item: credentialItem, isDone: false }];
		const { getByRole } = renderComponent();
		await userEvent.click(getByRole('button', { name: 'More options' }));
		await userEvent.click(getByRole('menuitem', { name: 'Advanced setup' }));
		expect(openCredentialMock).toHaveBeenCalledWith(
			'notionApi',
			false,
			true,
			'p1',
			undefined,
			undefined,
			undefined,
			expect.objectContaining({ workflowId: 'wf1', closeOnSave: true }),
		);
	});

	it('does not bind a pending row connection after switching workflows', async () => {
		oauthMock.isOAuthCredentialType.mockReturnValue(true);
		oauthMock.canOAuthCredentialQuickConnect.mockReturnValue(true);
		stateMock.rows = [{ item: credentialItem, isDone: false }];
		let finish: (value: { id: string }) => void = () => {};
		oauthMock.createAndAuthorize.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const { getByRole, rerender } = renderComponent();
		await userEvent.click(getByRole('button', { name: 'Connect' }));
		await rerender({ workflowId: 'wf2' });
		finish({ id: 'cred-1' });
		await flushPromises();
		expect(actionsMock.bindCredential).not.toHaveBeenCalled();
		expect(oauthMock.cancelAuthorize).toHaveBeenCalled();
	});

	it('does not open a detail while the item has no resolvable node', async () => {
		stateMock.rows = [{ item: parametersItem, isDone: false }];

		const { getAllByTestId, queryByTestId } = renderComponent();

		const row = getAllByTestId('setup-panel-row')[0];
		expect(row).toBeDisabled();

		await fireEvent.click(row);

		expect(queryByTestId('setup-panel-back')).toBeNull();
	});
});
