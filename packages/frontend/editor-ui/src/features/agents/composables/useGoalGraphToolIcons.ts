import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { IconName } from '@n8n/design-system';
import type { INodeTypeDescription } from 'n8n-workflow';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { toolRefToNode } from './useAgentToolRefAdapter';
import type { AgentJsonConfig } from '../types';

/**
 * Icon for a goal-graph tool node, mirroring the agent-config tool chips: the
 * real node-type icon when available, otherwise a type-based fallback glyph.
 */
export interface GoalGraphToolIcon {
	nodeType: INodeTypeDescription | null;
	fallbackIcon: IconName;
}

/**
 * Resolve tool icons keyed by the runtime tool name that goal attachments
 * reference (custom → `id`, workflow → `name`/`workflow`, node → `name`), so
 * the goal graph renders the same icons as the tool chips on the config page.
 */
export function useGoalGraphToolIcons(config: MaybeRefOrGetter<AgentJsonConfig | null>) {
	const nodeTypesStore = useNodeTypesStore();

	return computed<Record<string, GoalGraphToolIcon>>(() => {
		const icons: Record<string, GoalGraphToolIcon> = {};

		for (const tool of toValue(config)?.tools ?? []) {
			if (tool.type === 'custom') {
				if (tool.id) icons[tool.id] = { nodeType: null, fallbackIcon: 'code' };
			} else if (tool.type === 'workflow') {
				const key = tool.name ?? tool.workflow;
				if (key) icons[key] = { nodeType: null, fallbackIcon: 'workflow' };
			} else if (tool.type === 'node' && tool.name) {
				const node = toolRefToNode(tool);
				const nodeType = node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
				icons[tool.name] = { nodeType, fallbackIcon: 'globe' };
			}
		}

		return icons;
	});
}
