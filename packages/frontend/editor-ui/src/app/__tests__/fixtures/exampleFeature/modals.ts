import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import { EXAMPLE_FEATURE_MODAL_KEY } from './exampleFeature.constants';

/** This fixture has the same shape as a real fragment. See `src/features/core/auth/modals.ts`. */
export const EXAMPLE_FEATURE_MODALS: ModalDefinition[] = [
	{
		key: EXAMPLE_FEATURE_MODAL_KEY,
		component: async () => await import('./ExampleFeatureModal.vue'),
		initialState: { open: false },
	},
];
