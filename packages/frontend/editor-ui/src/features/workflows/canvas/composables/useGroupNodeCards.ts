import { computed, type ComputedRef } from 'vue';
import {
	getGroupEntryMap,
	getInteriorNodes,
	isGroupNode,
	type IConnections,
	type IWorkflowGroup,
} from 'n8n-workflow';
import type { INodeUi } from '@/Interface';

/**
 * The group cards the canvas draws, derived from the group nodes.
 *
 * A group is a node of type `n8n-nodes-base.group`. Its `name` is the card
 * title and its `parameters.objective` is the description. Its members are the
 * nodes that carry its id in `parentId`.
 *
 * The canvas renderer takes `IWorkflowGroup` values, so this maps each group
 * node onto that shape. Every downstream consumer — the mapping, the layout,
 * the card component — then works unchanged on both paths, and only the source
 * of the groups differs.
 *
 * Emptiness is derived from the members, never stored, so it cannot fall out of
 * step with them.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */
export function useGroupNodeCards(
	nodes: ComputedRef<INodeUi[]>,
	connections: ComputedRef<IConnections>,
) {
	const groupNodes = computed(() => nodes.value.filter(isGroupNode));

	/** Member node ids for each group id. */
	const memberIdsByGroupId = computed(() => {
		const index = new Map<string, string[]>();
		for (const group of groupNodes.value) {
			index.set(
				group.id,
				getInteriorNodes(nodes.value, group.id).map((node) => node.id),
			);
		}
		return index;
	});

	/**
	 * Each group node as the `IWorkflowGroup` the renderer expects. The
	 * description reads from `parameters.objective`.
	 */
	const allGroups = computed<IWorkflowGroup[]>(() =>
		groupNodes.value.map((group) => {
			const objective = group.parameters?.objective;
			return {
				id: group.id,
				name: group.name,
				nodeIds: memberIdsByGroupId.value.get(group.id) ?? [],
				...(typeof objective === 'string' && objective.length > 0
					? { description: objective }
					: {}),
			};
		}),
	);

	/** True when no node names this group as its parent. */
	function isEmptyGroup(groupId: string): boolean {
		return (memberIdsByGroupId.value.get(groupId)?.length ?? 0) === 0;
	}

	/**
	 * The group node's own position. An empty group has no member rect to derive
	 * a card position from, so the card draws here instead.
	 */
	function getGroupOwnPosition(groupId: string): { x: number; y: number } | undefined {
		const group = groupNodes.value.find((node) => node.id === groupId);
		if (group === undefined) return undefined;
		const [x, y] = group.position;
		return { x, y };
	}

	/**
	 * Interior entry node names for each group id, so a boundary edge can fan to
	 * the nodes it really reaches instead of stopping at the card.
	 */
	const entryNodeNamesByGroupId = computed(() => getGroupEntryMap(nodes.value, connections.value));

	function getGroupEntryNodeNames(groupId: string): string[] {
		return entryNodeNamesByGroupId.value.get(groupId) ?? [];
	}

	return {
		allGroups,
		isEmptyGroup,
		getGroupOwnPosition,
		getGroupEntryNodeNames,
	};
}
