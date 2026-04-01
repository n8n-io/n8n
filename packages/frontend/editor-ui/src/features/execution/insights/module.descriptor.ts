import { RouterView } from 'vue-router';
import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import {
	INSIGHT_TYPES,
	isInsightsViewType,
} from '@/features/execution/insights/insights.constants';
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
						const insightType = Array.isArray(to.params.insightType)
							? to.params.insightType[0]
							: to.params.insightType;

						if (isInsightsViewType(insightType)) return true;

						return {
							name: VIEWS.INSIGHTS,
							params: { ...to.params, insightType: INSIGHT_TYPES.TOTAL },
							query: to.query,
							hash: to.hash,
							replace: true,
						};
					},
					component: InsightsDashboard,
					props: true,
				},
			],
		},
	],
};
