import { isRecord } from '@n8n/utils/is-record';
import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import {
	DEFAULT_NODE_SIZE,
	GRID_SIZE,
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP,
	NODE_X_SPACING,
	NODE_Y_SPACING,
	getWorkflowNodeDimensions,
	isStickyNoteType,
} from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../types';

type Position = [number, number];

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
	/** Group index for a member, -1 for free nodes and group chips. */
	layer: number;
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

const nameOf = (node: NodeJSON) => node.name ?? '';

/** Everything reachable from `start` through `next`, in visit order. */
function reach<T>(start: Iterable<T>, next: (item: T) => Iterable<T>): Set<T> {
	const seen = new Set(start);
	for (const item of seen) for (const other of next(item)) seen.add(other);
	return seen;
}

/**
 * The chip a collapsed group draws, hung off its members' top-left corner like
 * the canvas does (computeGroupFrameRects). Saved positions describe the
 * collapsed view: when a group expands, the canvas pushes its neighbours away.
 */
function chipBox(members: NodeJSON[]): Box {
	const minX = Math.min(...members.map((node) => node.position[0]));
	const minY = Math.min(...members.map((node) => node.position[1]));
	return {
		x: snapToGrid(minX - GROUP_PADDING_X),
		y: snapToGrid(minY - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT),
		width: GROUP_HEADER_WIDTH_COLLAPSED,
		height: GROUP_HEADER_HEIGHT,
		layer: -1,
	};
}

/** Member nodes of each group, resolved from the group's node ids. */
function groupMembers(json: WorkflowJSON): NodeJSON[][] {
	const byId = new Map(
		(json.nodes ?? []).flatMap((node) => (node.id ? [[node.id, node] as const] : [])),
	);
	return (json.nodeGroups ?? [])
		.map((group) => group.nodeIds.flatMap((id) => byId.get(id) ?? []))
		.filter((members) => members.length > 0);
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

interface Links {
	parentsOf: (name: string) => string[];
	childrenOf: (name: string) => string[];
}

/** Connections by node name in both directions, for the connection types that `keep` accepts. */
function linksOf(json: WorkflowJSON, keep: (type: string) => boolean = () => true): Links {
	const parents = new Map<string, string[]>();
	const children = new Map<string, string[]>();
	const push = (map: Map<string, string[]>, key: string, value: string) => {
		const list = map.get(key);
		if (list) list.push(value);
		else map.set(key, [value]);
	};
	for (const [from, connectionsByType] of Object.entries(json.connections ?? {})) {
		if (!isRecord(connectionsByType)) continue;
		for (const [type, groups] of Object.entries(connectionsByType)) {
			if (!keep(type) || !Array.isArray(groups)) continue;
			for (const group of groups) {
				if (!Array.isArray(group)) continue;
				for (const connection of group) {
					if (isRecord(connection) && typeof connection.node === 'string') {
						push(children, from, connection.node);
						push(parents, connection.node, from);
					}
				}
			}
		}
	}
	return {
		parentsOf: (name) => parents.get(name) ?? [],
		childrenOf: (name) => children.get(name) ?? [],
	};
}

interface Survivor {
	node: NodeJSON;
	saved: Position;
}

/** True when the build moved survivors, i.e. it laid the whole graph out again. */
function wasRelaidOut(survivors: Survivor[]): boolean {
	return survivors.some(
		({ node, saved }) => node.position[0] !== saved[0] || node.position[1] !== saved[1],
	);
}

/**
 * Shift existing nodes right to make room for a node inserted between them, as
 * the canvas does on insert. The room is the extra gap that the build's layout
 * gave the insert, compared to the saved gap. Upstream nodes stay in place.
 *
 * Mutates the survivors' saved positions. Returns the spot of each inserted node
 * next to its parent, in the saved frame.
 */
function makeRoomForInsertions(
	survivors: Survivor[],
	added: NodeJSON[],
	json: WorkflowJSON,
): Map<NodeJSON, Position> {
	// Without a re-layout, the build's gaps say nothing about the saved canvas.
	if (!wasRelaidOut(survivors)) return new Map();

	const main = linksOf(json, (type) => type === 'main');
	const ai = linksOf(json, (type) => type.startsWith('ai_'));
	const groups = groupMembers(json).map((members) => members.map(nameOf));
	const survivorByName = new Map(survivors.map((survivor) => [nameOf(survivor.node), survivor]));
	const addedNames = new Set(added.map(nameOf));
	const inserted: Array<[NodeJSON, Survivor]> = [];

	for (const node of added) {
		const parent = survivors.find((survivor) =>
			main.childrenOf(nameOf(survivor.node)).includes(nameOf(node)),
		);
		if (!parent) continue;

		// The first existing nodes after the insert, reached through added nodes only.
		const run = reach([nameOf(node)], (name) =>
			main.childrenOf(name).filter((child) => addedNames.has(child)),
		);
		const next = new Set(
			[...run]
				.flatMap((name) => main.childrenOf(name))
				.flatMap((child) => survivorByName.get(child) ?? []),
		);
		// Appended after the parent, not inserted.
		if (next.size === 0) continue;

		// The downstream flow moves as one, with its AI sub-nodes and groups.
		const downstream = reach(
			[...next].map((survivor) => nameOf(survivor.node)),
			(name) => [
				...main.childrenOf(name),
				...ai.parentsOf(name),
				...groups.filter((group) => group.includes(name)).flat(),
			],
		);
		// ponytail: a loop back to the parent, or a group shared with it, keeps the canvas as is.
		if (downstream.has(nameOf(parent.node))) continue;

		const room = Math.max(
			0,
			...[...next].map(
				(survivor) =>
					survivor.node.position[0] -
					parent.node.position[0] -
					(survivor.saved[0] - parent.saved[0]),
			),
		);
		for (const survivor of survivors) {
			if (downstream.has(nameOf(survivor.node))) {
				survivor.saved = [survivor.saved[0] + room, survivor.saved[1]];
			}
		}
		inserted.push([node, parent]);
	}

	// After every shift, so a parent that moved for an earlier insert is current.
	return new Map(
		inserted.map(([node, parent]) => [
			node,
			[
				snapToGrid(parent.saved[0] + node.position[0] - parent.node.position[0]),
				snapToGrid(parent.saved[1] + node.position[1] - parent.node.position[1]),
			],
		]),
	);
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
	if (wasRelaidOut(survivors)) {
		return [
			median(survivors.map(({ node, saved }) => saved[0] - node.position[0])),
			median(survivors.map(({ node, saved }) => saved[1] - node.position[1])),
		];
	}

	// The build kept the survivors' positions, so the layout engine skipped them and
	// only the added nodes were placed — in a frame unrelated to the saved canvas.
	// Anchor on a wired neighbour that did survive.
	const savedByName = new Map(survivors.map(({ node, saved }) => [nameOf(node), saved]));
	const { parentsOf, childrenOf } = linksOf(json);

	for (const node of added) {
		if (!node.name) continue;

		for (const parent of parentsOf(node.name)) {
			const anchor = savedByName.get(parent);
			if (anchor) {
				return [anchor[0] + NODE_STEP_X - node.position[0], anchor[1] - node.position[1]];
			}
		}

		for (const child of childrenOf(node.name)) {
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

function findCollision(
	boxes: Box[],
	occupied: Box[],
): { index: number; box: Box; other: Box } | undefined {
	for (const [index, box] of boxes.entries()) {
		const other = occupied.find(
			(candidate) => candidate.layer === box.layer && intersects(box, candidate),
		);
		if (other) return { index, box, other };
	}
	return undefined;
}

/** Shift a block in one direction until its footprint clears `occupied`. */
function shiftUntilClear(
	block: NodeJSON[],
	footprint: () => Box[],
	occupied: Box[],
	direction: 'down' | 'up',
): boolean {
	for (let step = 0; step < MAX_SEPARATION_STEPS; step++) {
		const collision = findCollision(footprint(), occupied);
		if (!collision) return true;

		const { index, box, other } = collision;
		const deltaY =
			direction === 'down'
				? other.y + other.height + NODE_Y_SPACING - box.y
				: other.y - NODE_Y_SPACING - box.height - box.y;
		for (const node of block) {
			node.position = [node.position[0], snapToGrid(node.position[1] + deltaY)];
		}

		// The colliding chip did not move: an existing member pins that edge.
		if (footprint()[index].y === box.y) return false;
	}
	return false;
}

/**
 * Move added nodes clear of the nodes and group chips already on the canvas.
 * Added nodes move in blocks (wired to each other or sharing a group), so the
 * layout engine's rows stay intact. A block goes down first. If an existing
 * member pins its group chip, it goes up instead.
 * Members of a collapsed group hide behind its chip, so they only collide with
 * each other. Sticky notes are ignored on both sides, because they sit behind nodes.
 */
function separateAddedNodes(added: NodeJSON[], json: WorkflowJSON): void {
	const nodes = json.nodes ?? [];
	const addedSet = new Set(added);
	const addedByName = new Map(added.map((node) => [nameOf(node), node]));
	const groups = groupMembers(json);
	const { parentsOf, childrenOf } = linksOf(json);
	const sizes = getWorkflowNodeDimensions(json);

	const boxesOf = (members: NodeJSON[]): Box[] =>
		members
			.filter((node) => !isStickyNoteType(node.type))
			.map((node) => {
				const size = sizes.get(nameOf(node)) ?? { width: NODE_WIDTH, height: NODE_HEIGHT };
				const layer = groups.findIndex((group) => group.includes(node));
				return { x: node.position[0], y: node.position[1], ...size, layer };
			});
	const footprintOf = (members: NodeJSON[]) => [
		...boxesOf(members),
		...groups.filter((group) => group.some((node) => members.includes(node))).map(chipBox),
	];

	const occupied = [
		...boxesOf(nodes.filter((node) => !addedSet.has(node))),
		...groups.filter((group) => !group.some((node) => addedSet.has(node))).map(chipBox),
	];

	// Added nodes wired to the node or in a group with it.
	const linkedTo = (node: NodeJSON) =>
		[
			...[...parentsOf(nameOf(node)), ...childrenOf(nameOf(node))].flatMap(
				(name) => addedByName.get(name) ?? [],
			),
			...groups.filter((group) => group.includes(node)).flat(),
		].filter((other) => addedSet.has(other));

	const placed = new Set<NodeJSON>();
	for (const start of added) {
		if (placed.has(start)) continue;
		const block = [...reach([start], linkedTo)];
		block.forEach((node) => placed.add(node));

		const footprint = () => footprintOf(block);
		const origin = block.map((node) => node.position);
		for (const direction of ['down', 'up'] as const) {
			if (shiftUntilClear(block, footprint, occupied, direction)) break;
			// ponytail: a block that clears neither way keeps its translated position.
			block.forEach((node, i) => (node.position = origin[i]));
		}
		occupied.push(...footprint());
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
 * layout engine's relative arrangement, then moved clear of anything they land on.
 * A node inserted between existing nodes takes the spot next to its parent, and
 * the existing nodes after it move right to make room.
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
		const spots = makeRoomForInsertions(survivors, added, json);
		const [deltaX, deltaY] = resolveTranslation(survivors, added, json);
		for (const node of added) {
			node.position = spots.get(node) ?? [
				snapToGrid(node.position[0] + deltaX),
				snapToGrid(node.position[1] + deltaY),
			];
		}
	}

	for (const { node, saved } of survivors) {
		node.position = saved;
	}

	if (added.length > 0) separateAddedNodes(added, json);
}
