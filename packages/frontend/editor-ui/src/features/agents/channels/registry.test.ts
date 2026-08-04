import { ref } from 'vue';
import type { BaseTextKey } from '@n8n/i18n';
import { describe, expect, it } from 'vitest';

import { getAgentChannelPlatform } from './registry';

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

	it('derives Slack list metadata from its local runtime state', () => {
		const platform = getAgentChannelPlatform('slack');
		const runtime = {
			loading: ref(false),
			load: async () => {},
			setup: ref({ managedSetupAvailable: true, managerCredentials: [] }),
		};
		const action = platform.getConnectAction({ text }, runtime);

		expect(action).toEqual({
			label: 'agents.channels.slack.managed.addToSlack',
			icon: 'slack',
		});
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
