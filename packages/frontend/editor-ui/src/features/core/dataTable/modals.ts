import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import {
	ADD_DATA_TABLE_MODAL_KEY,
	DOWNLOAD_DATA_TABLE_MODAL_KEY,
	IMPORT_CSV_MODAL_KEY,
} from './constants';

export const DATA_TABLE_MODALS: ModalDefinition[] = [
	{
		key: ADD_DATA_TABLE_MODAL_KEY,
		component: async () => await import('./components/AddDataTableModal.vue'),
		initialState: { open: false },
	},
];

/**
 * Download and import-CSV are rendered per row by DataTableActions, which mints a
 * key per data table (`<prefix>-<id>`). One definition cannot cover N rows, so
 * they are declared rather than registered — otherwise each would look like a
 * modal whose registration was forgotten.
 */
export const DATA_TABLE_AD_HOC_MODAL_KEY_PREFIXES = [
	DOWNLOAD_DATA_TABLE_MODAL_KEY,
	IMPORT_CSV_MODAL_KEY,
];
