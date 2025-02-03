import { RouterView, type RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/constants';

export const routes: RouteRecordRaw = {
	path: '/insights',
	components: {
		default: RouterView,
		sidebar: async () => await import('@/components/MainSidebar.vue'),
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
			component: async () => await import('./views/InsightsView.vue'),
			props: true,
		},
	],
};
