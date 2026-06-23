import type {
	AgentCapabilitySummary,
	AgentCapabilityTool,
	ChatIntegrationDescriptor,
} from '@n8n/api-types';
import { updatedIconSet, type IconName } from '@n8n/design-system/components/N8nIcon';
import { formatToolNameForDisplay } from '@/features/agents/utils/toolDisplayName';
import { MIN_GROUPED_TOOLS_PER_TYPE } from '@/features/agents/components/AgentCapabilitiesSection.utils';

export interface AgentCardChip {
	/** Stable key for v-for and overflow dropdown item ids. */
	key: string;
	icon: IconName;
	label: string;
}

/**
 * Resolves a node tool's friendly node-type display name (with the " Tool"
 * suffix stripped), or `undefined` when the node type isn't loaded. Backed by
 * the node-types store in the component so this module stays pure.
 */
export type ResolveNodeTypeLabel = (nodeType: string, version?: number) => string | undefined;

/** Default before capabilities collapse into a "+N" overflow dropdown. */
export const MAX_INLINE_AGENT_CHIPS = 8;

const TOOL_ICONS = {
	workflow: 'workflow',
	custom: 'code',
	node: 'wrench',
} as const satisfies Record<AgentCapabilityTool['type'], IconName>;

function isIconName(icon: unknown): icon is IconName {
	return typeof icon === 'string' && icon in updatedIconSet;
}

function individualToolChip(tool: AgentCapabilityTool, index: number): AgentCardChip {
	return {
		key: `tool:${tool.type}:${tool.name}:${index}`,
		icon: TOOL_ICONS[tool.type],
		// Mirror the agent edit page, which humanizes every tool name (raw node
		// tool ids like `get_available_dates` → "Get available dates").
		label: formatToolNameForDisplay(tool.name),
	};
}

/**
 * Builds the tool chips, mirroring the edit page's `buildToolRows`: node tools
 * of the same (resolved) node type collapse into one "N {NodeType}" chip once
 * there are {@link MIN_GROUPED_TOOLS_PER_TYPE} or more; everything else (workflow
 * and custom tools, single node tools, and node tools whose type isn't loaded)
 * stays an individual humanized chip. Original ordering is preserved.
 */
function buildToolChips(
	tools: AgentCapabilityTool[],
	resolveNodeTypeLabel?: ResolveNodeTypeLabel,
): AgentCardChip[] {
	const ungrouped: Array<{ index: number; chip: AgentCardChip }> = [];
	const nodeGroups = new Map<string, Array<{ tool: AgentCapabilityTool; index: number }>>();
	const nodeTypeLabels = new Map<string, string>();

	tools.forEach((tool, index) => {
		const label =
			tool.type === 'node' && tool.nodeType
				? resolveNodeTypeLabel?.(tool.nodeType, tool.nodeTypeVersion)
				: undefined;

		// Groupable only when it's a node tool whose node type resolves.
		if (tool.type !== 'node' || !tool.nodeType || !label) {
			ungrouped.push({ index, chip: individualToolChip(tool, index) });
			return;
		}

		nodeTypeLabels.set(tool.nodeType, label);
		const group = nodeGroups.get(tool.nodeType) ?? [];
		group.push({ tool, index });
		nodeGroups.set(tool.nodeType, group);
	});

	const entries = [...ungrouped];
	for (const [nodeType, group] of nodeGroups) {
		if (group.length >= MIN_GROUPED_TOOLS_PER_TYPE) {
			entries.push({
				index: group[0].index,
				chip: {
					key: `tool:node:${nodeType}`,
					icon: TOOL_ICONS.node,
					label: `${group.length} ${nodeTypeLabels.get(nodeType)}`,
				},
			});
		} else {
			for (const { tool, index } of group) {
				entries.push({ index, chip: individualToolChip(tool, index) });
			}
		}
	}

	return entries.sort((left, right) => left.index - right.index).map((entry) => entry.chip);
}

/**
 * Flattens an agent's capability summary into the ordered chip list shown on the
 * canvas card: channels (grouped by integration type with a count prefix when
 * repeated), then tools, skills and tasks. Channel labels/icons resolve from the
 * integrations catalog when loaded, falling back to the raw type + a generic icon.
 * Node tools resolve their friendly node-type names (and group) via
 * {@link resolveNodeTypeLabel}.
 */
export function buildAgentCardChips(
	summary: AgentCapabilitySummary,
	integrations: ChatIntegrationDescriptor[] | null,
	resolveNodeTypeLabel?: ResolveNodeTypeLabel,
): AgentCardChip[] {
	const chips: AgentCardChip[] = [];

	const channelCounts = new Map<string, number>();
	for (const channel of summary.channels) {
		channelCounts.set(channel.type, (channelCounts.get(channel.type) ?? 0) + 1);
	}
	for (const [type, count] of channelCounts) {
		const integration = integrations?.find((entry) => entry.type === type);
		const label = integration?.label ?? type;
		const icon = integration && isIconName(integration.icon) ? integration.icon : 'zap';
		chips.push({
			key: `channel:${type}`,
			icon,
			label: count > 1 ? `${count} ${label}` : label,
		});
	}

	chips.push(...buildToolChips(summary.tools, resolveNodeTypeLabel));

	for (const skill of summary.skills) {
		chips.push({ key: `skill:${skill.id}`, icon: 'sparkles', label: skill.name });
	}

	for (const task of summary.tasks) {
		chips.push({ key: `task:${task.id}`, icon: 'clipboard-list', label: task.name });
	}

	return chips;
}
