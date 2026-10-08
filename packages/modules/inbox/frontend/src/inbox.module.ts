import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import type { RouteRecordSingleView } from 'vue-router';

const inboxView = {
	component: async () => await import('./views/InboxView.vue'),
	async beforeEnter() {
		const { useSettingsStore } = await import('@n8n/stores/settings.store');
		return useSettingsStore().settings.inbox?.enabled === true || '/';
	},
	meta: { layout: 'default', middleware: ['authenticated', 'custom'] },
} satisfies Pick<RouteRecordSingleView, 'component' | 'beforeEnter' | 'meta'>;

export const InboxModule = defineFrontendModule({
	id: 'inbox',
	name: 'Inbox',
	description: 'Workflow reviews and saved Assistant results.',
	icon: 'inbox',
	routes: [
		{
			path: '/reviews/:reviewRequestId?',
			redirect: (to) =>
				typeof to.params.reviewRequestId === 'string' && to.params.reviewRequestId
					? {
							name: 'WorkflowReviewRequestsView',
							params: { reviewId: to.params.reviewRequestId },
							query: to.query,
						}
					: { name: 'Inbox', query: to.query },
		},
		{
			...inboxView,
			path: '/inbox',
			name: 'Inbox',
		},
		{
			...inboxView,
			path: '/inbox/reviews/:reviewId',
			name: 'WorkflowReviewRequestsView',
		},
		{
			...inboxView,
			path: '/inbox/assistant-results/:resultId',
			name: 'InboxAssistantResult',
		},
	],
});
