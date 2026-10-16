import { useI18n } from '@n8n/i18n';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { AUTOMATION_MAP_VIEW, AUTOMATION_MAPS_VIEW } from './constants';

const i18n = useI18n();

const AutomationMapsView = async () => await import('./views/AutomationMapsView.vue');
const AutomationMapView = async () => await import('./views/AutomationMapView.vue');

export const AutomationMapsModule = defineFrontendModule({
	id: 'automation-maps',
	name: 'Automation Maps',
	description: 'Explain automations that span many workflows as a living map.',
	icon: 'network',
	routes: [
		{
			name: AUTOMATION_MAPS_VIEW,
			path: '/home/automation-maps',
			component: AutomationMapsView,
			meta: {
				middleware: ['authenticated'],
			},
		},
		{
			name: AUTOMATION_MAP_VIEW,
			path: '/automation-maps/:id',
			component: AutomationMapView,
			props: true,
			meta: {
				layout: 'default',
				middleware: ['authenticated'],
			},
		},
	],
	projectTabs: {
		overview: [
			{
				label: i18n.baseText('automationMaps.tab'),
				value: AUTOMATION_MAPS_VIEW,
				to: { name: AUTOMATION_MAPS_VIEW },
			},
		],
	},
});
