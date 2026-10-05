import { AGENTS_N8N_CHAT_FLAG } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';

import { usePostHog } from '@/app/stores/posthog.store';
import { useAgentsN8nChatFlag } from '../composables/useAgentsN8nChatFlag';

describe('useAgentsN8nChatFlag', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it.each([
		['variant', true],
		['variant-b', true],
		['control', false],
		[true, false],
		[false, false],
		[undefined, false],
	])('returns %s → %s', (value, expected) => {
		const posthog = usePostHog();
		posthog.overrides = value === undefined ? {} : { [AGENTS_N8N_CHAT_FLAG]: { value } };
		expect(useAgentsN8nChatFlag().value).toBe(expected);
	});
});
