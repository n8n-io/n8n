import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import { EXAMPLE_FEATURE_MODAL_KEY } from './exampleFeature.constants';

/**
 * Fixture fragment, shaped exactly like a real one (`src/features/core/auth/modals.ts`).
 * It exists so `modal-fragment.contract.test.ts` can add a modal the way a feature
 * author would — and so that test breaks if the fragment convention changes.
 */
export const EXAMPLE_FEATURE_MODALS: ModalDefinition[] = [
	{
		key: EXAMPLE_FEATURE_MODAL_KEY,
		component: async () => await import('./ExampleFeatureModal.vue'),
		initialState: { open: false },
	},
];
