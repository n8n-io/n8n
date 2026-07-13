import type { ModalDefinition } from '@/app/moduleInitializer/module.types';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from './constants';

export const EXPOSE_ALL_WORKFLOWS_TO_MCP_MODALS: ModalDefinition[] = [
	{
		key: EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY,
		component: async () => await import('./components/ExposeAllWorkflowsToMcpModal.vue'),
		initialState: { open: false },
	},
];
