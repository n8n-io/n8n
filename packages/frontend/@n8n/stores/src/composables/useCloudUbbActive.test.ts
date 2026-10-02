import type { FrontendSettings } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { useSettingsStore } from '../settings.store';
import { ASSISTANT_CLOUD_UBB_GA_DATE, useCloudUbbActive } from './useCloudUbbActive';

let settingsStore: ReturnType<typeof useSettingsStore>;

const settingsFor = ({ cloudUbbEnabled = false }: { cloudUbbEnabled?: boolean } = {}) =>
	mock<FrontendSettings>({
		aiAssistant: { enabled: true, setup: true, cloudUbbEnabled },
	});

describe('useCloudUbbActive', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		settingsStore = useSettingsStore();
		vi.useFakeTimers();
		// Freeze before GA so the license flag is the only lever unless a test steps past GA.
		vi.setSystemTime(new Date('2026-09-15T00:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('is true when the entitlement flag is set, before GA', () => {
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: true }));

		const { isActive } = useCloudUbbActive();

		expect(isActive.value).toBe(true);
	});

	test('is false when the entitlement flag is not set, before GA', () => {
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: false }));

		const { isActive } = useCloudUbbActive();

		expect(isActive.value).toBe(false);
	});

	test('is true at or past GA even without the entitlement flag', () => {
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: false }));
		vi.setSystemTime(ASSISTANT_CLOUD_UBB_GA_DATE);

		const { isActive } = useCloudUbbActive();

		expect(isActive.value).toBe(true);
	});

	// A tab kept open across the GA cutoff must flip on its own; `useNow` is why
	// this composable exists over a plain `Date.now()`. Mount before GA, then
	// advance the fake clock past it and past one poll interval to trigger the tick.
	test('reactively flips isActive when the clock crosses GA while mounted', async () => {
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: false }));

		const { isActive } = useCloudUbbActive();
		expect(isActive.value).toBe(false);

		vi.setSystemTime(new Date(ASSISTANT_CLOUD_UBB_GA_DATE.getTime() + 1_000));
		await vi.advanceTimersByTimeAsync(60_000);

		expect(isActive.value).toBe(true);
	});
});
