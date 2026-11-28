import type { McpServerListItem, McpServerListTool, McpServerToolKind } from '@n8n/api-types';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { AGENT_BUILDER_VIEW } from '@n8n/frontend-constants/agents';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRouter } from 'vue-router';

import { MCP_SERVER_VIEW } from '../mcp-servers.constants';

const KIND_CONFIG: Record<McpServerToolKind, { icon: IconName; labelKey: BaseTextKey }> = {
	node: {
		icon: 'wrench',
		labelKey: 'mcpServers.card.items.group.node',
	},
	workflow: {
		icon: 'workflow',
		labelKey: 'mcpServers.card.items.group.workflow',
	},
	agent: {
		icon: 'bot',
		labelKey: 'mcpServers.card.items.group.agent',
	},
	skill: {
		icon: 'book-open',
		labelKey: 'mcpServers.card.items.group.skill',
	},
};

const DISPLAY_ORDER: McpServerToolKind[] = ['node', 'workflow', 'agent', 'skill'];

/** Building blocks for the MCP server card items dropdown, mirroring `useDependencyMenu`. */
export function useMcpServerItemsMenu() {
	const i18n = useI18n();
	const router = useRouter();

	/** Menu items grouped by kind, with a disabled header per group. Item ids are `<kind>:<id>`. */
	function buildItemMenuItems(
		tools: McpServerListTool[],
		query = '',
	): Array<DropdownMenuItemProps<string>> {
		if (tools.length === 0) return [];

		const normalizedQuery = query.toLowerCase().trim();
		const filtered = normalizedQuery
			? tools.filter((tool) => tool.toolName.toLowerCase().includes(normalizedQuery))
			: tools;

		const groups: Record<McpServerToolKind, McpServerListTool[]> = {
			node: [],
			workflow: [],
			agent: [],
			skill: [],
		};
		for (const tool of filtered) {
			groups[tool.kind].push(tool);
		}

		const items: Array<DropdownMenuItemProps<string>> = [];
		for (const kind of DISPLAY_ORDER) {
			const groupTools = groups[kind];
			if (groupTools.length === 0) continue;

			const config = KIND_CONFIG[kind];
			items.push({
				id: `header-${kind}`,
				label: i18n.baseText(config.labelKey),
				icon: { type: 'icon', value: config.icon },
				disabled: true,
				divided: items.length > 0,
			});

			for (const tool of groupTools) {
				items.push({
					id: `${tool.kind}:${tool.id}`,
					label: tool.toolName,
				});
			}
		}

		return items;
	}

	/** Resolves a menu item id (`<kind>:<id>`) back to its tool summary. */
	function resolveItemMenuId(
		tools: McpServerListTool[],
		value: string,
	): McpServerListTool | undefined {
		const [kind, id] = value.split(':');
		if (!kind || !id) return undefined;
		return tools.find((tool) => tool.kind === kind && tool.id === id);
	}

	/**
	 * Opens the target of a server item. Workflows and agents open in a new tab; node tools and
	 * skills open the server page with their modal deep-linked in the query string.
	 */
	function openServerItem(
		server: Pick<McpServerListItem, 'id' | 'projectId'>,
		item: McpServerListTool,
	): void {
		switch (item.kind) {
			case 'workflow':
				if (item.targetId) {
					const { href } = router.resolve({
						name: VIEWS.WORKFLOW,
						params: { workflowId: item.targetId },
					});
					window.open(href, '_blank', 'noopener,noreferrer');
				}
				break;
			case 'agent':
				if (item.targetId) {
					const { href } = router.resolve({
						name: AGENT_BUILDER_VIEW,
						params: { projectId: server.projectId, agentId: item.targetId },
					});
					window.open(href, '_blank', 'noopener,noreferrer');
				}
				break;
			case 'node':
				void router.push({
					name: MCP_SERVER_VIEW,
					params: { projectId: server.projectId, serverId: server.id },
					query: { tool: item.toolName },
				});
				break;
			case 'skill':
				void router.push({
					name: MCP_SERVER_VIEW,
					params: { projectId: server.projectId, serverId: server.id },
					query: { skill: item.toolName },
				});
				break;
		}
	}

	return { buildItemMenuItems, resolveItemMenuId, openServerItem };
}
