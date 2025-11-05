import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import MainLayout from '@/layouts/MainLayout.vue';

const routes: RouteRecordRaw[] = [
	{
		path: '/',
		redirect: '/telemetry/dashboard',
	},
	{
		path: '/',
		component: MainLayout,
		children: [
			// Telemetry 模块
			{
				path: 'telemetry',
				redirect: '/telemetry/dashboard',
			},
			{
				path: 'telemetry/dashboard',
				name: 'TelemetryDashboard',
				component: () => import('@/modules/telemetry/views/DashboardView.vue'),
				meta: {
					title: 'Telemetry 仪表板',
					module: 'telemetry',
				},
			},
			{
				path: 'telemetry/events',
				name: 'TelemetryEvents',
				component: () => import('@/modules/telemetry/views/EventsView.vue'),
				meta: {
					title: '事件列表',
					module: 'telemetry',
				},
			},
			{
				path: 'telemetry/events/:id',
				name: 'TelemetryEventDetail',
				component: () => import('@/modules/telemetry/views/EventDetailView.vue'),
				meta: {
					title: '事件详情',
					module: 'telemetry',
				},
			},
			{
				path: 'telemetry/analytics',
				name: 'TelemetryAnalytics',
				component: () => import('@/modules/telemetry/views/AnalyticsView.vue'),
				meta: {
					title: '数据分析',
					module: 'telemetry',
				},
			},
			{
				path: 'telemetry/users',
				name: 'TelemetryUsers',
				component: () => import('@/modules/telemetry/views/UsersView.vue'),
				meta: {
					title: '用户统计',
					module: 'telemetry',
				},
			},
		],
	},
	// 错误页面（无布局）
	{
		path: '/forbidden',
		name: 'Forbidden',
		component: () => import('@/views/ForbiddenView.vue'),
		meta: {
			title: '访问被拒绝',
		},
	},
	{
		path: '/:pathMatch(.*)*',
		name: 'NotFound',
		component: () => import('@/views/NotFoundView.vue'),
		meta: {
			title: '页面未找到',
		},
	},
];

const router = createRouter({
	history: createWebHistory('/admin/'),
	routes,
});

/**
 * 路由守卫：基础路由处理
 * TODO: 后续实现独立的管理员账号系统和权限验证
 */
router.beforeEach(async (to, _from, next) => {
	// 更新页面标题
	document.title = (to.meta.title as string) || 'n8n 管理后台';

	// 暂时移除权限验证，允许所有人访问
	// 等待后续实现独立的管理员账号系统
	next();
});

export default router;
