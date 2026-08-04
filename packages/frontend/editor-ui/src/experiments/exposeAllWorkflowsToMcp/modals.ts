import type { ModalDefinition } from '@n8n/frontend-module-sdk';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from './constants';

export const EXPOSE_ALL_WORKFLOWS_TO_MCP_MODALS: ModalDefinition[] = [
	{
		key: EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY,
		component: async () => await import('./components/ExposeAllWorkflowsToMcpModal.vue'),
		initialState: { open: false },
	},
];
