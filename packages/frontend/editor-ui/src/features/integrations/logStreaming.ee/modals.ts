import type { ModalDefinition } from '@n8n/frontend-module-sdk';

export const LOG_STREAM_MODAL_KEY = 'settingsLogStream';

export const LOG_STREAMING_MODALS: ModalDefinition[] = [
	{
		key: LOG_STREAM_MODAL_KEY,
		component: async () => await import('./components/EventDestinationSettingsModalAdapter.vue'),
		initialState: { open: false, data: undefined },
	},
];
