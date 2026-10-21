/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ChatIntegrationDescriptor } from '@n8n/api-types';

/**
 * `ChannelSetupCard` owns the body + orchestration for the `configure_channel`
 * builder tool — see `InstanceAiChannelSetup.vue`'s own tests for how it maps
 * the `resolve` event emitted here onto its own transport.
 */
const mocks = vi.hoisted(() => {
	const slackIntegration = {
		type: 'slack',
		label: 'Slack',
		icon: 'slack',
		credentialTypes: ['slackOAuth2Api'],
	};
	const linearIntegration = {
		type: 'linear',
		label: 'Linear',
		icon: 'linear',
		credentialTypes: ['linearOAuth2Api'],
	};
	const teamsIntegration = {
		type: 'teams',
		label: 'Microsoft Teams',
		icon: 'teams',
		credentialTypes: ['microsoftEntraOAuth2Api'],
	};
	return {
		slackIntegration,
		linearIntegration,
		teamsIntegration,
		teamsKeepOpenAfterConnect: false,
		connectedCredentials: {} as Record<string, string>,
		ensureLoaded: vi.fn(),
		reloadCatalog: vi.fn(),
		setCatalog: vi.fn<(integrations: ChatIntegrationDescriptor[]) => void>(),
		fetchStatus: vi.fn(),
		connect: vi.fn(),
		disconnect: vi.fn(),
		isConnected: vi.fn(),
		isConfigured: vi.fn(),
		getAgent: vi.fn(),
		createSlackAgentApp: vi.fn(),
		createSlackManagerCredential: vi.fn(),
		finalizeSlackManagerCredential: vi.fn(),
		getSlackManagedSetup: vi.fn(),
		installSlackManagedApp: vi.fn(),
		authorizeNewCredential: vi.fn(),
		fetchCredentials: vi.fn(),
		showMessage: vi.fn(),
		showError: vi.fn(),
	};
});

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mocks.showMessage, showError: mocks.showError }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	getResourcePermissions: () => ({
		credential: { create: true, read: true, update: true, delete: true, share: true, move: true },
	}),
}));

vi.mock('@/features/agents/composables/useAgentIntegrationsCatalog', () => {
	const catalog = ref<ChatIntegrationDescriptor[]>([
		mocks.slackIntegration,
		mocks.linearIntegration,
	]);
	mocks.setCatalog.mockImplementation((integrations) => {
		catalog.value = integrations;
	});
	return {
		useAgentIntegrationsCatalog: () => ({
			catalog,
			ensureLoaded: mocks.ensureLoaded,
			reload: mocks.reloadCatalog,
		}),
	};
});

vi.mock('@/features/agents/composables/useAgentIntegrationStatus', () => ({
	useAgentIntegrationStatus: () => ({
		connectedCredentials: ref(mocks.connectedCredentials),
		integrationSettings: ref({}),
		integrationApproval: ref({}),
		loadingMap: ref<Record<string, boolean>>({}),
		errorMessages: ref<Record<string, string>>({}),
		errorIsConflict: ref<Record<string, boolean>>({}),
		fetchStatus: mocks.fetchStatus,
		connect: mocks.connect,
		disconnect: mocks.disconnect,
		isConnected: mocks.isConnected,
		isConfigured: mocks.isConfigured,
	}),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getAgent: mocks.getAgent,
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		setCredentials: vi.fn(),
		fetchUsableCredentials: mocks.fetchCredentials,
		deleteCredential: vi.fn(),
	}),
}));

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		authorize: vi.fn(),
		authorizeNewCredential: mocks.authorizeNewCredential,
	}),
}));

vi.mock('@/features/agents/channels/slack/api', () => ({
	createSlackAgentApp: mocks.createSlackAgentApp,
	createSlackManagerCredential: mocks.createSlackManagerCredential,
	finalizeSlackManagerCredential: mocks.finalizeSlackManagerCredential,
	getSlackManagedSetup: mocks.getSlackManagedSetup,
	installSlackManagedApp: mocks.installSlackManagedApp,
}));

vi.mock('@/features/agents/components/AgentChannelSlackSetup.vue', () => ({
	default: {
		props: ['modelValue', 'setupMode', 'setupSlackApp', 'connected'],
		emits: ['update:modelValue', 'connect'],
		// `setupSlackApp` can reject (e.g. popup blocked) — mirror the real
		// component catching that itself, so the test doesn't see an unhandled
		// rejection when asserting the resulting no-op.
		setup(props: { setupSlackApp?: (appConfigurationToken: string) => Promise<boolean> }) {
			async function runSlackAppSetup() {
				try {
					await props.setupSlackApp?.('app-token');
				} catch {
					// swallowed, matching the real AgentChannelSlackSetup component
				}
			}
			return { runSlackAppSetup };
		},
		template: `
			<div
				data-testid="mock-slack-setup"
				:data-setup-mode="setupMode"
				:data-connected="connected"
			>
				<button
					data-testid="mock-slack-connect"
					@click="$emit('update:modelValue', 'cred-1'); $emit('connect')"
				>Connect</button>
				<button
					data-testid="mock-slack-connect-twice"
					@click="$emit('update:modelValue', 'cred-1'); $emit('connect'); $emit('connect')"
				>Connect Twice</button>
				<button
					data-testid="mock-slack-app-setup"
					@click="runSlackAppSetup"
				>Install Slack app</button>
			</div>
		`,
	},
}));

vi.mock('@/features/agents/components/AgentChannelSlackManagedSetup.vue', () => ({
	default: {
		props: ['setup', 'connectManager', 'installApp'],
		setup(props: {
			connectManager?: (credentialId?: string) => Promise<boolean>;
			installApp?: (managerCredentialId: string, workspaceId: string) => Promise<boolean>;
		}) {
			async function connectManager() {
				await props.connectManager?.();
			}
			async function install() {
				await props.installApp?.('manager-credential', 'T123');
			}
			return { connectManager, install };
		},
		template: `<div data-testid="mock-slack-managed-setup">
			<button data-testid="mock-slack-manager-connect" @click="connectManager">Connect manager</button>
			<button data-testid="mock-slack-managed-install" @click="install">Install</button>
		</div>`,
	},
}));

vi.mock('@/features/agents/channels/teams/api', async (importOriginal) => ({
	...(await importOriginal()),
	getTeamsManagedSetup: vi
		.fn()
		.mockResolvedValue({ managedSetupAvailable: true, managerCredentials: [] }),
}));

vi.mock('@/features/agents/channels/teams/AgentChannelTeamsSetupKindSelector.vue', () => ({
	default: { template: '<div data-testid="mock-teams-setup-kind" />' },
}));

vi.mock('@/features/agents/channels/teams/AgentChannelTeamsSetupView.vue', async () => {
	const { inject } = await import('vue');
	const { AGENT_PERSONALISATION_KEY } = await import(
		'@/features/agents/channels/agentPersonalisation'
	);
	return {
		default: {
			props: ['modelValue', 'savedCredentialId'],
			emits: ['update:modelValue', 'persist', 'done', 'connect', 'restart'],
			setup(
				_: unknown,
				{
					emit,
					expose,
				}: {
					emit: (...args: unknown[]) => void;
					expose: (exposed: Record<string, unknown>) => void;
				},
			) {
				const canFinish = ref(false);
				expose({
					canFinish,
					get keepOpenAfterConnect() {
						return mocks.teamsKeepOpenAfterConnect;
					},
				});
				function provision() {
					emit('update:modelValue', 'teams-cred');
					emit('persist');
					canFinish.value = true;
				}
				function download() {
					emit('update:modelValue', 'teams-cred');
					emit('connect');
				}
				const personalisation = inject(AGENT_PERSONALISATION_KEY, null);
				return { provision, download, finish: () => emit('done'), personalisation };
			},
			template: `<div
				data-testid="mock-teams-setup"
				:data-icon="personalisation?.icon"
				:data-gradient-from="personalisation?.gradient.from"
			>
			<button data-testid="mock-teams-provision" @click="provision">Provision</button>
			<button data-testid="mock-teams-download" @click="download">Download</button>
			<button data-testid="mock-teams-done" @click="finish">Done</button>
			<button data-testid="mock-teams-restart" @click="$emit('restart', { credentialId: '' })">Set up again</button>
			<span data-testid="mock-teams-credential">{{ modelValue }}</span>
			<span data-testid="mock-teams-saved-credential">{{ savedCredentialId }}</span>
		</div>`,
		},
	};
});

vi.mock('@/features/agents/channels/linear/AgentChannelLinearSetup.vue', () => ({
	default: {
		props: ['connectedDescription'],
		template:
			'<div data-testid="mock-linear-setup" :data-connected-description="connectedDescription" />',
	},
}));

import { agentsEventBus } from '@/features/agents/agents.eventBus';

import ChannelSetupCard from './ChannelSetupCard.vue';

const defaultProps = {
	integrationType: 'slack',
	agentId: 'agent-1',
	projectId: 'project-1',
};

function mountCard(props: Record<string, unknown> = {}) {
	return mount(ChannelSetupCard, {
		props: { ...defaultProps, ...props },
		global: {
			stubs: {
				N8nButton: {
					template:
						'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot/></button>',
					props: ['disabled'],
				},
				N8nIcon: { template: '<i />', props: ['icon', 'size', 'color'] },
				N8nLoading: {
					template: '<div v-bind="$attrs" />',
					props: ['loading', 'rows'],
				},
				N8nText: { template: '<span><slot/></span>', props: ['size', 'bold', 'color', 'tag'] },
			},
		},
	});
}

describe('ChannelSetupCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		mocks.setCatalog([mocks.slackIntegration, mocks.linearIntegration]);
		mocks.ensureLoaded.mockResolvedValue([mocks.slackIntegration, mocks.linearIntegration]);
		mocks.reloadCatalog.mockResolvedValue([mocks.slackIntegration, mocks.linearIntegration]);
		mocks.fetchStatus.mockResolvedValue(undefined);
		mocks.connect.mockResolvedValue({ status: 'connected' });
		mocks.disconnect.mockResolvedValue({});
		mocks.isConnected.mockReturnValue(false);
		mocks.teamsKeepOpenAfterConnect = false;
		mocks.connectedCredentials = {};
		mocks.isConfigured.mockReturnValue(false);
		mocks.getAgent.mockResolvedValue({ name: 'Agent', id: 'agent-1' });
		mocks.createSlackAgentApp.mockResolvedValue({ installUrl: 'https://slack.com/oauth/install' });
		mocks.createSlackManagerCredential.mockResolvedValue({
			id: 'manager-credential',
			name: 'Slack manager',
			type: 'slackManagerOAuth2Api',
			isResolvable: false,
		});
		mocks.fetchCredentials.mockResolvedValue([
			{
				id: 'manager-credential',
				name: 'Slack manager',
				type: 'slackManagerOAuth2Api',
			},
		]);
		mocks.authorizeNewCredential.mockResolvedValue(true);
		mocks.finalizeSlackManagerCredential.mockResolvedValue(undefined);
		mocks.getSlackManagedSetup.mockResolvedValue({
			managedSetupAvailable: false,
			managerCredentials: [],
		});
		mocks.installSlackManagedApp.mockResolvedValue({
			status: 'connected',
			appId: 'A123',
			credentialId: 'slack-credential',
		});
	});

	it('renders the setup UI for the requested integration type', async () => {
		const wrapper = mountCard();
		await flushPromises();

		expect(wrapper.find('[data-testid="mock-slack-setup"]').attributes('data-setup-mode')).toBe(
			'simple',
		);
	});

	it('renders a loading skeleton until managed Slack setup availability is known', async () => {
		let resolveManagedSetup: (value: {
			managedSetupAvailable: boolean;
			managerCredentials: [];
		}) => void = () => {};
		mocks.getSlackManagedSetup.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveManagedSetup = resolve;
			}),
		);
		const wrapper = mountCard();
		await flushPromises();

		expect(wrapper.find('[data-testid="channel-setup-catalog-loading"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="mock-slack-setup"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="mock-slack-managed-setup"]').exists()).toBe(false);

		resolveManagedSetup({ managedSetupAvailable: false, managerCredentials: [] });
		await flushPromises();

		expect(wrapper.find('[data-testid="channel-setup-catalog-loading"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="mock-slack-setup"]').exists()).toBe(true);
	});

	it('shows no setup choice for Slack', async () => {
		mocks.getSlackManagedSetup.mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [],
		});
		const wrapper = mountCard();
		await flushPromises();

		expect(wrapper.find('[data-testid="mock-slack-managed-setup"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="slack-setup-kind-selector"]').exists()).toBe(false);
	});

	it('does not describe a configured draft integration as connected', async () => {
		mocks.isConfigured.mockReturnValue(true);
		const wrapper = mountCard({ integrationType: 'linear' });
		await flushPromises();

		expect(
			wrapper.get('[data-testid="mock-linear-setup"]').attributes('data-connected-description'),
		).toBe('');
	});

	it('emits resolve({ approved: true }) after the channel connects', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="mock-slack-connect"]').trigger('click');
		await flushPromises();

		expect(mocks.connect).toHaveBeenCalledWith('slack', 'cred-1', undefined, {});
		expect(wrapper.emitted('resolve')).toEqual([[{ approved: true }]]);
	});

	it('uses managed Slack setup and resolves after the app installs', async () => {
		mocks.getSlackManagedSetup.mockResolvedValueOnce({
			managedSetupAvailable: true,
			managerCredentials: [
				{
					id: 'manager-credential',
					name: 'Slack manager',
					connected: true,
					reconnectRequired: false,
					workspaces: [{ id: 'T123', name: 'Workspace', connected: false }],
				},
			],
		});
		const wrapper = mountCard();
		await flushPromises();

		expect(wrapper.find('[data-testid="mock-slack-managed-setup"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="mock-slack-setup"]').exists()).toBe(false);

		await wrapper.find('[data-testid="mock-slack-managed-install"]').trigger('click');
		await flushPromises();

		expect(mocks.installSlackManagedApp).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agent-1',
			'manager-credential',
			'T123',
		);
		expect(wrapper.emitted('resolve')).toEqual([[{ approved: true }]]);
	});

	it('keeps skip disabled while managed Slack authorization is in flight', async () => {
		let resolveAuthorization: (connected: boolean) => void = () => {};
		mocks.authorizeNewCredential.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveAuthorization = resolve;
			}),
		);
		mocks.getSlackManagedSetup.mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [],
		});
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.get('[data-testid="mock-slack-manager-connect"]').trigger('click');
		await flushPromises();

		const skipButton = wrapper.get('[data-testid="channel-setup-card-skip"]');
		expect(skipButton.attributes('disabled')).toBeDefined();
		await skipButton.trigger('click');
		expect(wrapper.emitted('resolve')).toBeUndefined();

		resolveAuthorization(true);
		await flushPromises();

		expect(skipButton.attributes('disabled')).toBeUndefined();
	});

	it('keeps skip disabled while managed Slack installation is in flight', async () => {
		let resolveInstall: (result: {
			status: 'connected';
			appId: string;
			credentialId: string;
		}) => void = () => {};
		mocks.installSlackManagedApp.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveInstall = resolve;
			}),
		);
		mocks.getSlackManagedSetup.mockResolvedValue({
			managedSetupAvailable: true,
			managerCredentials: [
				{
					id: 'manager-credential',
					name: 'Slack manager',
					connected: true,
					reconnectRequired: false,
					workspaces: [{ id: 'T123', name: 'Workspace', connected: false }],
				},
			],
		});
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.get('[data-testid="mock-slack-managed-install"]').trigger('click');
		await flushPromises();

		const skipButton = wrapper.get('[data-testid="channel-setup-card-skip"]');
		expect(skipButton.attributes('disabled')).toBeDefined();
		await skipButton.trigger('click');
		expect(wrapper.emitted('resolve')).toBeUndefined();

		resolveInstall({
			status: 'connected',
			appId: 'A123',
			credentialId: 'slack-credential',
		});
		await flushPromises();

		expect(wrapper.emitted('resolve')).toEqual([[{ approved: true }]]);
	});

	it('notifies agent surfaces on the event bus after a successful connect', async () => {
		const onAgentUpdated = vi.fn();
		agentsEventBus.on('agentUpdated', onAgentUpdated);
		try {
			const wrapper = mountCard();
			await flushPromises();

			await wrapper.find('[data-testid="mock-slack-connect"]').trigger('click');
			await flushPromises();

			expect(onAgentUpdated).toHaveBeenCalledWith({
				agentId: 'agent-1',
				source: 'channel-setup-card',
			});
		} finally {
			agentsEventBus.off('agentUpdated', onAgentUpdated);
		}
	});

	it('does not notify agent surfaces when the connect fails', async () => {
		mocks.connect.mockRejectedValueOnce(new Error('connect failed'));
		const onAgentUpdated = vi.fn();
		agentsEventBus.on('agentUpdated', onAgentUpdated);
		try {
			const wrapper = mountCard();
			await flushPromises();

			await wrapper.find('[data-testid="mock-slack-connect"]').trigger('click');
			await flushPromises();

			expect(onAgentUpdated).not.toHaveBeenCalled();
		} finally {
			agentsEventBus.off('agentUpdated', onAgentUpdated);
		}
	});

	it('removes the draft integration before resolving skipped setup and refreshing the agent', async () => {
		let finishDisconnect: () => void = () => {};
		const onAgentUpdated = vi.fn();
		agentsEventBus.on('agentUpdated', onAgentUpdated);
		mocks.disconnect.mockReturnValueOnce(
			new Promise<void>((resolve) => {
				finishDisconnect = resolve;
			}),
		);
		try {
			const wrapper = mountCard();
			await flushPromises();

			await wrapper.find('[data-testid="channel-setup-card-skip"]').trigger('click');
			await flushPromises();

			expect(mocks.disconnect).toHaveBeenCalledWith('slack', '');
			expect(wrapper.emitted('resolve')).toBeUndefined();
			expect(onAgentUpdated).not.toHaveBeenCalled();

			finishDisconnect();
			await flushPromises();

			expect(onAgentUpdated).toHaveBeenCalledWith({
				agentId: 'agent-1',
				source: 'channel-setup-card',
			});
			expect(wrapper.emitted('resolve')).toEqual([[{ approved: false }]]);
		} finally {
			agentsEventBus.off('agentUpdated', onAgentUpdated);
		}
	});

	it('keeps setup pending when removing the draft integration fails', async () => {
		mocks.disconnect.mockRejectedValueOnce(new Error('disconnect failed'));
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="channel-setup-card-skip"]').trigger('click');
		await flushPromises();

		expect(mocks.disconnect).toHaveBeenCalledWith('slack', '');
		expect(wrapper.emitted('resolve')).toBeUndefined();
	});

	it('does not connect twice when setup emits connect twice synchronously', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="mock-slack-connect-twice"]').trigger('click');
		await flushPromises();

		expect(mocks.connect).toHaveBeenCalledTimes(1);
		expect(wrapper.emitted('resolve')).toEqual([[{ approved: true }]]);
	});

	it('keeps the skip button disabled while a connection is in flight', async () => {
		let resolveConnect: (value: { status: string }) => void = () => {};
		mocks.connect.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveConnect = resolve;
			}),
		);
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="mock-slack-connect"]').trigger('click');
		await flushPromises();

		expect(
			wrapper.find('[data-testid="channel-setup-card-skip"]').attributes('disabled'),
		).toBeDefined();

		await wrapper.find('[data-testid="channel-setup-card-skip"]').trigger('click');
		expect(wrapper.emitted('resolve')).toBeUndefined();

		resolveConnect({ status: 'connected' });
		await flushPromises();

		expect(wrapper.emitted('resolve')).toEqual([[{ approved: true }]]);
	});

	it('does not emit resolve when the Slack app authorization popup is blocked', async () => {
		vi.spyOn(window, 'open').mockReturnValueOnce(null);
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="mock-slack-app-setup"]').trigger('click');
		await flushPromises();

		expect(wrapper.emitted('resolve')).toBeUndefined();
	});

	it('renders the safe fallback for an unknown catalog integration', async () => {
		const wrapper = mountCard({ integrationType: 'unknown-channel' });
		await flushPromises();

		expect(wrapper.find('[data-testid="channel-setup-catalog-loading"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="channel-setup-catalog-error"]').exists()).toBe(false);
	});

	it('shows a loading state until the integration catalog arrives', async () => {
		let resolveCatalog: (integrations: ChatIntegrationDescriptor[]) => void = () => {};
		mocks.setCatalog([]);
		mocks.ensureLoaded.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveCatalog = resolve;
			}),
		);
		const wrapper = mountCard({ integrationType: 'linear' });

		expect(wrapper.find('[data-testid="channel-setup-catalog-loading"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="mock-linear-setup"]').exists()).toBe(false);

		mocks.setCatalog([mocks.slackIntegration, mocks.linearIntegration]);
		resolveCatalog([mocks.slackIntegration, mocks.linearIntegration]);
		await flushPromises();

		expect(wrapper.find('[data-testid="channel-setup-catalog-loading"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="mock-linear-setup"]').exists()).toBe(true);
	});

	it('refreshes a stale catalog before showing an error', async () => {
		mocks.setCatalog([mocks.slackIntegration]);
		mocks.ensureLoaded.mockResolvedValueOnce([mocks.slackIntegration]);
		mocks.reloadCatalog.mockImplementationOnce(async () => {
			mocks.setCatalog([mocks.slackIntegration, mocks.linearIntegration]);
			return [mocks.slackIntegration, mocks.linearIntegration];
		});
		const wrapper = mountCard({ integrationType: 'linear' });
		await flushPromises();

		expect(wrapper.find('[data-testid="channel-setup-catalog-error"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="mock-linear-setup"]').exists()).toBe(true);
	});

	it('retries loading the integration catalog after an error', async () => {
		mocks.setCatalog([]);
		mocks.ensureLoaded.mockRejectedValueOnce(new Error('catalog unavailable'));
		mocks.reloadCatalog.mockImplementationOnce(async () => {
			mocks.setCatalog([mocks.slackIntegration, mocks.linearIntegration]);
			return [mocks.slackIntegration, mocks.linearIntegration];
		});
		const wrapper = mountCard({ integrationType: 'linear' });
		await flushPromises();

		expect(wrapper.find('[data-testid="channel-setup-catalog-error"]').exists()).toBe(true);

		await wrapper.find('[data-testid="channel-setup-catalog-retry"]').trigger('click');
		await flushPromises();

		expect(wrapper.find('[data-testid="channel-setup-catalog-error"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="mock-linear-setup"]').exists()).toBe(true);
	});

	it('does not call connect or emit resolve when the disabled prop is already true', async () => {
		const wrapper = mountCard({ disabled: true });
		await flushPromises();

		await wrapper.find('[data-testid="mock-slack-connect"]').trigger('click');
		await flushPromises();

		expect(mocks.connect).not.toHaveBeenCalled();
		expect(wrapper.emitted('resolve')).toBeUndefined();
	});
	describe('Microsoft Teams', () => {
		beforeEach(() => {
			const integrations = [mocks.slackIntegration, mocks.teamsIntegration];
			mocks.setCatalog(integrations);
			mocks.ensureLoaded.mockResolvedValue(integrations);
			mocks.reloadCatalog.mockResolvedValue(integrations);
		});

		it("hands the agent's own icon to the setup view", async () => {
			mocks.getAgent.mockResolvedValue({
				name: 'Agent',
				id: 'agent-1',
				schema: {
					personalisation: {
						icon: 'zap',
						gradient: { from: '#2563EB', to: '#7C3AED', angle: 135, fromStop: 0, toStop: 100 },
					},
				},
			});
			const wrapper = mountCard({ integrationType: 'teams' });
			await flushPromises();

			const setup = wrapper.find('[data-testid="mock-teams-setup"]');
			expect(setup.attributes('data-icon')).toBe('zap');
			expect(setup.attributes('data-gradient-from')).toBe('#2563EB');
		});

		it('offers the setup choice in the header', async () => {
			const wrapper = mountCard({ integrationType: 'teams' });
			await flushPromises();

			expect(wrapper.find('header [data-testid="mock-teams-setup-kind"]').exists()).toBe(true);
		});

		it('saves the provisioned channel without resolving, then resolves on Done', async () => {
			const wrapper = mountCard({ integrationType: 'teams' });
			await flushPromises();
			await wrapper.find('[data-testid="mock-teams-provision"]').trigger('click');
			await flushPromises();

			expect(mocks.connect).toHaveBeenCalledWith('teams', 'teams-cred', undefined, {});
			expect(wrapper.emitted('resolve')).toBeUndefined();
			expect(wrapper.find('[data-testid="channel-setup-card-skip"]').exists()).toBe(false);

			await wrapper.find('[data-testid="mock-teams-done"]').trigger('click');
			await flushPromises();

			expect(mocks.connect).toHaveBeenCalledTimes(2);
			expect(wrapper.emitted('resolve')).toEqual([[{ approved: true }]]);
		});

		it('keeps Later while the provisioned channel failed to save', async () => {
			mocks.connect.mockRejectedValueOnce(new Error('connect failed'));
			const wrapper = mountCard({ integrationType: 'teams' });
			await flushPromises();

			await wrapper.find('[data-testid="mock-teams-provision"]').trigger('click');
			await flushPromises();

			expect(mocks.connect).toHaveBeenCalledTimes(1);
			expect(wrapper.emitted('resolve')).toBeUndefined();
			expect(wrapper.find('[data-testid="channel-setup-card-skip"]').exists()).toBe(true);
		});

		it('hands the setup the credential the saved channel runs on', async () => {
			mocks.connectedCredentials = { teams: 'teams-cred' };
			const wrapper = mountCard({ integrationType: 'teams' });
			await flushPromises();

			expect(wrapper.find('[data-testid="mock-teams-saved-credential"]').text()).toBe('teams-cred');
		});

		it('removes the saved channel and starts the setup again', async () => {
			const wrapper = mountCard({ integrationType: 'teams' });
			await flushPromises();
			await wrapper.find('[data-testid="mock-teams-provision"]').trigger('click');
			await flushPromises();
			expect(wrapper.find('[data-testid="channel-setup-card-skip"]').exists()).toBe(false);

			await wrapper.find('[data-testid="mock-teams-restart"]').trigger('click');
			await flushPromises();

			expect(mocks.disconnect).toHaveBeenCalledWith('teams', 'teams-cred', {
				deleteExternalResource: undefined,
			});
			expect(wrapper.find('[data-testid="mock-teams-credential"]').text()).toBe('');
			expect(wrapper.find('[data-testid="channel-setup-card-skip"]').exists()).toBe(true);
			expect(wrapper.emitted('resolve')).toBeUndefined();
		});

		it('tells the user where to remove what the old setup left behind', async () => {
			mocks.disconnect.mockResolvedValueOnce({
				warning: {
					integrationType: 'teams',
					code: 'resources_not_deleted',
					action: { type: 'open_url', url: 'https://admin.teams.microsoft.com' },
				},
			});
			const wrapper = mountCard({ integrationType: 'teams' });
			await flushPromises();
			await wrapper.find('[data-testid="mock-teams-provision"]').trigger('click');
			await flushPromises();

			await wrapper.find('[data-testid="mock-teams-restart"]').trigger('click');
			await flushPromises();

			expect(mocks.showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		});

		it('keeps the saved channel and reports the error when removal fails', async () => {
			const wrapper = mountCard({ integrationType: 'teams' });
			await flushPromises();
			await wrapper.find('[data-testid="mock-teams-provision"]').trigger('click');
			await flushPromises();
			mocks.disconnect.mockRejectedValueOnce(new Error('disconnect failed'));

			await wrapper.find('[data-testid="mock-teams-restart"]').trigger('click');
			await flushPromises();

			expect(mocks.showError).toHaveBeenCalled();
			expect(wrapper.find('[data-testid="mock-teams-credential"]').text()).toBe('teams-cred');
			expect(wrapper.find('[data-testid="channel-setup-card-skip"]').exists()).toBe(false);
		});

		it('stays open after a connect when the setup has steps past it', async () => {
			mocks.teamsKeepOpenAfterConnect = true;
			const wrapper = mountCard({ integrationType: 'teams' });
			await flushPromises();

			await wrapper.find('[data-testid="mock-teams-download"]').trigger('click');
			await flushPromises();

			expect(mocks.connect).toHaveBeenCalledTimes(1);
			expect(wrapper.emitted('resolve')).toBeUndefined();
			// Skipping now would remove the channel this card just saved.
			expect(wrapper.find('[data-testid="channel-setup-card-skip"]').exists()).toBe(false);

			await wrapper.find('[data-testid="mock-teams-done"]').trigger('click');
			await flushPromises();

			expect(wrapper.emitted('resolve')).toEqual([[{ approved: true }]]);
		});
	});
});
