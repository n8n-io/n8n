import { useI18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@/moduleInitializer/module.types';
import { MCP_SETTINGS_VIEW } from '@/features/mcpAccess/mcp.constants';

const i18n = useI18n();

const SettingsMCPView = async () => await import('@/features/mcpAccess/SettingsMCPView.vue');

export const MCPModule: FrontendModuleDescription = {
	id: 'mcp',
	name: 'MCP Access',
	description: 'Access your n8n instance trough mcp clients',
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
};
