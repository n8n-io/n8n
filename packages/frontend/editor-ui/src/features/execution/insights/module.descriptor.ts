import { RouterView } from 'vue-router';
import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { VIEWS } from '@/app/constants';

const InsightsDashboard = async () => await import('./components/InsightsDashboard.vue');

export const InsightsModule: FrontendModuleDescription = {
	id: 'insights',
	name: 'Insights',
	description: 'Provides insights and analytics features for projects.',
	icon: 'chart-column-decreasing',
	routes: [
		{
			path: '/insights',
			// Loaded inside the guard, not at module top level: the descriptor is imported
			// eagerly by the shell manifest, so a static store import would pull the whole
			// feature into the boot chunk even when the module is disabled.
			async beforeEnter() {
				const { useInsightsStore } = await import('./insights.store');
				return useInsightsStore().isInsightsEnabled || { name: VIEWS.NOT_FOUND };
			},
			component: RouterView,
			meta: {
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: {
					rbac: {
						scope: ['insights:list'],
					},
				},
			},
			children: [
				{
					path: ':insightType?',
					name: VIEWS.INSIGHTS,
					beforeEnter(to) {
						if (to.params.insightType) return true;
						return Object.assign(to, { params: { ...to.params, insightType: 'total' } });
					},
					component: InsightsDashboard,
					props: true,
				},
			],
		},
	],
};
