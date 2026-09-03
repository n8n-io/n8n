import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelsSection from '../components/AgentChannelsSection.vue';

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		setCredentials: vi.fn(),
		fetchUsableCredentials: vi.fn().mockResolvedValue([]),
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
		props: ['simpleSetup', 'isPublished'],
		template:
			'<div data-testid="agent-channel-modal-stub" :data-simple-setup="simpleSetup" :data-is-published="isPublished" />',
	},
}));

function mountSection({
	simpleChannelSetup,
	isPublished = false,
	agentRunnable = true,
	isPreviewOpen = false,
}: {
	simpleChannelSetup?: boolean;
	isPublished?: boolean;
	agentRunnable?: boolean;
	isPreviewOpen?: boolean;
} = {}) {
	return mount(AgentChannelsSection, {
		props: {
			connectedTriggers: [],
			projectId: 'project-id',
			agentId: 'agent-id',
			simpleChannelSetup,
			isPublished,
			agentRunnable,
			isPreviewOpen,
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
			const wrapper = mountSection({ simpleChannelSetup: true });

			await wrapper.find('[data-testid="agent-channels-add-channel"]').trigger('click');
			await flushPromises();

			const modal = wrapper.find('[data-testid="agent-channel-modal-stub"]');
			expect(modal.exists()).toBe(true);
			expect(modal.attributes('data-simple-setup')).toBe('true');
		});
	});

	it('forwards publication state to the channel modal', async () => {
		const wrapper = mountSection({ isPublished: true });

		await wrapper.find('[data-testid="agent-channels-add-channel"]').trigger('click');
		await flushPromises();

		expect(
			wrapper.find('[data-testid="agent-channel-modal-stub"]').attributes('data-is-published'),
		).toBe('true');
	});

	describe('preview button', () => {
		it('emits open-preview when clicked and the agent is runnable', async () => {
			const wrapper = mountSection();

			await wrapper.find('[data-testid="agent-channels-preview-tile"]').trigger('click');

			expect(wrapper.emitted('open-preview')).toHaveLength(1);
		});

		it('stays disabled while the agent is not runnable yet', async () => {
			const wrapper = mountSection({ agentRunnable: false });
			const button = wrapper.find('[data-testid="agent-channels-preview-tile"]');

			expect(button.attributes('disabled')).toBeDefined();

			await button.trigger('click');

			expect(wrapper.emitted('open-preview')).toBeUndefined();
		});

		it('reflects the open preview as an expanded, closable control', async () => {
			const wrapper = mountSection({ isPreviewOpen: true });
			const button = wrapper.find('[data-testid="agent-channels-preview-tile"]');

			expect(button.attributes('aria-expanded')).toBe('true');

			await button.trigger('click');

			expect(wrapper.emitted('close-preview')).toHaveLength(1);
			expect(wrapper.emitted('open-preview')).toBeUndefined();
		});

		it('can still close an open preview for an agent that is not runnable', async () => {
			const wrapper = mountSection({ isPreviewOpen: true, agentRunnable: false });
			const button = wrapper.find('[data-testid="agent-channels-preview-tile"]');

			expect(button.attributes('disabled')).toBeUndefined();

			await button.trigger('click');

			expect(wrapper.emitted('close-preview')).toHaveLength(1);
		});
	});
});
