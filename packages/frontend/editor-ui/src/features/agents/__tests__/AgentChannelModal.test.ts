import { mount, VueWrapper } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import AgentChannelModal from '../components/AgentChannelModal.vue';

type SlackSetupStubWrapper = VueWrapper<{
	disconnectSlackApp: () => Promise<void>;
}>;

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const catalog = ref([
	{ type: 'slack', label: 'Slack', icon: 'zap' },
	{ type: 'linear', label: 'Linear', icon: 'zap' },
]);

const disconnectMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

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
		disconnect: disconnectMock,
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
					props: ['mode', 'disconnectSlackApp'],
					template: '<div data-testid="slack-setup" :data-mode="mode" />',
				},
				AgentChannelLinearSetup: {
					props: ['mode'],
					template: '<div data-testid="linear-setup" :data-mode="mode" />',
				},
				AgentChannelTelegramSetup: {
					props: ['mode'],
					template: '<div data-testid="telegram-setup" :data-mode="mode" />',
				},
			},
		},
	});
}

describe('AgentChannelModal', () => {
	beforeEach(() => {
		disconnectMock.mockClear();
	});

	it('renders the channel list for the list view', () => {
		const wrapper = mountModal({ view: 'list' });

		expect(wrapper.findAll('[data-testid="channel-list-item"]')).toHaveLength(catalog.value.length);
	});

	it('renders the per-channel setup view for a setup view', () => {
		const wrapper = mountModal({ view: 'linear_setup' });

		const linearSetup = wrapper.find('[data-testid="linear-setup"]');
		expect(linearSetup.attributes('data-mode')).toBe('setup');
	});

	it('renders the per-channel edit view for an edit view', () => {
		const wrapper = mountModal({ view: 'linear_edit' });

		const linearSetup = wrapper.find('[data-testid="linear-setup"]');
		expect(linearSetup.attributes('data-mode')).toBe('edit');
	});

	it('disconnects a draft slack channel and closes the modal', async () => {
		const wrapper = mountModal({
			view: 'slack_edit',
			connectedChannels: ['slack'],
		});

		const slackSetup = wrapper.findComponent(
			'[data-testid="slack-setup"]',
		) as SlackSetupStubWrapper;
		await slackSetup.vm.disconnectSlackApp();

		expect(disconnectMock).toHaveBeenCalledWith('slack', '');
		expect(wrapper.emitted('channel-disconnected')).toEqual([['slack']]);
		expect(wrapper.emitted('update:open')).toEqual([[false]]);
	});
});
