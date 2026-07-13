import { useI18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODALS } from '@/experiments/exposeAllWorkflowsToMcp/modals';
import { SURFACE_MCP_TO_NEW_CLOUD_USERS_MODALS } from '@/experiments/surfaceMcpToNewCloudUsers/modals';
import {
	MCP_CLIENTS_VIEW,
	MCP_CONNECT_WORKFLOWS_MODAL_KEY,
	MCP_SETTINGS_VIEW,
	MCP_WORKFLOWS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import { hasPermission } from '@/app/utils/rbac/permissions';

const i18n = useI18n();

const SettingsMCPView = async () => await import('@/features/ai/mcpAccess/SettingsMCPView.vue');
const SettingsMCPWorkflowsView = async () =>
	await import('@/features/ai/mcpAccess/SettingsMCPWorkflowsView.vue');
const SettingsMCPClientsView = async () =>
	await import('@/features/ai/mcpAccess/SettingsMCPClientsView.vue');

export const MCPModule: FrontendModuleDescription = {
	id: 'mcp',
	name: 'MCP Server',
	description: 'Access your n8n instance through MCP clients',
	icon: 'mcp',
	routes: [
		{
			path: 'mcp',
			name: MCP_SETTINGS_VIEW,
			component: SettingsMCPView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
		{
			path: 'mcp/workflows',
			name: MCP_WORKFLOWS_VIEW,
			component: SettingsMCPWorkflowsView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
		{
			path: 'mcp/clients',
			name: MCP_CLIENTS_VIEW,
			component: SettingsMCPClientsView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-mcp',
			icon: 'mcp',
			label: i18n.baseText('settings.mcp'),
			position: 'top',
			route: { to: { name: MCP_SETTINGS_VIEW } },
			get available() {
				return hasPermission(['rbac'], {
					rbac: { scope: ['mcp:oauth', 'mcpApiKey:create', 'mcpApiKey:rotate'] },
				});
			},
		},
	],
	modals: [
		{
			key: MCP_CONNECT_WORKFLOWS_MODAL_KEY,
			component: async () => await import('./modals/MCPConnectWorkflowsModal.vue'),
			initialState: { open: false },
		},
		...SURFACE_MCP_TO_NEW_CLOUD_USERS_MODALS,
		...EXPOSE_ALL_WORKFLOWS_TO_MCP_MODALS,
	],
};
