import type { ModalDefinition } from '@n8n/frontend-module-sdk';
import { MCP_JSON_NUDGE_MODAL_KEY } from './constants';

export const MCP_JSON_NUDGE_MODALS: ModalDefinition[] = [
	{
		key: MCP_JSON_NUDGE_MODAL_KEY,
		component: async () => await import('./components/McpJsonNudgeModal.vue'),
		initialState: { open: false },
	},
];
