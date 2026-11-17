import { KNOWLEDGE_COLLECTIONS_FLAG } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsCollectionsEnabled } from './useIsCollectionsEnabled';

const flagValues = vi.hoisted(() => new Map<string, boolean>());
const activeModules = vi.hoisted(() => new Set<string>());

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: (flag: string) => flagValues.get(flag) === true }),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isModuleActive: (name: string) => activeModules.has(name) }),
}));

describe('useIsCollectionsEnabled', () => {
	beforeEach(() => {
		flagValues.clear();
		activeModules.clear();
	});

	it('is on with the flag on and the knowledge module active', () => {
		flagValues.set(KNOWLEDGE_COLLECTIONS_FLAG, true);
		activeModules.add('knowledge');

		expect(useIsCollectionsEnabled().value).toBe(true);
	});

	it('is off by default', () => {
		activeModules.add('knowledge');

		expect(useIsCollectionsEnabled().value).toBe(false);
	});

	it('is off while the knowledge module is off', () => {
		flagValues.set(KNOWLEDGE_COLLECTIONS_FLAG, true);

		expect(useIsCollectionsEnabled().value).toBe(false);
	});
});
