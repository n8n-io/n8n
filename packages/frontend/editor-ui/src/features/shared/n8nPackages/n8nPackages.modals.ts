import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import { PACKAGE_IMPORT_MODAL_KEY } from './n8nPackages.constants';

export const PACKAGE_MODALS: ModalDefinition[] = [
	{
		key: PACKAGE_IMPORT_MODAL_KEY,
		component: async () => await import('./components/PackageImportModal.vue'),
		initialState: {
			open: false,
			data: {
				projectId: '',
				onImported: async () => {},
			},
		},
	},
];
