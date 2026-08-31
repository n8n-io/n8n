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
	return {
		slackIntegration,
		linearIntegration,
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
	};
});

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/permissions', () => ({
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
		connectedCredentials: ref<Record<string, string>>({}),
		integrationSettings: ref({}),
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
		mocks.disconnect.mockResolvedValue(undefined);
		mocks.isConnected.mockReturnValue(false);
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

		expect(mocks.connect).toHaveBeenCalledWith('slack', 'cred-1', undefined);
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
});
