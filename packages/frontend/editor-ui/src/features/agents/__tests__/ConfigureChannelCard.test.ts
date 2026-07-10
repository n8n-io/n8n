/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

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
}));

vi.mock('@/features/agents/components/AgentChannelSlackSetup.vue', () => ({
	default: {
		props: ['modelValue', 'setupMode'],
		emits: ['update:modelValue', 'connect'],
		template: `
			<div data-testid="mock-slack-setup" :data-setup-mode="setupMode">
				<button
					data-testid="mock-slack-connect"
					@click="$emit('update:modelValue', 'cred-1'); $emit('connect')"
				>Connect</button>
			</div>
		`,
	},
}));

import ConfigureChannelCard from '../components/interactive/ConfigureChannelCard.vue';

const defaultProps = {
	integrationType: 'slack',
	agentId: 'agent-1',
	projectId: 'project-1',
};

function mountCard(props: Record<string, unknown> = {}) {
	return mount(ConfigureChannelCard, {
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

describe('ConfigureChannelCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		mocks.ensureLoaded.mockResolvedValue([mocks.slackIntegration]);
		mocks.fetchStatus.mockResolvedValue(undefined);
		mocks.connect.mockResolvedValue({ status: 'connected' });
		mocks.getAgent.mockResolvedValue({ name: 'Agent', id: 'agent-1' });
	});

	it('renders the setup UI for the requested integration type', async () => {
		const wrapper = mountCard();
		await flushPromises();

		expect(wrapper.find('[data-testid="configure-channel-card"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="mock-slack-setup"]').attributes('data-setup-mode')).toBe(
			'simple',
		);
	});

	it('emits { approved: true } after the channel connects', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="mock-slack-connect"]').trigger('click');
		await flushPromises();

		expect(mocks.connect).toHaveBeenCalledWith('slack', 'cred-1', undefined);
		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ approved: true });
	});

	it('emits { approved: false } when the user skips setup', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="configure-channel-skip"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ approved: false });
	});

	it('renders a connected resolved summary when disabled and resolved as connected', async () => {
		const wrapper = mountCard({ disabled: true, resolvedValue: { connected: true } });
		await flushPromises();

		expect(wrapper.find('[data-testid="mock-slack-setup"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('agents.channels.modal.connected');
	});

	it('renders a skipped resolved summary when disabled and resolved as not connected', async () => {
		const wrapper = mountCard({ disabled: true, resolvedValue: { approved: false } });
		await flushPromises();

		expect(wrapper.text()).toContain('agents.chat.askCredential.skipped');
	});
});
