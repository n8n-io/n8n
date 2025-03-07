import { RouterView, type RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/constants';

const MainSidebar = async () => await import('@/components/MainSidebar.vue');
const InsightsView = async () => await import('@/features/insights/InsightsView.vue');

export const insightsRoutes: RouteRecordRaw[] = [
	{
		path: '/insights',
		components: {
			default: RouterView,
			sidebar: MainSidebar,
		},
		meta: {
			middleware: ['authenticated'],
		},
		children: [
			{
				path: ':insightType?',
				name: VIEWS.INSIGHTS,
				beforeEnter(to) {
					if (to.params.insightType) return true;
					return Object.assign(to, { params: { ...to.params, insightType: 'total' } });
				},
				component: InsightsView,
				props: true,
			},
		],
	},
];
