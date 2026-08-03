import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { VIEWS } from '@/app/constants';

import { usePromotionsFeature } from './composables/usePromotionsFeature';
import { PROMOTIONS_VIEW } from './constants';

const PromotionsView = async () => await import('./views/PromotionsView.vue');

export const PromotionsModule: FrontendModuleDescription = {
	id: 'promotions',
	name: 'Promotions',
	description: 'Promote workflows between environments through reviewable pull requests.',
	icon: 'send',
	routes: [
		{
			path: '/promotions',
			name: PROMOTIONS_VIEW,
			component: PromotionsView,
			beforeEnter() {
				return (
					usePromotionsFeature().isPromotionsEnabled.value || {
						name: VIEWS.NOT_FOUND,
					}
				);
			},
			meta: {
				layout: 'default',
				middleware: ['authenticated', 'custom'],
			},
		},
	],
};
