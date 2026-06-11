import type { ModalDefinition } from '@/app/moduleInitializer/module.types';
import {
	SURFACE_MCP_FIRST_OPEN_INTRO_MODAL_KEY,
	SURFACE_MCP_ONBOARDING_MODAL_KEY,
} from './constants';

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
	{
		key: SURFACE_MCP_FIRST_OPEN_INTRO_MODAL_KEY,
		component: async () => await import('./components/SurfaceMcpFirstOpenIntroModal.vue'),
		initialState: { open: false },
	},
];
