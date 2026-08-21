import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentChannelSlackSetupKindSelector from './AgentChannelSlackSetupKindSelector.vue';
import type { SlackChannelRuntime } from './useSlackChannelRuntime';

const managedSetupEnabled = ref(false);

vi.mock('@/experiments/agentSlackManagedSetup', () => ({
	useAgentSlackManagedSetupExperiment: () => ({
		isFeatureEnabled: managedSetupEnabled,
	}),
}));

function mountSelector() {
	const runtime = {
		setup: ref({
			managedSetupAvailable: true,
			managerCredentials: [],
		}),
		setupKind: ref<'managed' | 'manual'>('managed'),
	} as unknown as SlackChannelRuntime;

	return mount(AgentChannelSlackSetupKindSelector, {
		props: { runtime },
		global: {
			stubs: {
				N8nSelect: {
					template: '<div data-testid="slack-setup-kind-selector"><slot /></div>',
				},
				N8nOption: true,
			},
		},
	});
}

describe('AgentChannelSlackSetupKindSelector', () => {
	beforeEach(() => {
		managedSetupEnabled.value = false;
	});

	it('hides the managed setup option when the feature is disabled', () => {
		const wrapper = mountSelector();

		expect(wrapper.find('[data-testid="slack-setup-kind-selector"]').exists()).toBe(false);
	});

	it('shows the setup options when the feature is enabled', () => {
		managedSetupEnabled.value = true;

		const wrapper = mountSelector();

		expect(wrapper.find('[data-testid="slack-setup-kind-selector"]').exists()).toBe(true);
	});
});
