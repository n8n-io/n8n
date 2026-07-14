import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelsSection from '../components/AgentChannelsSection.vue';

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		setCredentials: vi.fn(),
		fetchAllCredentialsForWorkflow: vi.fn().mockResolvedValue([]),
	}),
}));

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: { value: [] },
		ensureLoaded: vi.fn().mockResolvedValue([]),
	}),
}));

vi.mock('../composables/useAgentIntegrationStatus', () => ({
	useAgentIntegrationStatus: () => ({
		connectedCredentials: { value: {} },
		fetchStatus: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('../components/AgentChannelModal.vue', () => ({
	default: {
		name: 'AgentChannelModal',
		props: ['simpleSetup'],
		template: '<div data-testid="agent-channel-modal-stub" :data-simple-setup="simpleSetup" />',
	},
}));

function mountSection(simpleChannelSetup?: boolean) {
	return mount(AgentChannelsSection, {
		props: {
			connectedTriggers: [],
			projectId: 'project-id',
			agentId: 'agent-id',
			isPublished: false,
			simpleChannelSetup,
		},
		global: {
			stubs: {
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
			},
		},
	});
}

describe('AgentChannelsSection', () => {
	describe('simpleChannelSetup', () => {
		it('does not force simple setup on the channel modal by default', async () => {
			const wrapper = mountSection();

			await wrapper.find('[data-testid="agent-channels-add-channel"]').trigger('click');
			await flushPromises();

			const modal = wrapper.find('[data-testid="agent-channel-modal-stub"]');
			expect(modal.exists()).toBe(true);
			expect(modal.attributes('data-simple-setup')).toBe('false');
		});

		it('forwards simpleChannelSetup to the channel modal as simple-setup', async () => {
			const wrapper = mountSection(true);

			await wrapper.find('[data-testid="agent-channels-add-channel"]').trigger('click');
			await flushPromises();

			const modal = wrapper.find('[data-testid="agent-channel-modal-stub"]');
			expect(modal.exists()).toBe(true);
			expect(modal.attributes('data-simple-setup')).toBe('true');
		});
	});
});
