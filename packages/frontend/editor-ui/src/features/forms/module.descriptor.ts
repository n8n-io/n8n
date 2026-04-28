import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
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
		},
		{
			name: FORMS_WORKFLOW_VIEW,
			path: '/home/forms/:name',
			component: FormsWorkflowView,
			meta: {
				layout: 'workflow',
				middleware: ['authenticated'],
				formsOnlyView: true,
			},
		},
	],
};
