import { RouterView, type RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/constants';
import { useInsightsStore } from '@/features/insights/insights.store';

const MainSidebar = async () => await import('@/components/MainSidebar.vue');
const InsightsDashboard = async () =>
	await import('@/features/insights/components/InsightsDashboard.vue');

export const insightsRoutes: RouteRecordRaw[] = [
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
];
