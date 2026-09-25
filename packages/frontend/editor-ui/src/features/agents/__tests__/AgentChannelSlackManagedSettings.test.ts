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

function mountForm(
	overrides: { error?: boolean; saveError?: 'service_limits_exceeded' | null } = {},
) {
	return mount(AgentChannelSlackManagedSettings, {
		props: {
			settings,
			loading: false,
			error: overrides.error ?? false,
			saveError: overrides.saveError,
		},
		global: {
			stubs: {
				FormInput: {
					props: ['modelValue', 'name', 'label', 'infoText'],
					emits: ['update:modelValue'],
					template:
						'<input :data-testid="$attrs[\'data-testid\']" :data-label="label" :data-info="infoText" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
				},
				Switch: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template:
						'<button data-testid="slack-managed-app-always-online" @click="$emit(\'update:modelValue\', !modelValue)" />',
				},
				N8nLink: {
					props: ['href', 'bold'],
					template: '<a :href="href" :data-bold="bold"><slot /></a>',
				},
				N8nIcon: { template: '<i data-testid="external-link-icon" />' },
				N8nText: { template: '<span><slot /></span>' },
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
		expect(wrapper.get('[data-testid="slack-managed-app-name"]').attributes()).toMatchObject({
			'data-label': 'agents.channels.slack.managed.settings.name',
			'data-info': 'agents.channels.slack.managed.settings.nameDescription',
		});
		expect(wrapper.get('[data-testid="slack-managed-app-description"]').attributes('value')).toBe(
			'Handles support requests',
		);
		expect(wrapper.get('a').attributes('href')).toBe('https://api.slack.com/apps/A123/app-home');
		expect(wrapper.find('[data-testid="external-link-icon"]').exists()).toBe(true);
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

	it('shows the Slack app limit error returned while saving', () => {
		const wrapper = mountForm({ saveError: 'service_limits_exceeded' });

		expect(wrapper.get('[data-testid="slack-managed-service-limit-error"]').text()).toContain(
			'agents.channels.slack.managed.serviceLimitsExceeded.message',
		);
		expect(wrapper.get('[data-testid="slack-managed-service-limit-link"]').attributes('href')).toBe(
			'https://api.slack.com/apps',
		);
		expect(
			wrapper.get('[data-testid="slack-managed-service-limit-link"]').attributes('target'),
		).toBe('_blank');
		expect(wrapper.vm.validationError).toBeNull();
	});
});
