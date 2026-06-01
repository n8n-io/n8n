import type { FrontendSettings } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useSettingsStore } from '@/app/stores/settings.store';

import { useRedactionEnforcementFeatureFlag } from './useRedactionEnforcementFeatureFlag';

describe('useRedactionEnforcementFeatureFlag', () => {
	const setup = (flagValue?: string) => {
		setActivePinia(createTestingPinia());
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			envFeatureFlags:
				flagValue === undefined ? {} : { N8N_ENV_FEAT_REDACTION_ENFORCEMENT: flagValue },
		} as unknown as FrontendSettings;
		return useRedactionEnforcementFeatureFlag();
	};

	it('is disabled when the flag is unset', () => {
		expect(setup().isEnabled.value).toBe(false);
	});

	it("is enabled when the flag is 'true'", () => {
		expect(setup('true').isEnabled.value).toBe(true);
	});
});
