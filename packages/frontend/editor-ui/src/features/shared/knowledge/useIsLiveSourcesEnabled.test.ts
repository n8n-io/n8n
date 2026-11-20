import type { FrontendModuleSettings } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsLiveSourcesEnabled } from './useIsLiveSourcesEnabled';

const activeModules = vi.hoisted(() => new Set<string>());
const settingsState = vi.hoisted(() => ({ moduleSettings: {} as FrontendModuleSettings }));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		isModuleActive: (name: string) => activeModules.has(name),
		moduleSettings: settingsState.moduleSettings,
	}),
}));

const limits = { maxFileSizeBytes: 1, maxFilesPerUpload: 1, maxTotalSizeBytes: 1 };

describe('useIsLiveSourcesEnabled', () => {
	beforeEach(() => {
		activeModules.clear();
		settingsState.moduleSettings = {};
	});

	it('is on with the operator setting and the knowledge module active', () => {
		activeModules.add('knowledge');
		settingsState.moduleSettings = { knowledge: { limits, liveSourcesEnabled: true } };

		expect(useIsLiveSourcesEnabled().value).toBe(true);
	});

	it('is off by default', () => {
		activeModules.add('knowledge');
		settingsState.moduleSettings = { knowledge: { limits } };

		expect(useIsLiveSourcesEnabled().value).toBe(false);
	});

	it('is off while the knowledge module is off', () => {
		settingsState.moduleSettings = { knowledge: { limits, liveSourcesEnabled: true } };

		expect(useIsLiveSourcesEnabled().value).toBe(false);
	});
});
