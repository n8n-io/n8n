/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

/**
 * `ChannelSetupCard` owns the body + orchestration that used to be
 * duplicated between `ConfigureChannelCard.vue` (agents chat) and
 * `InstanceAiChannelSetup.vue` (instance AI) — see those files' own tests
 * for how each surface maps the `resolve` event emitted here onto its own
 * transport.
 */
const mocks = vi.hoisted(() => {
	const slackIntegration = {
		type: 'slack',
		label: 'Slack',
		icon: 'slack',
		credentialTypes: ['slackOAuth2Api'],
	};
	return {
		slackIntegration,
		ensureLoaded: vi.fn(),
		fetchStatus: vi.fn(),
		connect: vi.fn(),
		getAgent: vi.fn(),
		createSlackAgentApp: vi.fn(),
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

vi.mock('@/features/agents/composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: ref([mocks.slackIntegration]),
		ensureLoaded: mocks.ensureLoaded,
	}),
}));

vi.mock('@/features/agents/composables/useAgentIntegrationStatus', () => ({
	useAgentIntegrationStatus: () => ({
		connectedCredentials: ref<Record<string, string>>({}),
		integrationSettings: ref({}),
		loadingMap: ref<Record<string, boolean>>({}),
		errorMessages: ref<Record<string, string>>({}),
		errorIsConflict: ref<Record<string, boolean>>({}),
		fetchStatus: mocks.fetchStatus,
		connect: mocks.connect,
		isConnected: () => false,
	}),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getAgent: mocks.getAgent,
	createSlackAgentApp: mocks.createSlackAgentApp,
}));

vi.mock('@/features/agents/components/AgentChannelSlackSetup.vue', () => ({
	default: {
		props: ['modelValue', 'setupMode', 'setupSlackApp'],
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
			<div data-testid="mock-slack-setup" :data-setup-mode="setupMode">
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
				N8nText: { template: '<span><slot/></span>', props: ['size', 'bold', 'color', 'tag'] },
			},
		},
	});
}

describe('ChannelSetupCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		mocks.ensureLoaded.mockResolvedValue([mocks.slackIntegration]);
		mocks.fetchStatus.mockResolvedValue(undefined);
		mocks.connect.mockResolvedValue({ status: 'connected' });
		mocks.getAgent.mockResolvedValue({ name: 'Agent', id: 'agent-1' });
		mocks.createSlackAgentApp.mockResolvedValue({ installUrl: 'https://slack.com/oauth/install' });
	});

	it('renders the setup UI for the requested integration type', async () => {
		const wrapper = mountCard();
		await flushPromises();

		expect(wrapper.find('[data-testid="mock-slack-setup"]').attributes('data-setup-mode')).toBe(
			'simple',
		);
	});

	it('emits resolve({ approved: true }) after the channel connects', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="mock-slack-connect"]').trigger('click');
		await flushPromises();

		expect(mocks.connect).toHaveBeenCalledWith('slack', 'cred-1', undefined);
		expect(wrapper.emitted('resolve')).toEqual([[{ approved: true }]]);
	});

	it('emits resolve({ approved: false }) when the user skips setup', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="channel-setup-card-skip"]').trigger('click');

		expect(wrapper.emitted('resolve')).toEqual([[{ approved: false }]]);
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

	it('renders the unsupported-channel placeholder instead of a blank body when the catalog descriptor is missing', async () => {
		// Catalog loaded successfully but has no entry for this (known) type —
		// e.g. a fetch failure that fell back to an empty/partial list.
		const wrapper = mountCard({ integrationType: 'linear' });
		await flushPromises();

		expect(wrapper.text()).toContain('agents.channels.modal.setupPlaceholder');
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
