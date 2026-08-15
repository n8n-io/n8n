import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from './constants';

export const INSTANCE_AI_MODALS: ModalDefinition[] = [
	{
		key: INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
		component: async () => await import('./components/modals/ComputerUseSetupModal.vue'),
		initialState: { open: false },
	},
	{
		key: INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
		component: async () => await import('./components/modals/BrowserUseSetupModal.vue'),
		initialState: { open: false },
	},
	{
		key: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
		component: async () =>
			await import('./components/modals/InstanceAiToolsConnectionModalWrapper.vue'),
		initialState: { open: false },
	},
];
