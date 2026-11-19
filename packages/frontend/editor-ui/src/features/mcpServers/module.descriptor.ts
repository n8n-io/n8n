import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { AGENTS_LIST_VIEW } from '@/features/agents/constants';
import {
	MCP_SERVERS_LIST_VIEW,
	MCP_SERVERS_MODULE_ID,
	MCP_SERVER_SHARE_VIEW,
	MCP_SERVER_VIEW,
} from './constants';

const McpServersListView = async (): Promise<unknown> =>
	await import('./views/McpServersListView.vue');
const McpServerView = async (): Promise<unknown> => await import('./views/McpServerView.vue');
const McpServerShareView = async (): Promise<unknown> =>
	await import('./views/McpServerShareView.vue');

/**
 * MCP Servers: servers a user builds for other people and agents. Not the
 * instance MCP server, which stays in Settings.
 */
export const McpServersModule = defineFrontendModule({
	id: MCP_SERVERS_MODULE_ID,
	name: 'MCP Servers',
	description: 'Build MCP servers from workflows, agents and skills',
	icon: 'mcp',
	routes: [
		{
			name: MCP_SERVERS_LIST_VIEW,
			path: '/home/mcp-servers',
			component: McpServersListView,
			meta: {
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: MCP_SERVER_VIEW,
			path: '/home/mcp-servers/:serverId/:tab?',
			component: McpServerView,
			props: true,
			meta: {
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			// Public: the page decides what to show after it asks the server.
			name: MCP_SERVER_SHARE_VIEW,
			path: '/mcp-share/:slug',
			component: McpServerShareView,
			props: true,
			meta: {
				layout: 'auth',
			},
		},
	],
	projectTabs: {
		overview: [
			{
				label: 'MCP Servers',
				value: MCP_SERVERS_LIST_VIEW,
				preview: true,
				insertAfter: AGENTS_LIST_VIEW,
				to: {
					name: MCP_SERVERS_LIST_VIEW,
				},
			},
		],
	},
});
