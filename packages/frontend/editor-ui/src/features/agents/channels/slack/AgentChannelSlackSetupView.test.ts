import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentChannelSlackSetupView from './AgentChannelSlackSetupView.vue';
import type { SlackChannelRuntime } from './useSlackChannelRuntime';

const managedSetupEnabled = ref(false);

vi.mock('@/experiments/agentSlackManagedSetup', () => ({
	useAgentSlackManagedSetupExperiment: () => ({
		isFeatureEnabled: managedSetupEnabled,
	}),
}));

function mountView() {
	const runtime = {
		loading: ref(false),
		setup: ref({
			managedSetupAvailable: true,
			managerCredentials: [],
		}),
		setupKind: ref<'managed' | 'manual'>('managed'),
		setupApp: vi.fn(),
		connectManagerCredential: vi.fn(),
		editManagerCredential: vi.fn(),
		installManagedApp: vi.fn(),
	} as unknown as SlackChannelRuntime;

	return mount(AgentChannelSlackSetupView, {
		props: {
			modelValue: '',
			mode: 'setup',
			integration: {
				type: 'slack',
				label: 'Slack',
				icon: 'slack',
				credentialTypes: ['slackApi'],
			},
			credentials: [],
			credentialPermissions: { create: true },
			credentialsLoading: false,
			loading: false,
			connected: false,
			connectedDescription: '',
			errorMessage: '',
			errorIsConflict: false,
			isPublished: false,
			agentName: 'Agent',
			projectId: 'project-1',
			agentId: 'agent-1',
			forceNewCredential: false,
			simpleSetup: false,
			runtime,
		},
		global: {
			stubs: {
				AgentChannelSlackManagedSetup: {
					template: '<div data-testid="managed-setup" />',
				},
				AgentChannelSlackSetup: {
					template: '<div data-testid="manual-setup" />',
				},
			},
		},
	});
}

describe('AgentChannelSlackSetupView', () => {
	beforeEach(() => {
		managedSetupEnabled.value = false;
	});

	it('shows manual setup for a new connection when managed setup is disabled', () => {
		const wrapper = mountView();

		expect(wrapper.find('[data-testid="managed-setup"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="manual-setup"]').exists()).toBe(true);
	});

	it('shows managed setup for a new connection when managed setup is enabled', async () => {
		managedSetupEnabled.value = true;

		const wrapper = mountView();
		await nextTick();

		expect(wrapper.find('[data-testid="managed-setup"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="manual-setup"]').exists()).toBe(false);
	});
});
