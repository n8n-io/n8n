import { useI18n } from '@n8n/i18n';
import { defineFrontendModule, splitSearchKeywords } from '@n8n/frontend-module-sdk';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	MCP_AGENTS_VIEW,
	MCP_CLIENTS_VIEW,
	MCP_SETTINGS_VIEW,
	MCP_WORKFLOWS_VIEW,
} from './mcp.constants';

const SettingsMCPView = async () => await import('./SettingsMCPView.vue');
const SettingsMCPWorkflowsView = async () => await import('./SettingsMCPWorkflowsView.vue');
const SettingsMCPAgentsView = async () => await import('./SettingsMCPAgentsView.vue');
const SettingsMCPClientsView = async () => await import('./SettingsMCPClientsView.vue');

export const MCPModule = defineFrontendModule({
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
			path: 'mcp/agents',
			name: MCP_AGENTS_VIEW,
			component: SettingsMCPAgentsView,
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
			order: 10,
			section: 'ai',
			icon: 'mcp',
			get label() {
				return useI18n().baseText('settings.mcp');
			},
			get searchKeywords() {
				return splitSearchKeywords(useI18n().baseText('settings.mcp.search.page'));
			},
			get searchEntries() {
				const i18n = useI18n();
				const canManage = useRBACStore().hasScope('mcp:manage');
				const connectionGroup = i18n.baseText('settings.mcp.connectionDetails.title');
				const accessGroup = i18n.baseText('settings.mcp.access.title');
				return [
					{
						anchor: 'status',
						label: i18n.baseText('settings.mcp.status.title'),
						group: connectionGroup,
						keywords: splitSearchKeywords(i18n.baseText('settings.mcp.search.status')),
					},
					{
						anchor: 'connect-client',
						label: i18n.baseText('settings.mcp.yourClient.title'),
						group: connectionGroup,
						keywords: splitSearchKeywords(i18n.baseText('settings.mcp.search.connectClient')),
					},
					{
						anchor: 'workflows-enabled',
						label: i18n.baseText('settings.mcp.workflowsExposed.title'),
						group: accessGroup,
						keywords: splitSearchKeywords(i18n.baseText('settings.mcp.search.workflowsEnabled')),
					},
					{
						anchor: 'auto-expose',
						label: i18n.baseText('settings.mcp.autoExpose.title'),
						group: accessGroup,
						available: canManage,
					},
					{
						anchor: 'agents-enabled',
						label: i18n.baseText('settings.mcp.agentsExposed.title'),
						group: accessGroup,
						available: useSettingsStore().isAgentsEnabled,
					},
					{
						anchor: 'callback-urls',
						label: i18n.baseText('settings.mcp.callbackUrls.title'),
						group: accessGroup,
						keywords: splitSearchKeywords(i18n.baseText('settings.mcp.search.callbackUrls')),
						available: canManage,
					},
					{
						anchor: 'connected-clients',
						label: i18n.baseText('settings.mcp.connectedClients.title'),
						keywords: splitSearchKeywords(i18n.baseText('settings.mcp.search.connectedClients')),
					},
				];
			},
			position: 'top',
			route: { to: { name: MCP_SETTINGS_VIEW } },
			get available() {
				return useRBACStore().hasScope([
					'mcp:manage',
					'mcp:oauth',
					'mcpApiKey:create',
					'mcpApiKey:rotate',
				]);
			},
		},
	],
});
