import { RouterView } from 'vue-router';
import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { VIEWS } from '@/app/constants';

const MainSidebar = async () => await import('@/app/components/MainSidebar.vue');
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
			components: {
				default: RouterView,
				sidebar: MainSidebar,
			},
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
