import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentTriggersSection from '../components/AgentTriggersSection.vue';

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

const { fetchStatusSpy } = vi.hoisted(function createStatusSpy() {
	return { fetchStatusSpy: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('../composables/useAgentIntegrationStatus', function mockIntegrationStatus() {
	return {
		useAgentIntegrationStatus: function useAgentIntegrationStatus() {
			return {
				connectedCredentials: { value: {} },
				fetchStatus: fetchStatusSpy,
			};
		},
	};
});

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

function mountSection(
	simpleChannelSetup?: boolean,
	isPublished = false,
	extraProps: Record<string, unknown> = {},
) {
	return mount(AgentTriggersSection, {
		props: {
			connectedTriggers: [],
			projectId: 'project-id',
			agentId: 'agent-id',
			simpleChannelSetup,
			isPublished,
			...extraProps,
		},
		global: {
			stubs: {
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
				AgentSchedulesRow: {
					name: 'AgentSchedulesRow',
					props: ['ensureAgentPersisted'],
					template: '<div />',
				},
			},
		},
	});
}

describe('AgentTriggersSection', () => {
	beforeEach(function resetMocks() {
		vi.clearAllMocks();
	});

	it('forwards persistence to the schedules row', async function forwardPersistenceToSchedules() {
		const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
		const wrapper = mountSection(undefined, false, {
			agentUnsaved: true,
			ensureAgentPersisted,
		});
		await flushPromises();

		expect(wrapper.findComponent({ name: 'AgentSchedulesRow' }).props('ensureAgentPersisted')).toBe(
			ensureAgentPersisted,
		);
		expect(ensureAgentPersisted).not.toHaveBeenCalled();
	});

	it('loads channel status after same-ID persistence', async function loadPersistedStatus() {
		const wrapper = mountSection(undefined, false, { agentUnsaved: true });
		await flushPromises();

		expect(fetchStatusSpy).not.toHaveBeenCalled();

		await wrapper.setProps({ agentUnsaved: false });
		await flushPromises();

		expect(fetchStatusSpy).toHaveBeenCalledExactlyOnceWith([]);
	});

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

	it('forwards publication state to the channel modal', async () => {
		const wrapper = mountSection(undefined, true);

		await wrapper.find('[data-testid="agent-channels-add-channel"]').trigger('click');
		await flushPromises();

		expect(
			wrapper.find('[data-testid="agent-channel-modal-stub"]').attributes('data-is-published'),
		).toBe('true');
	});
});
