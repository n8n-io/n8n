import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { FrontendSettings } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useCredentialSharing } from './useCredentialSharing';

describe('useCredentialSharing', () => {
	const setup = (settings: Partial<FrontendSettings>) => {
		setActivePinia(createTestingPinia());
		useSettingsStore().settings = settings as FrontendSettings;
		return useCredentialSharing();
	};

	it('is enabled when the instance reports the feature on', () => {
		expect(setup({ granularCredentialSharing: true }).isEnabled.value).toBe(true);
	});

	it('is disabled when the instance reports the feature off', () => {
		expect(setup({ granularCredentialSharing: false }).isEnabled.value).toBe(false);
	});

	it('is disabled against an instance too old to send the flag', () => {
		expect(setup({}).isEnabled.value).toBe(false);
	});
});
