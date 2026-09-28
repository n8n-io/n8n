import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import { APP_CONNECTIONS_MODAL_KEY } from './apps.constants';

export const APPS_MODALS: ModalDefinition[] = [
	{
		key: APP_CONNECTIONS_MODAL_KEY,
		component: async () => await import('./components/AppConnectionsModal.vue'),
		initialState: { open: false },
	},
];
