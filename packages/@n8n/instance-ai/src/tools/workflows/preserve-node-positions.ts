import { isRecord } from '@n8n/utils/is-record';
import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import {
	DEFAULT_NODE_SIZE,
	GRID_SIZE,
	NODE_X_SPACING,
	NODE_Y_SPACING,
	isStickyNoteType,
} from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../types';

type Position = [number, number];

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

const [NODE_WIDTH, NODE_HEIGHT] = DEFAULT_NODE_SIZE;

/** Horizontal step between a node and the one wired after it. */
const NODE_STEP_X = NODE_WIDTH + NODE_X_SPACING;

/** Bound on the de-overlap walk so a pathological graph can't spin. */
const MAX_SEPARATION_STEPS = 50;

function snapToGrid(value: number): number {
	return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function boxOf(node: NodeJSON): Box {
	return { x: node.position[0], y: node.position[1], width: NODE_WIDTH, height: NODE_HEIGHT };
}

/** Overlap test with a one-grid-cell gutter, so nodes never end up flush. */
function intersects(a: Box, b: Box): boolean {
	return !(
		a.x + a.width + GRID_SIZE <= b.x ||
		b.x + b.width + GRID_SIZE <= a.x ||
		a.y + a.height + GRID_SIZE <= b.y ||
		b.y + b.height + GRID_SIZE <= a.y
	);
}

/** Direct predecessors and successors by node name, across all connection types. */
function buildAdjacency(json: WorkflowJSON): {
	parentsOf: Map<string, string[]>;
	childrenOf: Map<string, string[]>;
} {
	const parentsOf = new Map<string, string[]>();
	const childrenOf = new Map<string, string[]>();

	for (const [source, connectionsByType] of Object.entries(json.connections ?? {})) {
		if (!isRecord(connectionsByType)) continue;
		for (const groups of Object.values(connectionsByType)) {
			if (!Array.isArray(groups)) continue;
			for (const group of groups) {
				if (!Array.isArray(group)) continue;
				for (const connection of group) {
					if (!isRecord(connection) || typeof connection.node !== 'string') continue;
					const target = connection.node;
					childrenOf.set(source, [...(childrenOf.get(source) ?? []), target]);
					parentsOf.set(target, [...(parentsOf.get(target) ?? []), source]);
				}
			}
		}
	}

	return { parentsOf, childrenOf };
}

interface Survivor {
	node: NodeJSON;
	saved: Position;
}

/**
 * Offset that carries the build's layout frame onto the saved canvas.
 *
 * The build runs in a sandbox with no view of the saved workflow, so whatever
 * `toJSON({ tidyUp: true })` produced sits in the layout engine's own coordinate
 * space (origin near 0) rather than wherever the user's nodes actually live.
 * Added nodes keep their relative arrangement; only the frame moves.
 */
function resolveTranslation(
	survivors: Survivor[],
	added: NodeJSON[],
	json: WorkflowJSON,
): Position {
	// The build re-laid out the whole graph, so survivors give us the mapping directly.
	const relaidOut = survivors.some(
		({ node, saved }) => node.position[0] !== saved[0] || node.position[1] !== saved[1],
	);
	if (relaidOut) {
		return [
			median(survivors.map(({ node, saved }) => saved[0] - node.position[0])),
			median(survivors.map(({ node, saved }) => saved[1] - node.position[1])),
		];
	}

	// The build kept the survivors' positions, so the layout engine skipped them and
	// only the added nodes were placed — in a frame unrelated to the saved canvas.
	// Anchor on a wired neighbour that did survive.
	const savedByName = new Map(survivors.map(({ node, saved }) => [node.name ?? '', saved]));
	const { parentsOf, childrenOf } = buildAdjacency(json);

	for (const node of added) {
		if (!node.name) continue;

		for (const parent of parentsOf.get(node.name) ?? []) {
			const anchor = savedByName.get(parent);
			if (anchor) {
				return [anchor[0] + NODE_STEP_X - node.position[0], anchor[1] - node.position[1]];
			}
		}

		for (const child of childrenOf.get(node.name) ?? []) {
			const anchor = savedByName.get(child);
			if (anchor) {
				return [anchor[0] - NODE_STEP_X - node.position[0], anchor[1] - node.position[1]];
			}
		}
	}

	// Nothing wired to an existing node — park the added set below the saved graph.
	const savedMinX = Math.min(...survivors.map(({ saved }) => saved[0]));
	const savedMaxY = Math.max(...survivors.map(({ saved }) => saved[1]));
	const addedMinX = Math.min(...added.map((node) => node.position[0]));
	const addedMinY = Math.min(...added.map((node) => node.position[1]));

	return [savedMinX - addedMinX, savedMaxY + NODE_HEIGHT + NODE_Y_SPACING - addedMinY];
}

/**
 * Push added nodes down until they clear everything already on the canvas.
 * Sticky notes are ignored on both sides — they are meant to sit behind nodes.
 */
function separateAddedNodes(added: NodeJSON[], allNodes: NodeJSON[]): void {
	const addedSet = new Set(added);
	const occupied = allNodes
		.filter((node) => !addedSet.has(node) && !isStickyNoteType(node.type))
		.map(boxOf);

	for (const node of added) {
		if (isStickyNoteType(node.type)) continue;

		for (let step = 0; step < MAX_SEPARATION_STEPS; step++) {
			const collision = occupied.find((box) => intersects(box, boxOf(node)));
			if (!collision) break;
			node.position = [
				node.position[0],
				snapToGrid(collision.y + collision.height + NODE_Y_SPACING),
			];
		}

		occupied.push(boxOf(node));
	}
}

/**
 * For updates, restore each surviving node's position from the saved workflow.
 *
 * The sandbox build has no view of the saved workflow, so `toJSON({ tidyUp: true })`
 * lays the whole graph out from scratch and every node lands wherever the layout
 * engine put it — scattering a canvas the user had arranged by hand. Reconciling by
 * id (name for nodes without one) keeps the user's layout authoritative, so a
 * renamed node keeps its place, mirroring ensureWebhookIds.
 *
 * Nodes the build added are translated into the saved canvas's frame, keeping the
 * layout engine's relative arrangement, then nudged clear of anything they land on.
 */
export async function preserveExistingNodePositions(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
): Promise<void> {
	if (!workflowId) return;

	let existing: WorkflowJSON;
	try {
		existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Failed to load existing workflow ${workflowId} to preserve node positions: ${message}`,
			{ cause: error },
		);
	}

	// Saved positions are claimed by id first: preserveExistingNodeIds has just run,
	// so a surviving node carries its saved id even after a rename. Name is the
	// fallback for a node without one, and a position claimed by id is not handed
	// out again by name.
	type SavedNode = { id?: string; name?: string; position: Position };
	const savedById = new Map<string, SavedNode>();
	const savedByName = new Map<string, SavedNode>();
	for (const node of existing.nodes ?? []) {
		if (!Array.isArray(node.position)) continue;
		const saved: SavedNode = {
			id: node.id,
			name: node.name,
			position: [node.position[0], node.position[1]],
		};
		if (saved.id) savedById.set(saved.id, saved);
		if (saved.name) savedByName.set(saved.name, saved);
	}
	if (savedById.size === 0 && savedByName.size === 0) return;

	const nodes = json.nodes ?? [];
	const survivors: Survivor[] = [];
	const added: NodeJSON[] = [];
	const claimed = new Set<SavedNode>();
	const unclaimed: NodeJSON[] = [];
	for (const node of nodes) {
		const saved = node.id ? savedById.get(node.id) : undefined;
		if (saved) {
			claimed.add(saved);
			survivors.push({ node, saved: saved.position });
		} else {
			unclaimed.push(node);
		}
	}
	for (const node of unclaimed) {
		const saved = node.name ? savedByName.get(node.name) : undefined;
		if (saved && !claimed.has(saved)) {
			claimed.add(saved);
			survivors.push({ node, saved: saved.position });
		} else {
			added.push(node);
		}
	}

	// Every node is new (or replaced) — there is no prior layout left to honour.
	if (survivors.length === 0) return;

	if (added.length > 0) {
		const [deltaX, deltaY] = resolveTranslation(survivors, added, json);
		for (const node of added) {
			node.position = [
				snapToGrid(node.position[0] + deltaX),
				snapToGrid(node.position[1] + deltaY),
			];
		}
	}

	for (const { node, saved } of survivors) {
		node.position = saved;
	}

	if (added.length > 0) separateAddedNodes(added, nodes);
}
