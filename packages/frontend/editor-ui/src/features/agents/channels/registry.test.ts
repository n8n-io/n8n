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

	it('uses manual-only Slack list metadata', () => {
		const platform = getAgentChannelPlatform('slack');
		const runtime = {
			loading: ref(false),
			load: async () => {},
		};
		const action = platform.getConnectAction({ text }, runtime);

		expect(action).toEqual({ label: 'generic.connect' });
	});

	it('narrows registered platform keys without casting', () => {
		expect(isRegisteredAgentChannelPlatform('slack')).toBe(true);
		expect(isRegisteredAgentChannelPlatform('future-channel')).toBe(false);
	});
});
