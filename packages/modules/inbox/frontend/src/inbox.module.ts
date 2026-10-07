import { defineFrontendModule } from '@n8n/frontend-module-sdk';

export const InboxModule = defineFrontendModule({
	id: 'inbox',
	name: 'Inbox',
	description: 'Workflow reviews and saved Assistant results.',
	icon: 'inbox',
	routes: [
		{
			path: '/reviews/:reviewRequestId?',
			name: 'WorkflowReviewRequestsView',
			redirect: (to) => ({
				name: 'Inbox',
				query:
					typeof to.params.reviewRequestId === 'string' && to.params.reviewRequestId
						? { ...to.query, type: 'workflow_review', itemId: to.params.reviewRequestId }
						: to.query,
			}),
		},
		{
			path: '/inbox',
			name: 'Inbox',
			component: async () => await import('./views/InboxView.vue'),
			async beforeEnter() {
				const { useSettingsStore } = await import('@n8n/stores/settings.store');
				return useSettingsStore().settings.inbox?.enabled === true || '/';
			},
			meta: { layout: 'default', middleware: ['authenticated', 'custom'] },
		},
	],
});
