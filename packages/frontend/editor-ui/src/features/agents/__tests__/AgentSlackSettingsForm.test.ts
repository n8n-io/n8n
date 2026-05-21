/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentSlackSettingsForm from '../components/AgentSlackSettingsForm.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		urlBaseWebhook: 'https://hooks.example',
		OAuthCallbackUrls: { oauth2: 'https://hooks.example/rest/oauth2-credential/callback' },
	}),
}));

describe('AgentSlackSettingsForm', () => {
	it('includes Slack assistant, thread, and reaction permissions in the app manifest', () => {
		const wrapper = mount(AgentSlackSettingsForm, {
			props: {
				agentName: 'Support Agent',
				projectId: 'project-1',
				agentId: 'agent-1',
			},
			global: {
				stubs: {
					N8nButton: { template: '<button><slot name="prefix" /><slot /></button>' },
					N8nIcon: { template: '<i />' },
					N8nText: { template: '<span><slot /></span>' },
				},
			},
		});

		const manifest = JSON.parse(wrapper.find('pre').text()) as {
			oauth_config: { scopes: { bot: string[] } };
			settings: { event_subscriptions: { bot_events: string[] } };
		};

		expect(manifest.oauth_config.scopes.bot).toEqual(
			expect.arrayContaining([
				'assistant:write',
				'groups:history',
				'mpim:history',
				'reactions:read',
				'reactions:write',
			]),
		);
		expect(manifest.settings.event_subscriptions.bot_events).toEqual(
			expect.arrayContaining([
				'assistant_thread_started',
				'assistant_thread_context_changed',
				'message.channels',
				'message.groups',
				'message.im',
				'message.mpim',
			]),
		);
	});
});
