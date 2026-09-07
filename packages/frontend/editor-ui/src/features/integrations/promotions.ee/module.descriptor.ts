import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { PROMOTIONS_MODALS } from './modals';

export const PromotionsModule: FrontendModuleDescription = {
	id: 'promotions',
	name: 'Promotions',
	description: 'Promote workflow changes between environments',
	icon: 'upload',
	modals: PROMOTIONS_MODALS,
};
