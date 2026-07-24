import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { VIEWS } from '@/app/constants';

import { useWorkflowReviewsFeature } from './composables/useWorkflowReviewsFeature';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from './constants';

const WorkflowReviewRequestsView = async () =>
	await import('./views/WorkflowReviewRequestsView.vue');

export const WorkflowReviewsModule: FrontendModuleDescription = {
	id: 'workflow-reviews',
	name: 'Workflow Reviews',
	description: 'Cross-project workflow review inbox.',
	icon: 'message-square-text',
	routes: [
		{
			path: '/workflow-review-requests',
			name: WORKFLOW_REVIEW_REQUESTS_VIEW,
			component: WorkflowReviewRequestsView,
			beforeEnter() {
				return (
					useWorkflowReviewsFeature().isWorkflowReviewsEnabled.value || {
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
