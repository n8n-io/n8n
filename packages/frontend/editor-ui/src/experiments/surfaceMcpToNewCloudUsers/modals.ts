import type { ModalDefinition } from '@n8n/frontend-module-sdk';
import { SURFACE_MCP_ONBOARDING_MODAL_KEY } from './constants';

export const SURFACE_MCP_TO_NEW_CLOUD_USERS_MODALS: ModalDefinition[] = [
	{
		key: SURFACE_MCP_ONBOARDING_MODAL_KEY,
		component: async () => await import('./components/onboarding/MCPOnboardingModal.vue'),
		initialState: {
			open: false,
			data: {
				surface: 'tile',
			},
		},
	},
];
