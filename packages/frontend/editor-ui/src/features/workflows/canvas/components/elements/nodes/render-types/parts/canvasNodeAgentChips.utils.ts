import type { AgentCapabilitySummary, AgentCapabilityTool } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system/components/N8nIcon';
import { formatToolNameForDisplay } from '@/features/agents/utils/toolDisplayName';
import { MIN_GROUPED_TOOLS_PER_TYPE } from '@/features/agents/components/AgentCapabilitiesSection.utils';

export interface AgentCardChip {
	/** Stable key for v-for and overflow dropdown item ids. */
	key: string;
	/** Fallback design-system icon, used when `nodeType` is absent or unresolved. */
	icon: IconName;
	label: string;
	/**
	 * Node type + version for node-tool chips, so the chip can render the node's
	 * own icon (via `NodeIcon`) instead of the generic fallback. Absent for
	 * skills, workflow and custom tools.
	 */
	nodeType?: string;
	nodeTypeVersion?: number;
}

/**
 * Resolves a node tool's friendly node-type display name (with the " Tool"
 * suffix stripped), or `undefined` when the node type isn't loaded.
 */
export type ResolveNodeTypeLabel = (nodeType: string, version?: number) => string | undefined;

/** Default before capabilities collapse into a "+N" overflow dropdown. */
export const MAX_INLINE_AGENT_CHIPS = 8;

const TOOL_ICONS = {
	workflow: 'workflow',
	custom: 'code',
	node: 'wrench',
} as const satisfies Record<AgentCapabilityTool['type'], IconName>;

function individualToolChip(tool: AgentCapabilityTool, index: number): AgentCardChip {
	return {
		key: `tool:${tool.type}:${tool.name}:${index}`,
		icon: TOOL_ICONS[tool.type],
		// Mirror the agent edit page, which humanizes every tool name.
		label: formatToolNameForDisplay(tool.name),
		nodeType: tool.nodeType,
		nodeTypeVersion: tool.nodeTypeVersion,
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
					// All members share this node type, so the group chip shows its icon.
					nodeType,
					nodeTypeVersion: group[0].tool.nodeTypeVersion,
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
 * canvas card: tools first, then skills. Channels and tasks are intentionally
 * omitted. Node tools resolve their friendly
 * node-type names (and group) via {@link resolveNodeTypeLabel}.
 */
export function buildAgentCardChips(
	summary: AgentCapabilitySummary,
	resolveNodeTypeLabel?: ResolveNodeTypeLabel,
): AgentCardChip[] {
	const chips: AgentCardChip[] = [];

	chips.push(...buildToolChips(summary.tools, resolveNodeTypeLabel));

	for (const skill of summary.skills) {
		chips.push({ key: `skill:${skill.id}`, icon: 'sparkles', label: skill.name });
	}

	return chips;
}
