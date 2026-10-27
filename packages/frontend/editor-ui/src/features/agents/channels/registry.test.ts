import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { BaseTextKey } from '@n8n/i18n';
import { describe, expect, it } from 'vitest';

import { getAgentChannelPlatform, isRegisteredAgentChannelPlatform } from './registry';

const text = (key: BaseTextKey) => key;

describe('agent channel platform registry', () => {
	it('provides a safe fallback for unknown catalog entries', () => {
		const platform = getAgentChannelPlatform('future-channel');
		const action = platform.getConnectAction(
			{ text },
			{ loading: ref(false), load: async () => {} },
		);

		expect(platform.type).toBe('unknown');
		expect(action).toEqual({ label: 'generic.connect' });
		expect(platform.setupComponent).toBeDefined();
		expect(platform.editComponent).toBeDefined();
	});

	it('narrows registered platform keys', () => {
		expect(isRegisteredAgentChannelPlatform('slack')).toBe(true);
		expect(isRegisteredAgentChannelPlatform('future-channel')).toBe(false);
		expect(isRegisteredAgentChannelPlatform('teams')).toBe(true);
	});

	it.each([true, false])('uses Connect for Slack when managed setup is %s', (available) => {
		const platform = getAgentChannelPlatform('slack');
		const runtime = {
			loading: ref(false),
			load: async () => {},
			setup: ref({ managedSetupAvailable: available, managerCredentials: [] }),
		};
		const action = platform.getConnectAction({ text }, runtime);

		expect(action).toEqual({ label: 'generic.connect' });
	});

	it('confirms removal only for managed Slack credentials on published agents', () => {
		const platform = getAgentChannelPlatform('slack');
		const runtime = {
			loading: ref(false),
			load: async () => {},
			setup: ref({ managedSetupAvailable: true, managerCredentials: [] }),
			isManagedCredential: (credentialId: string) => credentialId === 'managed',
		};

		expect(platform.shouldConfirmDisconnect?.(runtime, 'managed', { isPublished: true })).toBe(
			true,
		);
		expect(platform.shouldConfirmDisconnect?.(runtime, 'managed', { isPublished: false })).toBe(
			false,
		);
		expect(platform.shouldConfirmDisconnect?.(runtime, 'manual', { isPublished: true })).toBe(
			false,
		);
		expect(platform.disconnectConfirmationComponent).toBeDefined();
	});

	it('confirms every Teams removal', () => {
		const platform = getAgentChannelPlatform('teams');
		const runtime = { loading: ref(false), load: async () => {} };

		expect(platform.shouldConfirmDisconnect?.(runtime, 'any', { isPublished: false })).toBe(true);
		expect(platform.disconnectConfirmationComponent).toBeDefined();
	});

	it('points a Teams removal that leaves the app behind to the Teams admin center', () => {
		const platform = getAgentChannelPlatform('teams');
		const presentation = platform.presentDisconnectWarning?.(
			{
				integrationType: 'teams',
				code: 'resources_not_deleted',
				action: { type: 'open_url', url: 'https://admin.teams.microsoft.com/policies/manage-apps' },
			},
			{ text },
		);

		expect(presentation?.title).toBe('agents.channels.modal.teamsResourcesNotDeleted.title');
		const wrapper = mount(() => presentation?.message);
		expect(wrapper.text()).toContain('agents.channels.modal.teamsResourcesNotDeleted.message');
		expect(wrapper.get('a').attributes('href')).toBe(
			'https://admin.teams.microsoft.com/policies/manage-apps',
		);
		expect(wrapper.get('a').text()).toBe('agents.channels.modal.teamsResourcesNotDeleted.link');
	});

	it('registers n8n Chat with its "Make available" connect action', () => {
		const platform = getAgentChannelPlatform('n8n_chat');
		const action = platform.getConnectAction(
			{ text },
			{ loading: ref(false), load: async () => {} },
		);

		expect(platform.type).toBe('n8n_chat');
		expect(action).toEqual({ label: 'agents.channels.n8nChat.makeAvailable' });
		expect(platform.setupComponent).toBeDefined();
		expect(platform.editComponent).toBeDefined();
		expect(platform.setupComponent).toBe(platform.editComponent);
	});

	it('presents the generic Slack disconnect warning contract', () => {
		const platform = getAgentChannelPlatform('slack');
		const presentation = platform.presentDisconnectWarning?.(
			{
				integrationType: 'slack',
				code: 'app_not_deleted',
				action: { type: 'open_url', url: 'https://api.slack.com/apps/A123' },
			},
			{ text },
		);

		expect(presentation?.title).toBe('agents.channels.modal.slackAppNotDeleted.title');
		expect(presentation?.message).toBeDefined();
	});
});
