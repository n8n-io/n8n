import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import * as credentialsApi from '@/features/credentials/credentials.api';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';

import AgentTriggersSection from '../components/AgentTriggersSection.vue';

vi.mock('@/features/credentials/credentials.api');
vi.mock('@/features/credentials/credentials.ee.api');

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: 'test-session' },
		baseUrl: 'http://localhost:5678',
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: vi.fn(),
		getNodeVersions: vi.fn(() => []),
	}),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		isEnterpriseFeatureEnabled: { sharing: true },
	}),
}));

const modelCredential = mock<ICredentialsResponse>({
	id: 'model-credential',
	name: 'Model credential',
	type: 'openAiApi',
});

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
		setActivePinia(createPinia());
		vi.mocked(credentialsApi.getUsableCredentials).mockResolvedValue([]);
	});

	it('preserves model credentials during channel refresh on mount and remount', async () => {
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentials([modelCredential]);

		for (const phase of ['mount', 'remount']) {
			const pendingCredentials = Promise.withResolvers<ICredentialsResponse[]>();
			vi.mocked(credentialsApi.getUsableCredentials).mockReturnValueOnce(
				pendingCredentials.promise,
			);
			const wrapper = mountSection();
			await flushPromises();

			expect(credentialsApi.getUsableCredentials).toHaveBeenLastCalledWith(expect.anything(), {
				projectId: 'project-id',
			});
			expect(credentialsStore.getCredentialById(modelCredential.id), phase).toEqual(
				modelCredential,
			);

			pendingCredentials.resolve([modelCredential]);
			await flushPromises();

			expect(credentialsStore.getCredentialById(modelCredential.id)).toEqual(modelCredential);
			wrapper.unmount();
		}
	});

	it('preserves model credentials when the channel credential refresh fails', async () => {
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentials([modelCredential]);
		vi.mocked(credentialsApi.getUsableCredentials).mockRejectedValueOnce(
			new Error('Credential refresh failed'),
		);
		const wrapper = mountSection();
		await flushPromises();

		expect(credentialsStore.getCredentialById(modelCredential.id)).toEqual(modelCredential);
		wrapper.unmount();
	});

	it('removes a missing credential only after the channel credential refresh completes', async () => {
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentials([modelCredential]);
		const pendingCredentials = Promise.withResolvers<ICredentialsResponse[]>();
		vi.mocked(credentialsApi.getUsableCredentials).mockReturnValueOnce(pendingCredentials.promise);
		const wrapper = mountSection();
		await flushPromises();

		expect(credentialsStore.getCredentialById(modelCredential.id)).toEqual(modelCredential);

		pendingCredentials.resolve([]);
		await flushPromises();

		expect(credentialsStore.getCredentialById(modelCredential.id)).toBeUndefined();
		wrapper.unmount();
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
