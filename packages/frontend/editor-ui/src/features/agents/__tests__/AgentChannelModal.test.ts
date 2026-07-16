import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelModal from '../components/AgentChannelModal.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const catalog = ref([
	{ type: 'slack', label: 'Slack', icon: 'zap' },
	{ type: 'linear', label: 'Linear', icon: 'zap' },
]);

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog,
		ensureLoaded: vi.fn().mockResolvedValue(catalog.value),
	}),
}));

vi.mock('../composables/useAgentIntegrationStatus', () => ({
	useAgentIntegrationStatus: () => ({
		fetchStatus: vi.fn().mockResolvedValue(undefined),
		connectedCredentials: ref({}),
		integrationSettings: ref({}),
		loadingMap: ref({}),
		errorMessages: ref({}),
		errorIsConflict: ref({}),
		isConnected: () => false,
		connect: vi.fn(),
		disconnect: vi.fn(),
	}),
}));

vi.mock('../composables/useAgentChannelSetup', () => ({
	useAgentChannelSetup: () => ({
		channelSetupRef: ref(),
		selectedCredentials: ref({}),
		credentialsLoading: ref(false),
		credentialPermissions: ref({}),
		credentialModalOpen: ref(false),
		getChannelCredentialId: () => '',
		getCredentials: () => [],
		loadChannelState: vi.fn().mockResolvedValue(undefined),
		createCredential: vi.fn(),
		editCredential: vi.fn(),
		setupSlackApp: vi.fn(),
	}),
}));

function mountModal(props: Record<string, unknown>) {
	return mount(AgentChannelModal, {
		props: {
			open: true,
			agentId: 'agent-1',
			projectId: 'project-1',
			view: 'linear_setup',
			connectedChannels: [],
			isPublished: false,
			...props,
		},
		global: {
			stubs: {
				// The N8nDialog family's SFCs don't set an explicit `defineOptions({ name })`,
				// so Vue infers the component name from the *filename* (Dialog.vue,
				// DialogHeader.vue, ...) rather than the `N8n`-prefixed name they're imported
				// under -- stubs must be keyed by that inferred name to be picked up.
				Dialog: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
				DialogHeader: { template: '<div><slot /></div>' },
				DialogTitle: { template: '<h3><slot /></h3>' },
				DialogFooter: { template: '<div><slot /></div>' },
				N8nButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
				N8nIconButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
				AgentChannelListItem: { template: '<li data-testid="channel-list-item" />' },
				AgentChannelSlackSetup: {
					props: ['forceNewCredential', 'setupMode', 'mode'],
					template:
						'<div data-testid="slack-setup" :data-mode="mode" :data-force-new-credential="forceNewCredential" :data-setup-mode="setupMode" />',
				},
				AgentChannelLinearSetup: {
					props: ['forceNewCredential', 'mode'],
					template:
						'<div data-testid="linear-setup" :data-mode="mode" :data-force-new-credential="forceNewCredential" />',
				},
				AgentChannelTelegramSetup: {
					props: ['forceNewCredential', 'mode'],
					template:
						'<div data-testid="telegram-setup" :data-mode="mode" :data-force-new-credential="forceNewCredential" />',
				},
			},
		},
	});
}

describe('AgentChannelModal', () => {
	it('does not force a new credential or simple setup by default', () => {
		const wrapper = mountModal({ view: 'linear_setup' });

		const linearSetup = wrapper.find('[data-testid="linear-setup"]');
		expect(linearSetup.attributes('data-force-new-credential')).toBe('false');
	});

	it('forces a new credential and simple setup mode on the Slack setup child when simpleSetup is set', () => {
		const wrapper = mountModal({ view: 'slack_setup', simpleSetup: true });

		const slackSetup = wrapper.find('[data-testid="slack-setup"]');
		expect(slackSetup.attributes('data-force-new-credential')).toBe('true');
		expect(slackSetup.attributes('data-setup-mode')).toBe('simple');
	});

	it('forces a new credential on non-Slack setup children when simpleSetup is set', () => {
		const wrapper = mountModal({ view: 'linear_setup', simpleSetup: true });

		const linearSetup = wrapper.find('[data-testid="linear-setup"]');
		expect(linearSetup.attributes('data-force-new-credential')).toBe('true');
	});

	it('redirects a channel edit view to the simple setup view instead of the advanced edit UI', () => {
		const wrapper = mountModal({ view: 'linear_edit', simpleSetup: true });

		const linearSetup = wrapper.find('[data-testid="linear-setup"]');
		expect(linearSetup.attributes('data-mode')).toBe('setup');
	});

	it('keeps the advanced edit view when simpleSetup is not set', () => {
		const wrapper = mountModal({ view: 'linear_edit' });

		const linearSetup = wrapper.find('[data-testid="linear-setup"]');
		expect(linearSetup.attributes('data-mode')).toBe('edit');
	});
});
