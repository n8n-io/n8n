import { RouterView } from 'vue-router';
import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { VIEWS } from '@/app/constants';

const InsightsDashboard = async () =>
	await import('@/features/execution/insights/components/InsightsDashboard.vue');

export const InsightsModule: FrontendModuleDescription = {
	id: 'insights',
	name: 'Insights',
	description: 'Provides insights and analytics features for projects.',
	icon: 'chart-column-decreasing',
	routes: [
		{
			path: '/insights',
			beforeEnter() {
				const insightsStore = useInsightsStore();
				return insightsStore.isInsightsEnabled || { name: VIEWS.NOT_FOUND };
			},
			component: RouterView,
			meta: {
				// `rbac` middleware only checks global scopes. Insights also allows access
				// via project-level insights:list, so we use `custom` to check canViewInsights
				// which covers both global and project-scoped access.
				middleware: ['authenticated', 'custom'],
				middlewareOptions: {
					custom: () => useInsightsStore().canViewInsights,
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
