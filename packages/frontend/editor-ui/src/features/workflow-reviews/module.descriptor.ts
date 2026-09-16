import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { VIEWS } from '@/app/constants';

import { useWorkflowReviewsFeature } from './composables/useWorkflowReviewsFeature';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from './constants';

const WorkflowReviewRequestsView = async () =>
	await import('./views/WorkflowReviewRequestsView.vue');

export const WorkflowReviewsModule = defineFrontendModule({
	id: 'workflow-reviews',
	name: 'Workflow Reviews',
	description: 'Cross-project workflow review inbox.',
	icon: 'message-square-text',
	routes: [
		{
			path: '/reviews/:reviewRequestId?',
			name: WORKFLOW_REVIEW_REQUESTS_VIEW,
			component: WorkflowReviewRequestsView,
			beforeEnter() {
				return (
					useWorkflowReviewsFeature().isReviewInboxEnabled.value || {
						name: VIEWS.HOMEPAGE,
					}
				);
			},
			meta: {
				layout: 'default',
				// No 'custom' middleware: it would inject the module-availability check,
				// which `beforeEnter` performs itself so the self-healing flag can bypass it.
				middleware: ['authenticated'],
			},
		},
	],
});
