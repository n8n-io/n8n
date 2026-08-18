import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

export interface HealNodeIdsReport {
	/** Nodes that had no id and received a fresh one. */
	filled: Array<{ name: string; newId: string }>;
	/** Nodes that shared their id with another node and received a fresh one. */
	reassigned: Array<{ name: string; oldId: string; newId: string }>;
	/** Exact same-name duplicates removed in favor of their last occurrence. */
	dropped: Array<{ name: string; id: string }>;
}

export type HealNodeIdsResult =
	| { changed: false }
	| { changed: true; nodes: INode[]; report: HealNodeIdsReport };

/**
 * Returns a corrected copy of `nodes` in which every node has a unique,
 * non-empty id, or `{ changed: false }` when the input needs no correction.
 *
 * - Nodes sharing a name and an id — or sharing a name and both lacking an id
 *   — are collapsed to the last occurrence: the one the runtime's name-keyed
 *   node map executes. Giving each its own id instead would leave the
 *   duplicate name in place, which structure validation rejects on the next
 *   save, while the extra node stays dead at runtime. Connections are
 *   name-keyed, so the survivor keeps them.
 * - After the collapse, a missing or empty id is filled with a fresh uuid.
 * - Nodes sharing an id under distinct names keep the id on one of them — the
 *   trigger-like node when exactly one sharer is trigger-like, else the first
 *   — and the rest get fresh uuids. Keeping the contested id alive preserves
 *   what is keyed on it elsewhere: `nodeGroups.nodeIds` references,
 *   `poller_state` rows, and `processed_data` dedup contexts.
 *
 * Same-name nodes with *distinct* ids are left alone: that is a name defect,
 * not an id defect, and it is owned by structure validation.
 *
 * Healing a healed output is a no-op (`{ changed: false }`). This matters
 * because the caller publishes the corrected copy, and that publish enqueues
 * another activation — which runs the healer again, on its own output. If
 * that second pass changed anything (say, because the healer minted fresh
 * uuids on every call), every heal would trigger another publish, forever.
 */
export function healNodeIds(
	nodes: INode[],
	{ isTriggerLike }: { isTriggerLike: (node: INode) => boolean },
): HealNodeIdsResult {
	const report: HealNodeIdsReport = { filled: [], reassigned: [], dropped: [] };

	// All bookkeeping is by array index, not node reference: one object
	// appearing at two positions must count as two occurrences. Nodes without
	// an id are grouped under '' so the same-name collapse applies to them too.
	const byId = new Map<string, number[]>();
	nodes.forEach((node, index) => {
		const key = node.id || '';
		const group = byId.get(key);
		if (group === undefined) {
			byId.set(key, [index]);
		} else {
			group.push(index);
		}
	});

	const dropped = new Set<number>();
	const newIds = new Map<number, string>();

	for (const [id, group] of byId) {
		if (group.length < 2) continue;

		const lastByName = new Map<string, number>();
		for (const index of group) lastByName.set(nodes[index].name, index);
		for (const index of group) {
			if (lastByName.get(nodes[index].name) !== index) {
				dropped.add(index);
				report.dropped.push({ name: nodes[index].name, id });
			}
		}

		// The id-less group has no shared id to keep; its survivors are filled below.
		if (id === '') continue;

		const sharers = group.filter((index) => !dropped.has(index));
		if (sharers.length < 2) continue;

		const triggerLike = sharers.filter((index) => isTriggerLike(nodes[index]));
		const keeper = triggerLike.length === 1 ? triggerLike[0] : sharers[0];
		for (const index of sharers) {
			if (index === keeper) continue;
			const newId = uuid();
			newIds.set(index, newId);
			report.reassigned.push({ name: nodes[index].name, oldId: id, newId });
		}
	}

	nodes.forEach((node, index) => {
		if (!node.id && !dropped.has(index)) {
			const newId = uuid();
			newIds.set(index, newId);
			report.filled.push({ name: node.name, newId });
		}
	});

	if (dropped.size === 0 && newIds.size === 0) return { changed: false };

	const healed: INode[] = [];
	nodes.forEach((node, index) => {
		if (dropped.has(index)) return;
		const newId = newIds.get(index);
		healed.push(newId === undefined ? node : { ...node, id: newId });
	});

	return { changed: true, nodes: healed, report };
}
