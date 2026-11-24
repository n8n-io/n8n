import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import type { AgentChannelViewProps } from '../types';
import AgentChannelSlackEditView from './AgentChannelSlackEditView.vue';
import type { SlackChannelRuntime } from './useSlackChannelRuntime';

function mountForm(overrides: Partial<AgentChannelViewProps> = {}, managed = false) {
	const runtime = {
		loading: ref(false),
		settingsLoading: ref(false),
		settings: ref(null),
		settingsError: ref(false),
		settingsSaveError: ref(null),
		isManagedCredential: () => managed,
		saveSettings: vi.fn(),
	} as unknown as SlackChannelRuntime;
	const wrapper = mount(AgentChannelSlackEditView, {
		props: {
			modelValue: 'slack-credential',
			mode: 'edit',
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
			connected: true,
			connectedDescription: '',
			errorMessage: '',
			errorIsConflict: false,
			isPublished: true,
			agentName: 'Agent',
			projectId: 'project-1',
			agentId: 'agent-1',
			forceNewCredential: false,
			simpleSetup: false,
			...overrides,
			runtime,
		},
		global: {
			stubs: {
				AgentIntegrationCredentialConnection: true,
				AgentChannelSlackManagedSettings: true,
			},
		},
	});
	return { wrapper, runtime };
}

const switchSelector = '[data-testid="slack-only-respond-when-mentioned"]';

describe('AgentChannelSlackEditView', () => {
	it('exposes managed settings save activity as loading', async () => {
		const { wrapper, runtime } = mountForm({}, true);
		expect(wrapper.vm.loading).toBe(false);

		runtime.settingsLoading.value = true;
		await nextTick();

		expect(wrapper.vm.loading).toBe(true);
		expect(wrapper.get(switchSelector).attributes('disabled')).toBeDefined();
	});

	it.each([false, true])(
		'exposes the reply setting for a managed connection: %s',
		async (managed) => {
			const { wrapper } = mountForm({}, managed);
			expect(wrapper.get(switchSelector).attributes('aria-label')).toBe(
				'Reply only when @mentioned',
			);
			expect(wrapper.get(switchSelector).attributes('aria-checked')).toBe('false');
			expect(wrapper.vm.currentSettings).toBeUndefined();

			await wrapper.get(switchSelector).trigger('click');

			expect(wrapper.vm.currentSettings).toEqual({
				messagingExperience: 'assistant',
				onlyRespondWhenMentioned: true,
			});
		},
	);

	it('loads the saved choice and preserves the other Slack settings', async () => {
		const savedSettings = {
			messagingExperience: 'agent' as const,
			sessionIdleTimeoutMinutes: 30,
			onlyRespondWhenMentioned: true,
		};
		const { wrapper } = mountForm({ savedSettings });
		expect(wrapper.get(switchSelector).attributes('aria-checked')).toBe('true');

		await wrapper.get(switchSelector).trigger('click');

		expect(wrapper.vm.currentSettings).toEqual({
			...savedSettings,
			onlyRespondWhenMentioned: false,
		});
	});

	it('does not change legacy settings until the user changes the option', async () => {
		const savedSettings = { messagingExperience: 'assistant' as const };
		const { wrapper } = mountForm({ savedSettings });
		expect(wrapper.vm.currentSettings).toEqual(savedSettings);

		await wrapper.get(switchSelector).trigger('click');
		await wrapper.get(switchSelector).trigger('click');

		expect(wrapper.vm.currentSettings).toEqual(savedSettings);
	});

	it('discards local edits when the settings view is reopened', async () => {
		const { wrapper } = mountForm();
		await wrapper.get(switchSelector).trigger('click');
		wrapper.unmount();

		const reopened = mountForm();
		expect(reopened.wrapper.get(switchSelector).attributes('aria-checked')).toBe('false');
		expect(reopened.wrapper.vm.currentSettings).toBeUndefined();
	});

	it('disables the reply setting for read-only access', () => {
		const { wrapper } = mountForm({ disabled: true });
		expect(wrapper.get(switchSelector).attributes('disabled')).toBeDefined();
	});
});
