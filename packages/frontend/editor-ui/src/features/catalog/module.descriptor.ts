import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { CATALOG_VIEW } from '@/features/catalog/constants';

const CatalogView = async () => await import('@/features/catalog/CatalogView.vue');

export const CatalogModule: FrontendModuleDescription = {
	id: 'catalog',
	name: 'Catalog',
	description: 'Run the workflows you have been given access to, without opening the editor.',
	icon: 'play',
	routes: [
		{
			name: CATALOG_VIEW,
			path: '/catalog',
			component: CatalogView,
			meta: {
				middleware: ['authenticated'],
			},
		},
	],
};
