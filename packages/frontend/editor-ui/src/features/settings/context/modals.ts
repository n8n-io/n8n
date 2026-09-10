import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import { PREFERENCE_MODAL_KEY } from './context.constants';

export const CONTEXT_MODALS: ModalDefinition[] = [
	{
		key: PREFERENCE_MODAL_KEY,
		component: async () => await import('./components/PreferenceModal.vue'),
		initialState: { open: false },
	},
];
