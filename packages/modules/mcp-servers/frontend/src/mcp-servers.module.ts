import { AGENTS_LIST_VIEW, PROJECT_AGENTS } from '@n8n/frontend-constants/agents';
import { VIEWS } from '@n8n/frontend-constants/views';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { i18n } from '@n8n/i18n';
import type { NavigationGuard } from 'vue-router';

import {
	MCP_SERVER_CONNECTIONS_VIEW,
	MCP_SERVER_SHARE_PATH,
	MCP_SERVER_SHARE_VIEW,
	MCP_SERVER_VIEW,
	MCP_SERVERS_LIST_VIEW,
	PROJECT_MCP_SERVERS,
} from './mcp-servers.constants';
import { getMcpServerPermissions, isCustomMcpServersEnabled } from './mcp-servers.permissions';

const McpServersListView = async () => await import('./views/McpServersListView.vue');
const McpServerView = async () => await import('./views/McpServerView.vue');
const McpServerShareView = async () => await import('./views/McpServerShareView.vue');

const guardOverviewRoute: NavigationGuard = () =>
	isCustomMcpServersEnabled() || { name: VIEWS.WORKFLOWS };

function guardProjectRoute(permission: 'canList' | 'canRead'): NavigationGuard {
	return (to) =>
		(isCustomMcpServersEnabled() &&
			typeof to.params.projectId === 'string' &&
			getMcpServerPermissions(to.params.projectId)[permission]) || {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: to.params.projectId },
		};
}

export const McpServersModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'mcp-servers',
	name: 'MCP servers',
	description: 'Custom MCP servers that hand workflows of a project to AI clients',
	icon: 'mcp',
	routes: [
		{
			name: MCP_SERVERS_LIST_VIEW,
			path: '/home/mcp-servers',
			component: McpServersListView,
			meta: { middleware: ['authenticated', 'custom'] },
			beforeEnter: guardOverviewRoute,
		},
		{
			name: PROJECT_MCP_SERVERS,
			path: 'mcp-servers',
			component: McpServersListView,
			meta: { projectRoute: true, middleware: ['authenticated', 'custom'] },
			beforeEnter: guardProjectRoute('canList'),
		},
		{
			name: MCP_SERVER_VIEW,
			path: 'mcp-servers/:serverId',
			component: McpServerView,
			meta: { projectRoute: true, middleware: ['authenticated', 'custom'] },
			beforeEnter: guardProjectRoute('canRead'),
		},
		{
			name: MCP_SERVER_CONNECTIONS_VIEW,
			path: 'mcp-servers/:serverId/connections',
			component: McpServerView,
			meta: { projectRoute: true, middleware: ['authenticated', 'custom'] },
			beforeEnter: guardProjectRoute('canRead'),
		},
		{
			// No middleware: anyone with the link opens the page. The backend answers 404 when the
			// flag is off, so the page shows "not found" without a flag check here.
			name: MCP_SERVER_SHARE_VIEW,
			path: `${MCP_SERVER_SHARE_PATH}/:slug`,
			component: McpServerShareView,
			meta: { layout: 'auth' },
		},
	],
	projectTabs: {
		overview: [
			{
				// A getter: the shell reads the label at render time, after it loads the locale.
				get label() {
					return i18n.baseText('mcpServers.tab');
				},
				value: MCP_SERVERS_LIST_VIEW,
				preview: true,
				// The shell adds module tabs after its own tabs. Without "Agents", the tab goes last.
				insertAfter: AGENTS_LIST_VIEW,
				to: { name: MCP_SERVERS_LIST_VIEW },
				available: () => isCustomMcpServersEnabled(),
			},
		],
		project: [
			{
				get label() {
					return i18n.baseText('mcpServers.tab');
				},
				value: PROJECT_MCP_SERVERS,
				preview: true,
				insertAfter: PROJECT_AGENTS,
				dynamicRoute: { name: PROJECT_MCP_SERVERS, includeProjectId: true },
				available: (projectId) =>
					isCustomMcpServersEnabled() &&
					projectId !== undefined &&
					getMcpServerPermissions(projectId).canList,
			},
		],
	},
});
