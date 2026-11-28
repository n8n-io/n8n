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
		['variant-a', true],
		['variant-b', false],
		['control', false],
		[undefined, false],
	])('for %s, isVariantA=%s', (value, expected) => {
		const posthog = usePostHog();
		posthog.overrides = value === undefined ? {} : { [AGENTS_N8N_CHAT_FLAG]: { value } };
		expect(useAgentsN8nChatVariant().isVariantA.value).toBe(expected);
	});

	it('turns variant A off while the agents module is inactive', () => {
		useSettingsStore().settings.activeModules = [];
		usePostHog().overrides = { [AGENTS_N8N_CHAT_FLAG]: { value: 'variant-a' } };
		expect(useAgentsN8nChatVariant().isVariantA.value).toBe(false);
	});

	it('turns variant A off while Agents is turned off in the settings', () => {
		useSettingsStore().moduleSettings = {
			agents: { enabled: false, modules: [], knowledgeBaseEnabled: false, proxyEnabled: false },
		};
		usePostHog().overrides = { [AGENTS_N8N_CHAT_FLAG]: { value: 'variant-a' } };
		expect(useAgentsN8nChatVariant().isVariantA.value).toBe(false);
	});
});
