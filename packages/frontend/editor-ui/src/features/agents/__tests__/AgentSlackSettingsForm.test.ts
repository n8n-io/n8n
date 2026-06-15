/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentSlackSettingsForm from '../components/AgentSlackSettingsForm.vue';

const { getSlackAgentAppManifest } = vi.hoisted(() => ({
	getSlackAgentAppManifest: vi.fn(),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
		urlBaseWebhook: 'https://hooks.example',
		OAuthCallbackUrls: { oauth2: 'https://hooks.example/rest/oauth2-credential/callback' },
	}),
}));

vi.mock('../composables/useAgentApi', () => ({
	getSlackAgentAppManifest,
}));

describe('AgentSlackSettingsForm', () => {
	it('renders the fetched Slack app manifest', async () => {
		getSlackAgentAppManifest.mockResolvedValue({
			manifest: {
				display_information: { name: 'Support Agent' },
				oauth_config: {
					scopes: {
						bot: [
							'assistant:write',
							'groups:history',
							'mpim:history',
							'reactions:read',
							'reactions:write',
						],
					},
				},
				settings: {
					event_subscriptions: {
						bot_events: [
							'assistant_thread_started',
							'assistant_thread_context_changed',
							'message.channels',
							'message.groups',
							'message.im',
							'message.mpim',
						],
					},
				},
			},
		});

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
					N8nInput: { template: '<input />' },
					N8nCollapsiblePanel: { template: '<section><slot /></section>' },
				},
			},
		});
		await flushPromises();

		const manifest = JSON.parse(wrapper.find('pre').text()) as {
			oauth_config: { scopes: { bot: string[] } };
			settings: { event_subscriptions: { bot_events: string[] } };
		};

		expect(getSlackAgentAppManifest).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
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
