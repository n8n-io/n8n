import { useI18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	MCP_CONNECT_WORKFLOWS_MODAL_KEY,
	MCP_SETTINGS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import { hasPermission } from '@/app/utils/rbac/permissions';

const i18n = useI18n();

const SettingsMCPView = async () => await import('@/features/ai/mcpAccess/SettingsMCPView.vue');

export const MCPModule: FrontendModuleDescription = {
	id: 'mcp',
	name: 'MCP Server',
	description: 'Access your n8n instance through MCP clients',
	icon: 'mcp',
	routes: [
		{
			path: 'mcp',
			name: MCP_SETTINGS_VIEW,
			components: {
				settingsView: SettingsMCPView,
			},
			meta: {
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
	],
};
