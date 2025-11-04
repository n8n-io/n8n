/**
 * 管理后台模块配置
 * 定义可用模块、权限和导航
 */

export interface AdminModule {
	id: string;
	name: string;
	icon: string;
	path: string;
	enabled: boolean; // 是否已实现
	description?: string;
	children?: AdminModule[];
}

/**
 * 可用模块列表
 */
export const modules: AdminModule[] = [
	{
		id: 'telemetry',
		name: 'Telemetry 数据分析',
		icon: 'chart-line',
		path: '/telemetry',
		enabled: true,
		description: '查看和分析应用程序遥测事件数据',
		children: [
			{
				id: 'telemetry-dashboard',
				name: '仪表板',
				icon: 'tachometer-alt',
				path: '/telemetry/dashboard',
				enabled: true,
			},
			{
				id: 'telemetry-events',
				name: '事件列表',
				icon: 'list',
				path: '/telemetry/events',
				enabled: true,
			},
			{
				id: 'telemetry-analytics',
				name: '数据分析',
				icon: 'chart-bar',
				path: '/telemetry/analytics',
				enabled: true,
			},
			{
				id: 'telemetry-users',
				name: '用户统计',
				icon: 'users',
				path: '/telemetry/users',
				enabled: true,
			},
		],
	},
	{
		id: 'workspaces',
		name: '工作空间管理',
		icon: 'layer-group',
		path: '/workspaces',
		enabled: false, // 未实现
		description: '管理个人和团队工作空间',
	},
	{
		id: 'users',
		name: '用户管理',
		icon: 'user-cog',
		path: '/users',
		enabled: false, // 未实现
		description: '全面监控和控制用户生命周期',
	},
	{
		id: 'system',
		name: '系统设置',
		icon: 'cog',
		path: '/system',
		enabled: false, // 未实现
		description: '系统配置和参数管理',
	},
	{
		id: 'audit',
		name: '审计日志',
		icon: 'history',
		path: '/audit',
		enabled: false, // 未实现
		description: '查看系统操作审计日志',
	},
	{
		id: 'billing',
		name: '计费管理',
		icon: 'dollar-sign',
		path: '/billing',
		enabled: false, // 未实现
		description: '计费、充值和订阅管理',
	},
];

/**
 * 获取已启用的模块
 */
export function getEnabledModules(): AdminModule[] {
	return modules.filter((m) => m.enabled);
}

/**
 * 获取模块配置
 */
export function getModule(id: string): AdminModule | undefined {
	return modules.find((m) => m.id === id);
}
