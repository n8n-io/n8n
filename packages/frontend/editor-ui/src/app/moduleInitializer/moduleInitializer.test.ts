import { createPinia, setActivePinia } from 'pinia';
import { modalRegistry } from '@n8n/frontend-module-sdk';

import { registerModuleModals } from '@/app/moduleInitializer/moduleInitializer';
import {
	ADD_DATA_TABLE_MODAL_KEY,
	DOWNLOAD_DATA_TABLE_MODAL_KEY,
	IMPORT_CSV_MODAL_KEY,
} from '@/features/core/dataTable/constants';

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
