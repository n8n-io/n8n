import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import { ADD_APP_MODAL_KEY, ADD_PAGE_MODAL_KEY } from './apps.constants';

export const APPS_MODALS: ModalDefinition[] = [
	{
		key: ADD_APP_MODAL_KEY,
		component: async () => await import('./components/AddAppModal.vue'),
		initialState: { open: false },
	},
	{
		key: ADD_PAGE_MODAL_KEY,
		component: async () => await import('./components/AddPageModal.vue'),
		initialState: { open: false },
	},
];
