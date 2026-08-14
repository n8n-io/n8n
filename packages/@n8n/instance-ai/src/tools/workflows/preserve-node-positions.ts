import { isRecord } from '@n8n/utils/is-record';
import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import {
	CONFIGURABLE_NODE_SIZE,
	CONFIGURATION_NODE_RADIUS,
	CONFIGURATION_NODE_SIZE,
	DEFAULT_NODE_SIZE,
	GRID_SIZE,
	NODE_MIN_INPUT_ITEMS_COUNT,
	NODE_X_SPACING,
	NODE_Y_SPACING,
	isStickyNoteType,
} from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../types';

type Position = [number, number];
type Size = [number, number];

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

const [NODE_WIDTH, NODE_HEIGHT] = DEFAULT_NODE_SIZE;

/** Row step when one parent fans out to several outputs (IF/Switch branches). */
const BRANCH_STEP_Y = NODE_HEIGHT + GRID_SIZE;

/**
 * Vertical band around the insertion row that slides right together.
 * Mirrors the editor's insert-on-connection tolerance (~2 node heights).
 */
const SHIFT_Y_TOLERANCE = NODE_HEIGHT * 2;

/** Bound on the de-overlap walk so a pathological graph can't spin. */
const MAX_SEPARATION_STEPS = 50;

const DEFAULT_STICKY_SIZE: Size = [240, 160];

function snapToGrid(value: number): number {
	return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stickyBoxOf(node: NodeJSON): Box {
	const width =
		typeof node.parameters?.width === 'number' ? node.parameters.width : DEFAULT_STICKY_SIZE[0];
	const height =
		typeof node.parameters?.height === 'number' ? node.parameters.height : DEFAULT_STICKY_SIZE[1];
	return { x: node.position[0], y: node.position[1], width, height };
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

interface Wire {
	node: string;
	type: string;
	/** Index of the source node's output group this wire leaves from. */
	outputIndex: number;
	/** Index of the target node's input this wire lands on. */
	inputIndex: number;
}

/** Direct predecessors and successors by node name, across all connection types. */
function buildAdjacency(json: WorkflowJSON): {
	parentsOf: Map<string, Wire[]>;
	childrenOf: Map<string, Wire[]>;
} {
	const parentsOf = new Map<string, Wire[]>();
	const childrenOf = new Map<string, Wire[]>();

	for (const [source, connectionsByType] of Object.entries(json.connections ?? {})) {
		if (!isRecord(connectionsByType)) continue;
		for (const [type, groups] of Object.entries(connectionsByType)) {
			if (!Array.isArray(groups)) continue;
			groups.forEach((group, outputIndex) => {
				if (!Array.isArray(group)) return;
				for (const connection of group) {
					if (!isRecord(connection) || typeof connection.node !== 'string') continue;
					const target = connection.node;
					const inputIndex = typeof connection.index === 'number' ? connection.index : 0;
					const wire = { type, outputIndex, inputIndex };
					childrenOf.set(source, [...(childrenOf.get(source) ?? []), { ...wire, node: target }]);
					parentsOf.set(target, [...(parentsOf.get(target) ?? []), { ...wire, node: source }]);
				}
			});
		}
	}

	return { parentsOf, childrenOf };
}

function isAiConnectionType(type: string): boolean {
	return type.startsWith('ai_');
}

interface InsertSpot {
	position: Position;
	/** Node whose downstream slides right when the spot is occupied. */
	shiftAnchor?: string;
}

/**
 * Places nodes the build added, mimicking the editor's insert-on-connection:
 * a new node lands one step right of its wired parent, and when that spot is
 * taken the downstream block slides right to open a gap instead of the new
 * node being shoved into whatever space is free.
 */
class AddedNodePlacer {
	private readonly byName = new Map<string, NodeJSON>();

	private readonly placed = new Set<NodeJSON>();

	private readonly parentsOf: Map<string, Wire[]>;

	private readonly childrenOf: Map<string, Wire[]>;

	/** Per-node canvas size, mirroring the layout engine's getNodeDimensions. */
	private readonly sizeByName = new Map<string, Size>();

	/** Positions the layout engine gave the added nodes, before any reconciliation. */
	private readonly builtPositions = new Map<NodeJSON, Position>();

	constructor(
		json: WorkflowJSON,
		private readonly added: NodeJSON[],
	) {
		const addedSet = new Set(added);
		for (const node of json.nodes ?? []) {
			if (node.name) this.byName.set(node.name, node);
			if (!addedSet.has(node)) this.placed.add(node);
		}
		for (const node of added) this.builtPositions.set(node, [...node.position]);
		({ parentsOf: this.parentsOf, childrenOf: this.childrenOf } = buildAdjacency(json));
		this.computeSizes();
	}

	/**
	 * Derives each node's rendered size from the connection graph, the same way
	 * the layout engine does: ai_* sources are small round configuration nodes,
	 * ai_* targets are wide configurable cards sized by their ai port count, and
	 * plain nodes grow taller with extra main inputs/outputs.
	 */
	private computeSizes(): void {
		const aiConfigs = new Set<string>();
		const aiInputTypesByHost = new Map<string, Set<string>>();
		for (const [source, wires] of this.childrenOf) {
			for (const wire of wires) {
				if (!isAiConnectionType(wire.type)) continue;
				aiConfigs.add(source);
				const types = aiInputTypesByHost.get(wire.node) ?? new Set<string>();
				types.add(wire.type);
				aiInputTypesByHost.set(wire.node, types);
			}
		}

		for (const [name, node] of this.byName) {
			if (isStickyNoteType(node.type)) continue;

			if (aiConfigs.has(name)) {
				this.sizeByName.set(name, [CONFIGURATION_NODE_SIZE[0], CONFIGURATION_NODE_SIZE[1]]);
				continue;
			}

			const aiInputTypes = aiInputTypesByHost.get(name);
			if (aiInputTypes) {
				const portCount = Math.max(NODE_MIN_INPUT_ITEMS_COUNT, aiInputTypes.size);
				this.sizeByName.set(name, [
					CONFIGURATION_NODE_RADIUS * 2 + GRID_SIZE * (portCount - 1) * 3,
					CONFIGURABLE_NODE_SIZE[1],
				]);
				continue;
			}

			const mainInputCount = Math.max(
				1,
				...(this.parentsOf.get(name) ?? [])
					.filter((wire) => !isAiConnectionType(wire.type))
					.map((wire) => wire.inputIndex + 1),
			);
			const mainOutputCount = Math.max(
				1,
				...(this.childrenOf.get(name) ?? [])
					.filter((wire) => !isAiConnectionType(wire.type))
					.map((wire) => wire.outputIndex + 1),
			);
			const verticalHandles = Math.max(mainInputCount, mainOutputCount);
			this.sizeByName.set(name, [
				NODE_WIDTH,
				NODE_HEIGHT + Math.max(0, verticalHandles - 2) * GRID_SIZE * 2,
			]);
		}
	}

	private sizeOf(node: NodeJSON): Size {
		return (node.name ? this.sizeByName.get(node.name) : undefined) ?? DEFAULT_NODE_SIZE;
	}

	private boxOf(node: NodeJSON): Box {
		const [width, height] = this.sizeOf(node);
		return { x: node.position[0], y: node.position[1], width, height };
	}

	run(): void {
		const pending = this.added.filter((node) => !isStickyNoteType(node.type));
		const stickies = this.added.filter((node) => isStickyNoteType(node.type));

		// Worklist: place nodes as their wired neighbours get final positions, so a
		// chain of added nodes anchors link by link off the existing canvas.
		let progress = true;
		while (progress && pending.length > 0) {
			progress = false;
			for (const node of [...pending]) {
				const spot = this.resolveInsertSpot(node);
				if (!spot) continue;
				this.place(node, spot);
				pending.splice(pending.indexOf(node), 1);
				progress = true;
			}
		}

		// Nothing wires the leftovers to the canvas — park them below it as a block,
		// keeping the arrangement the layout engine gave them.
		if (pending.length > 0) this.parkBelow(pending);

		this.followAddedStickies(stickies);
	}

	private isPlacedNode(name: string): NodeJSON | undefined {
		const node = this.byName.get(name);
		return node && this.placed.has(node) && !isStickyNoteType(node.type) ? node : undefined;
	}

	private rightEdgeOf(node: NodeJSON): number {
		return node.position[0] + this.sizeOf(node)[0];
	}

	private resolveInsertSpot(node: NodeJSON): InsertSpot | undefined {
		if (!node.name) return undefined;

		const parents = (this.parentsOf.get(node.name) ?? [])
			.map((wire) => ({ wire, node: this.isPlacedNode(wire.node) }))
			.filter((entry): entry is { wire: Wire; node: NodeJSON } => entry.node !== undefined);
		const children = (this.childrenOf.get(node.name) ?? [])
			.map((wire) => ({ wire, node: this.isPlacedNode(wire.node) }))
			.filter((entry): entry is { wire: Wire; node: NodeJSON } => entry.node !== undefined);

		const mainParents = parents.filter(({ wire }) => !isAiConnectionType(wire.type));
		if (mainParents.length > 0) {
			const anchor = mainParents.reduce((a, b) =>
				this.rightEdgeOf(b.node) > this.rightEdgeOf(a.node) ? b : a,
			);
			const x = this.rightEdgeOf(anchor.node) + NODE_X_SPACING;
			const y =
				mainParents.length > 1
					? median(mainParents.map(({ node: parent }) => parent.position[1]))
					: anchor.node.position[1] + anchor.wire.outputIndex * BRANCH_STEP_Y;
			return { position: [x, y], shiftAnchor: anchor.node.name };
		}

		// The node feeds an ai_* port (model/tool/memory) — hang it below its host.
		const aiHost = children.find(({ wire }) => isAiConnectionType(wire.type));
		if (aiHost) {
			return {
				position: [
					aiHost.node.position[0],
					aiHost.node.position[1] + this.sizeOf(aiHost.node)[1] + NODE_Y_SPACING,
				],
			};
		}

		// Spliced in front of an existing node (e.g. a new trigger) — one step left of it.
		const mainChild = children.find(({ wire }) => !isAiConnectionType(wire.type));
		if (mainChild) {
			return {
				position: [
					mainChild.node.position[0] - NODE_X_SPACING - this.sizeOf(node)[0],
					mainChild.node.position[1],
				],
			};
		}

		if (parents.length > 0) {
			const anchor = parents[0];
			return {
				position: [this.rightEdgeOf(anchor.node) + NODE_X_SPACING, anchor.node.position[1]],
				shiftAnchor: anchor.node.name,
			};
		}

		return undefined;
	}

	private place(node: NodeJSON, spot: InsertSpot): void {
		node.position = [snapToGrid(spot.position[0]), snapToGrid(spot.position[1])];

		const collider = this.findCollider(node);
		// A pre-existing node holds the spot: slide the downstream block right to open
		// a gap, like the editor does. Colliding with a just-placed sibling instead
		// means a fan-out from the same parent, which spreads downward.
		if (collider && !this.builtPositions.has(collider) && spot.shiftAnchor) {
			const margin = this.sizeOf(node)[0] + NODE_X_SPACING;
			this.shiftRight(this.boxOf(node), spot.shiftAnchor, node, margin);
		}
		this.pushDownUntilFree(node);

		this.placed.add(node);
	}

	private findCollider(node: NodeJSON): NodeJSON | undefined {
		const box = this.boxOf(node);
		for (const other of this.placed) {
			// Stickies sit behind nodes, so they never block a spot.
			if (other === node || isStickyNoteType(other.type)) continue;
			if (intersects(box, this.boxOf(other))) return other;
		}
		return undefined;
	}

	private pushDownUntilFree(node: NodeJSON): void {
		for (let step = 0; step < MAX_SEPARATION_STEPS; step++) {
			const collider = this.findCollider(node);
			if (!collider) return;
			node.position = [
				node.position[0],
				snapToGrid(collider.position[1] + this.sizeOf(collider)[1] + NODE_Y_SPACING),
			];
		}
	}

	/**
	 * Slides everything at or right of the insertion spot one step right, together
	 * with the anchor's downstream nodes — the editor's shiftDownstreamNodesPosition.
	 * Sticky notes spanning the insertion point stretch instead of moving, so they
	 * keep wrapping the nodes that slid.
	 */
	private shiftRight(insertBox: Box, anchorName: string, inserted: NodeJSON, margin: number): void {
		const downstream = new Set<string>();
		const queue = [anchorName];
		while (queue.length > 0) {
			const current = queue.shift();
			if (current === undefined) break;
			for (const wire of this.childrenOf.get(current) ?? []) {
				if (downstream.has(wire.node)) continue;
				downstream.add(wire.node);
				queue.push(wire.node);
			}
		}

		const inYBand = (box: Box) => Math.abs(box.y - insertBox.y) <= SHIFT_Y_TOLERANCE;

		for (const node of this.placed) {
			if (node === inserted) continue;
			if (isStickyNoteType(node.type)) {
				const box = stickyBoxOf(node);
				const overlapsBand =
					box.y <= insertBox.y + insertBox.height + SHIFT_Y_TOLERANCE &&
					box.y + box.height >= insertBox.y - SHIFT_Y_TOLERANCE;
				if (!overlapsBand) continue;
				if (box.x >= insertBox.x) {
					node.position = [node.position[0] + margin, node.position[1]];
				} else if (box.x + box.width > insertBox.x) {
					node.parameters = { ...node.parameters, width: box.width + margin };
				}
				continue;
			}

			const box = this.boxOf(node);
			const rightOfInsert = box.x + box.width > insertBox.x;
			const isDownstream = node.name !== undefined && downstream.has(node.name);
			if ((rightOfInsert && inYBand(box)) || isDownstream) {
				node.position = [node.position[0] + margin, node.position[1]];
			}
		}
	}

	private parkBelow(leftovers: NodeJSON[]): void {
		const canvas = [...this.placed].filter((node) => !isStickyNoteType(node.type));
		if (canvas.length === 0) return;

		const canvasMinX = Math.min(...canvas.map((node) => node.position[0]));
		const canvasMaxBottom = Math.max(
			...canvas.map((node) => node.position[1] + this.sizeOf(node)[1]),
		);
		const builtMinX = Math.min(...leftovers.map((node) => node.position[0]));
		const builtMinY = Math.min(...leftovers.map((node) => node.position[1]));
		const deltaX = canvasMinX - builtMinX;
		const deltaY = canvasMaxBottom + NODE_Y_SPACING - builtMinY;

		for (const node of leftovers) {
			node.position = [
				snapToGrid(node.position[0] + deltaX),
				snapToGrid(node.position[1] + deltaY),
			];
			this.pushDownUntilFree(node);
			this.placed.add(node);
		}
	}

	/**
	 * An added sticky was laid out around added nodes in the build's frame; move it
	 * by the same offset its nearest added node ended up moving, so it still wraps it.
	 */
	private followAddedStickies(stickies: NodeJSON[]): void {
		const anchors = this.added.filter((node) => !isStickyNoteType(node.type));

		for (const sticky of stickies) {
			const builtSticky = this.builtPositions.get(sticky);
			if (!builtSticky || anchors.length === 0) {
				if (anchors.length === 0) this.parkBelow([sticky]);
				continue;
			}

			const nearest = anchors.reduce((a, b) => {
				const builtA = this.builtPositions.get(a) ?? a.position;
				const builtB = this.builtPositions.get(b) ?? b.position;
				const distA = Math.hypot(builtA[0] - builtSticky[0], builtA[1] - builtSticky[1]);
				const distB = Math.hypot(builtB[0] - builtSticky[0], builtB[1] - builtSticky[1]);
				return distB < distA ? b : a;
			});
			const builtNearest = this.builtPositions.get(nearest) ?? nearest.position;
			sticky.position = [
				snapToGrid(builtSticky[0] + nearest.position[0] - builtNearest[0]),
				snapToGrid(builtSticky[1] + nearest.position[1] - builtNearest[1]),
			];
			this.placed.add(sticky);
		}
	}
}

/**
 * For updates, restore each surviving node's position from the saved workflow.
 *
 * The sandbox build has no view of the saved workflow, so `toJSON({ tidyUp: true })`
 * lays the whole graph out from scratch and every node lands wherever the layout
 * engine put it — scattering a canvas the user had arranged by hand. Reconciling by
 * name here keeps the user's layout authoritative, mirroring ensureWebhookIds.
 *
 * Nodes the build added are then spliced in the way the editor inserts a node on a
 * connection: one step right of their wired parent, sliding the downstream block
 * right when the spot is occupied. Surviving nodes keep their arrangement but may
 * translate right as a block to make room.
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

	const savedPositionsByName = new Map<string, Position>();
	for (const node of existing.nodes ?? []) {
		if (node.name && Array.isArray(node.position)) {
			savedPositionsByName.set(node.name, [node.position[0], node.position[1]]);
		}
	}
	if (savedPositionsByName.size === 0) return;

	const nodes = json.nodes ?? [];
	const added: NodeJSON[] = [];
	let survivors = 0;
	for (const node of nodes) {
		const saved = node.name ? savedPositionsByName.get(node.name) : undefined;
		// Restore before any geometry, so insertion math sees the real canvas.
		if (saved) {
			node.position = saved;
			survivors++;
		} else {
			added.push(node);
		}
	}

	// Every node is new (or renamed) — there is no prior layout left to honour.
	if (survivors === 0) return;

	if (added.length > 0) new AddedNodePlacer(json, added).run();
}
