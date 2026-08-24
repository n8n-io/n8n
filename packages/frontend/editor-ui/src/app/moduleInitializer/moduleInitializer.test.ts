import { createPinia, setActivePinia } from 'pinia';
import { modalRegistry, pushHandlerRegistry } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';
import merge from 'lodash/merge';

import {
	registerModuleModals,
	registerModulePushHandlers,
} from '@/app/moduleInitializer/moduleInitializer';
import {
	ADD_DATA_TABLE_MODAL_KEY,
	DOWNLOAD_DATA_TABLE_MODAL_KEY,
	IMPORT_CSV_MODAL_KEY,
} from '@/features/core/dataTable/constants';
import { defaultSettings } from '@/__tests__/defaults';

describe('registerModuleModals', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		modalRegistry.clear();
	});

	it('registers a module-owned modal from its descriptor', () => {
		registerModuleModals();

		expect(modalRegistry.has(ADD_DATA_TABLE_MODAL_KEY)).toBe(true);
	});

	it.each([DOWNLOAD_DATA_TABLE_MODAL_KEY, IMPORT_CSV_MODAL_KEY])(
		'declares %s as an ad-hoc prefix, so per-row keys are not treated as unregistered',
		(prefix) => {
			registerModuleModals();

			expect(modalRegistry.isAdHocKey(`${prefix}-some-table-id`)).toBe(true);
		},
	);

	it('leaves a key that matches no declared prefix unknown', () => {
		registerModuleModals();

		expect(modalRegistry.isAdHocKey('aModalNobodyRegistered')).toBe(false);
	});
});

describe('registerModulePushHandlers', () => {
	const setActiveModules = (activeModules: string[]) => {
		useSettingsStore().setSettings(merge({}, defaultSettings, { activeModules }));
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		pushHandlerRegistry.clear();
	});

	it('registers the handlers of an active module', () => {
		setActiveModules(['instance-ai']);

		registerModulePushHandlers();

		expect(pushHandlerRegistry.has('updateInstanceAiCredits')).toBe(true);
	});

	it('registers nothing for an inactive module', () => {
		setActiveModules([]);

		registerModulePushHandlers();

		// A claimed type also suppresses the shell's built-in handler for it.
		expect(pushHandlerRegistry.getTypes()).toEqual([]);
	});
});
