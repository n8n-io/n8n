import { AGENTS_N8N_CHAT_FLAG } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';

import { usePostHog } from '@/app/stores/posthog.store';
import { useAgentsN8nChatFlag, useAgentsN8nChatVariant } from '../composables/useAgentsN8nChatFlag';

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

describe('useAgentsN8nChatVariant', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useSettingsStore().settings.activeModules = ['agents'];
	});

	it.each([
		['variant-a', true, false],
		['variant-b', false, true],
		['control', false, false],
		[undefined, false, false],
	])('for %s, isVariantA=%s and isVariantB=%s', (value, expectedA, expectedB) => {
		const posthog = usePostHog();
		posthog.overrides = value === undefined ? {} : { [AGENTS_N8N_CHAT_FLAG]: { value } };
		const { isVariantA, isVariantB } = useAgentsN8nChatVariant();
		expect(isVariantA.value).toBe(expectedA);
		expect(isVariantB.value).toBe(expectedB);
	});

	it('turns both variants off while the agents module is inactive', () => {
		useSettingsStore().settings.activeModules = [];
		usePostHog().overrides = { [AGENTS_N8N_CHAT_FLAG]: { value: 'variant-a' } };
		const { isVariantA, isVariantB } = useAgentsN8nChatVariant();
		expect(isVariantA.value).toBe(false);
		expect(isVariantB.value).toBe(false);
	});
});
