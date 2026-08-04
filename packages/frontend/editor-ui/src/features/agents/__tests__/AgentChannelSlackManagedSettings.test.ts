import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelSlackManagedSettings from '../components/AgentChannelSlackManagedSettings.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const settings = {
	credentialId: 'bot-credential',
	appId: 'A123',
	name: 'Support Bot',
	description: 'Handles support requests',
	alwaysOnline: true,
	appHomeUrl: 'https://api.slack.com/apps/A123/app-home',
};

function mountForm() {
	return mount(AgentChannelSlackManagedSettings, {
		props: {
			settings,
			loading: false,
			error: false,
		},
		global: {
			stubs: {
				FormInput: {
					props: ['modelValue', 'name'],
					emits: ['update:modelValue'],
					template:
						'<input :data-testid="$attrs[\'data-testid\']" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
				},
				Switch2: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template:
						'<button data-testid="slack-managed-app-always-online" @click="$emit(\'update:modelValue\', !modelValue)" />',
				},
				Link: {
					props: ['href'],
					template: '<a :href="href"><slot /></a>',
				},
				Text: { template: '<span><slot /></span>' },
			},
		},
	});
}

describe('AgentChannelSlackManagedSettings', () => {
	it('shows exported settings and links to the managed app home', () => {
		const wrapper = mountForm();

		expect(wrapper.get('[data-testid="slack-managed-app-name"]').attributes('value')).toBe(
			'Support Bot',
		);
		expect(wrapper.get('[data-testid="slack-managed-app-description"]').attributes('value')).toBe(
			'Handles support requests',
		);
		expect(wrapper.get('a').attributes('href')).toBe('https://api.slack.com/apps/A123/app-home');
		expect(wrapper.vm.validationError).toBeNull();
	});

	it('exposes edited settings for save and validates required fields', async () => {
		const wrapper = mountForm();

		await wrapper.get('[data-testid="slack-managed-app-name"]').setValue('Updated Bot');
		await wrapper.get('[data-testid="slack-managed-app-description"]').setValue('');
		await wrapper.get('[data-testid="slack-managed-app-always-online"]').trigger('click');

		expect(wrapper.vm.currentSettings).toEqual({
			credentialId: 'bot-credential',
			name: 'Updated Bot',
			description: '',
			alwaysOnline: false,
		});
		expect(wrapper.vm.validationError).toBe(
			'agents.channels.slack.managed.settings.descriptionRequired',
		);
	});
});
