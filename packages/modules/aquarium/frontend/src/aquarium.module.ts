import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { AQUARIUM_VIEW } from './aquarium.constants';

const AquariumView = async () => await import('./views/AquariumView.vue');

/** Frontend-only, with no backend twin: the route skips the `custom` module guard. */
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
			meta: { middleware: ['authenticated'] },
		},
	],
});
