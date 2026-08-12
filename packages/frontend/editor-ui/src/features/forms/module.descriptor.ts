import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { FORMS_VIEW, FORMS_WORKFLOW_VIEW } from './constants';

const FormsView = async () => await import('./views/FormsView.vue');
const FormsWorkflowView = async () => await import('./views/FormsWorkflowView.vue');

export const FormsModule: FrontendModuleDescription = {
	id: 'forms',
	name: 'Forms',
	description: 'Browse and interact with form-based workflows.',
	icon: 'form',
	routes: [
		{
			name: FORMS_VIEW,
			path: '/home/forms',
			component: FormsView,
			meta: {
				middleware: ['authenticated'],
			},
			beforeEnter: (_to, _from, next) => {
				// Refresh the insights summary so the Forms overview shows the same
				// KPI strip the other overview tabs do — parallels DataTableModule.
				const insightsStore = useInsightsStore();
				if (insightsStore.isSummaryEnabled) {
					void insightsStore.weeklySummary.execute();
				}
				next();
			},
		},
		{
			name: FORMS_WORKFLOW_VIEW,
			path: '/home/forms/:workflowId',
			component: FormsWorkflowView,
			meta: {
				layout: 'workflow',
				middleware: ['authenticated'],
				formsOnlyView: true,
			},
		},
	],
};
