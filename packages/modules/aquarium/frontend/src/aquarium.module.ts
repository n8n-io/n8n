import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { AQUARIUM_VIEW } from './aquarium.constants';

const AquariumView = async () => await import('./views/AquariumView.vue');

/** Shown only while the backend module is active. It is on by default. */
export const AquariumModule = defineFrontendModule({
	id: 'aquarium',
	name: 'Aquarium',
	description: 'Shows workflows and agents as pixel-art sea creatures',
	icon: 'fish',
	routes: [
		{
			path: '/aquarium',
			name: AQUARIUM_VIEW,
			component: AquariumView,
			// `custom` hides the page unless the backend module is active.
			meta: { middleware: ['authenticated', 'custom'] },
		},
	],
});
