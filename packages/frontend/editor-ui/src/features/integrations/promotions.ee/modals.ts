import type { ModalDefinition } from '@n8n/frontend-module-sdk';
import { PROMOTION_SELECT_MODAL_KEY } from './promotions.constants';

export const PROMOTIONS_MODALS: ModalDefinition[] = [
	{
		key: PROMOTION_SELECT_MODAL_KEY,
		component: async () => await import('./components/PromotionSelectModal.vue'),
		initialState: {
			open: false,
			data: {
				projectId: '',
			},
		},
	},
];
