import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, reactive, ref } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import type { InstanceAiMessage, InstanceAiSetupItem } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import type { INodeUi } from '@/Interface';
import type { SetupPanelRow } from '../../../composables/useSetupPanelState';
import InstanceAiSetupPanel from '../InstanceAiSetupPanel.vue';
import ResourceLocatorDropdown from '@/features/ndv/parameters/components/ResourceLocator/ResourceLocatorDropdown.vue';

// The shared popover mock renders inline and cannot verify the portal boundary.
vi.unmock('reka-ui');

vi.mock('../../../composables/useSetupPanelTelemetry', () => ({
	useSetupPanelTelemetry: () => ({
		trackConnectionStarted: vi.fn(),
		trackConnectionCompleted: vi.fn(),
		trackDismissed: vi.fn(),
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
		getPendingCredential: vi.fn(),
		getPendingParameterChanges: vi.fn(() => []),
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
	isAgentBuilding: false,
	isApplying: false,
	pendingApplyCount: 0,
	refreshWorkflow: vi.fn().mockResolvedValue(undefined),
});

const threadMock = reactive({
	id: 'thread-1',
	messages: [] as InstanceAiMessage[],
	isStreaming: false,
	isSendingMessage: false,
	isAwaitingConfirmation: false,
	setupItemsByWorkflowId: {},
	sendMessage: vi.fn(),
});
vi.mock('../../../instanceAi.store', () => ({ useThread: () => threadMock }));

vi.mock('../../../composables/useSetupPanelState', async () => {
	const { computed } = await import('vue');
	return {
		useSetupPanelState: () => ({
			rows: computed(() => stateMock.rows),
			rowSource: computed(() => 'derived'),
			credentialsAvailable: computed(() => stateMock.credentialsAvailable),
			isRefreshingWorkflow: computed(() => false),
			workflowProjectId: computed(() => undefined),
			isAgentBuilding: computed(() => stateMock.isAgentBuilding),
			getNodeByName: (name: string) => stateMock.nodesByName[name],
			refreshWorkflow: stateMock.refreshWorkflow,
		}),
	};
});

vi.mock('../../../composables/useSetupPanelExecution', () => ({
	useSetupPanelExecution: () => ({ executeWorkflow: actionsMock.executeWorkflow }),
}));

vi.mock('../../../composables/useSetupPanelActions', async () => {
	const { computed } = await import('vue');
	return {
		useSetupPanelActions: () => ({
			...actionsMock,
			isApplying: computed(() => stateMock.isApplying),
			pendingApplyCount: computed(() => stateMock.pendingApplyCount),
		}),
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
	it.each(['select', 'dismiss'] as const)(
		'opens resource menus outside the setup panel: %s',
		async (action) => {
			stateMock.rows = [{ item: parametersItem, isDone: false }];
			stateMock.nodesByName = { 'Send Slack': slackNode };
			const selected = vi.fn();
			const view = renderComponent({
				global: {
					stubs: {
						InstanceAiSetupPanelDetail: {
							components: { ResourceLocatorDropdown },
							setup: () => ({
								selected,
								open: ref(true),
								resources: [{ name: 'Example spreadsheet', value: 'sheet-1' }],
							}),
							template:
								'<ResourceLocatorDropdown v-model:show="open" filterable :resources="resources" @update:model-value="selected"><button>Document</button></ResourceLocatorDropdown>',
						},
					},
				},
			});
			await userEvent.click(view.getByRole('button', { name: /Details/ }));
			const option = await view.findByText('Example spreadsheet');
			expect(view.container.contains(option)).toBe(false);
			if (action === 'select') {
				await userEvent.click(option);
				expect(selected).toHaveBeenCalledWith('sheet-1');
			} else {
				await userEvent.click(view.getByPlaceholderText('Search...'));
				await userEvent.keyboard('{Escape}');
				await waitFor(() =>
					expect(view.queryByText('Example spreadsheet')).not.toBeInTheDocument(),
				);
				expect(view.getByRole('button', { name: 'Back to setup checklist' })).toBeVisible();
			}
		},
	);

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		localStorage.clear();
		stateMock.credentialsAvailable = true;
		stateMock.rows = [];
		stateMock.isAgentBuilding = false;
		stateMock.isApplying = false;
		stateMock.pendingApplyCount = 0;
		threadMock.messages = [];
		threadMock.isStreaming = false;
		threadMock.isSendingMessage = false;
		threadMock.isAwaitingConfirmation = false;
		actionsMock.executeWorkflow.mockResolvedValue({
			workflowId: 'wf1',
			executionId: 'execution-1',
			status: 'success',
			notified: true,
		});
		stateMock.nodesByName = {};
		oauthMock.isOAuthCredentialType.mockReturnValue(false);
		oauthMock.canOAuthCredentialQuickConnect.mockReturnValue(false);
		credentialsMock.getUsableCredentialByType.mockReturnValue([]);
	});

	async function completeSetup() {
		stateMock.rows = [{ item: credentialItem, isDone: false }];
		const view = renderComponent();
		stateMock.rows = [{ item: credentialItem, isDone: true }];
		await flushPromises();
		return view;
	}

	it('waits for queued and active saves before offering Execute', async () => {
		stateMock.pendingApplyCount = 1;
		const view = await completeSetup();
		expect(view.getByRole('status')).toHaveTextContent('Validating');
		stateMock.pendingApplyCount = 0;
		stateMock.isApplying = true;
		await flushPromises();
		expect(view.queryByRole('button', { name: 'Execute' })).toBeNull();
		stateMock.isApplying = false;
		await flushPromises();
		expect(view.getByRole('button', { name: 'Execute' })).toBeEnabled();
		threadMock.isStreaming = true;
		await flushPromises();
		expect(view.getByRole('button', { name: 'Execute' })).toBeDisabled();
	});

	it('keeps the checklist open when the current requirements finish during a build', async () => {
		stateMock.isAgentBuilding = true;
		const view = await completeSetup();
		expect(view.getByRole('button', { name: 'Notion Complete' })).toBeVisible();
		expect(view.queryByRole('button', { name: 'Execute' })).toBeNull();
		stateMock.isAgentBuilding = false;
		await flushPromises();
		expect(view.getByRole('button', { name: 'Execute' })).toBeEnabled();
	});

	it.each(['success', 'error', 'canceled'] as const)(
		'waits for the execution and notification, then stays dismissed until setup is needed: %s',
		async (status) => {
			const view = await completeSetup();
			const result = Promise.withResolvers<{
				workflowId: string;
				executionId: string;
				status: string;
				notified: boolean;
			}>();
			actionsMock.executeWorkflow.mockReturnValueOnce(result.promise);
			const execute = view.getByRole('button', { name: 'Execute' });
			await fireEvent.click(execute);
			await fireEvent.click(execute);
			expect(actionsMock.executeWorkflow).toHaveBeenCalledOnce();
			expect(view.getByRole('status')).toHaveTextContent('Executing');
			// The agent can already be reviewing the result when notification returns.
			threadMock.isStreaming = true;
			result.resolve({
				workflowId: 'wf1',
				executionId: 'execution-1',
				status,
				notified: true,
			});
			await flushPromises();
			expect(view.queryByTestId('instance-ai-setup-panel')).toBeNull();
			view.unmount();
			const restored = renderComponent();
			await flushPromises();
			expect(restored.queryByTestId('instance-ai-setup-panel')).toBeNull();
			stateMock.rows = [];
			await flushPromises();
			stateMock.rows = [
				{ item: credentialItem, isDone: true },
				{ item: parametersItem, isDone: true },
			];
			await flushPromises();
			expect(restored.queryByTestId('instance-ai-setup-panel')).toBeNull();
			stateMock.rows[1].isDone = false;
			await flushPromises();
			expect(restored.getByTestId('instance-ai-setup-panel')).toBeVisible();
		},
	);

	it.each([
		{ status: 'error', notified: false },
		{ status: 'canceled', notified: false },
		{ status: 'success', notified: false },
	])('keeps setup available after $status, notified: $notified', async (result) => {
		const view = await completeSetup();
		actionsMock.executeWorkflow.mockResolvedValueOnce({
			workflowId: 'wf1',
			executionId: 'execution-1',
			...result,
		});
		await userEvent.click(view.getByRole('button', { name: 'Execute' }));
		await flushPromises();
		expect(view.getByRole('button', { name: 'Execute' })).toBeEnabled();
	});

	it('allows retry when no execution was started', async () => {
		const view = await completeSetup();
		actionsMock.executeWorkflow.mockResolvedValueOnce(undefined);
		await userEvent.click(view.getByRole('button', { name: 'Execute' }));
		expect(view.getByRole('button', { name: 'Execute' })).toBeEnabled();
	});

	it('keeps new requirements visible after a successful execution', async () => {
		const view = await completeSetup();
		actionsMock.executeWorkflow.mockImplementationOnce(async () => {
			stateMock.rows.push({ item: parametersItem, isDone: false });
			return { workflowId: 'wf1', executionId: 'execution-1', status: 'success', notified: true };
		});
		await userEvent.click(view.getByRole('button', { name: 'Execute' }));
		await flushPromises();
		expect(view.getByRole('button', { name: /Details/ })).toBeVisible();
		expect(view.queryByRole('button', { name: 'Execute' })).toBeNull();
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
		await userEvent.click(second.getByRole('button', { name: 'Setup complete' }));
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

	it.each([
		{ parameters: 'none', result: 'applied', draft: false, closes: true },
		{ parameters: 'none', result: 'queued', draft: false, closes: true },
		{ parameters: 'pending', result: 'applied', draft: false, closes: false },
		{ parameters: 'done', result: 'applied', draft: false, closes: true },
		{ parameters: 'none', result: 'error', draft: false, closes: false },
		{ parameters: 'none', result: 'applied', draft: true, closes: false },
	])(
		'returns from OAuth setup only when ready: $parameters, $result, draft=$draft',
		async ({ parameters, result, draft, closes }) => {
			oauthMock.isOAuthCredentialType.mockReturnValue(true);
			stateMock.rows = [
				{ item: credentialItem, isDone: false },
				{ item: parametersItem, isDone: false },
			];
			if (parameters !== 'none')
				stateMock.rows.push({
					item: {
						id: 'wf1:parameters:Notion',
						kind: 'parameters',
						nodeName: 'Notion',
						parameterNames: ['channel'],
					},
					isDone: parameters === 'done',
				});
			stateMock.nodesByName = { Notion: { ...slackNode, name: 'Notion' }, 'Send Slack': slackNode };
			credentialsMock.getCredentialById.mockReturnValue({ id: 'cred-1', name: 'Account' });
			actionsMock.bindCredential.mockImplementationOnce(async () => {
				if (result !== 'error') stateMock.rows[0].isDone = true;
				return result;
			});
			const view = renderComponent({
				global: {
					stubs: {
						InstanceAiSetupPanelDetail: true,
						CredentialIcon: true,
						NodeIcon: true,
						InstanceAiSetupCredential: defineComponent({
							emits: ['bindCredential', 'update:hasChanges'],
							setup(_, { emit }) {
								return () =>
									h(
										'button',
										{
											onClick: () => {
												emit('update:hasChanges', draft);
												emit('bindCredential', credentialItem, 'cred-1');
											},
										},
										'Finish OAuth',
									);
							},
						}),
					},
				},
			});
			await userEvent.click(view.getByRole('button', { name: /Notion/ }));
			await userEvent.click(view.getByRole('button', { name: 'Finish OAuth' }));
			await flushPromises();
			if (closes) {
				expect(view.queryByRole('dialog')).toBeNull();
				expect(view.getByRole('button', { name: 'Notion Complete' })).toBeVisible();
			} else {
				expect(view.getByRole('dialog', { name: 'Notion' })).toBeVisible();
			}
		},
	);

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
