import { modalRegistry, type ModalDefinition } from '@n8n/frontend-module-sdk';

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
 * The download and import-CSV modals are rendered per row by DataTableActions,
 * which mints a key per data table (`<prefix>-<id>`). They are opened through
 * the store but never registered, so they are declared here instead — otherwise
 * every one of them looks like a modal whose registration was forgotten.
 */
[DOWNLOAD_DATA_TABLE_MODAL_KEY, IMPORT_CSV_MODAL_KEY].forEach((prefix) => {
	modalRegistry.declareAdHocKeyPrefix(prefix);
});
