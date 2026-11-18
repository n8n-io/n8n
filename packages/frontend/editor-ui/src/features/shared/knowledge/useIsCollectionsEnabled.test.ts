import { KNOWLEDGE_COLLECTIONS_FLAG, type FrontendModuleSettings } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsCollectionsEnabled } from './useIsCollectionsEnabled';

const flagValues = vi.hoisted(() => new Map<string, boolean>());
const activeModules = vi.hoisted(() => new Set<string>());
const settingsState = vi.hoisted(() => ({ moduleSettings: {} as FrontendModuleSettings }));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: (flag: string) => flagValues.get(flag) === true }),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		isModuleActive: (name: string) => activeModules.has(name),
		moduleSettings: settingsState.moduleSettings,
	}),
}));

const limits = { maxFileSizeBytes: 1, maxFilesPerUpload: 1, maxTotalSizeBytes: 1 };

describe('useIsCollectionsEnabled', () => {
	beforeEach(() => {
		flagValues.clear();
		activeModules.clear();
		settingsState.moduleSettings = {};
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

	it('is on with the operator override and the flag off', () => {
		activeModules.add('knowledge');
		settingsState.moduleSettings = { knowledge: { limits, collectionsEnabled: true } };

		expect(useIsCollectionsEnabled().value).toBe(true);
	});

	it('is off while the knowledge module is off', () => {
		flagValues.set(KNOWLEDGE_COLLECTIONS_FLAG, true);
		settingsState.moduleSettings = { knowledge: { limits, collectionsEnabled: true } };

		expect(useIsCollectionsEnabled().value).toBe(false);
	});
});
