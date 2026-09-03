import { isRecord } from '@n8n/utils/is-record';
import type { FreshLayoutBox, NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import {
	DEFAULT_NODE_SIZE,
	GRID_SIZE,
	NODE_X_SPACING,
	NODE_Y_SPACING,
	calculateFreshLayout,
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

/** Bound on the de-overlap walk so a pathological graph can't spin. */
const MAX_SEPARATION_STEPS = 50;

/**
 * Vertical band around an insertion in which nodes ride the push right.
 * Mirrors the editor's insert-on-connection tolerance (~2 node heights).
 */
const SHIFT_Y_TOLERANCE = DEFAULT_NODE_SIZE[1] * 2;

const DEFAULT_STICKY_SIZE: [number, number] = [240, 160];

function snapUpToGrid(value: number): number {
	return Math.ceil(value / GRID_SIZE) * GRID_SIZE;
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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

function boundingBox(boxes: Box[]): Box {
	const minX = Math.min(...boxes.map((box) => box.x));
	const minY = Math.min(...boxes.map((box) => box.y));
	const maxX = Math.max(...boxes.map((box) => box.x + box.width));
	const maxY = Math.max(...boxes.map((box) => box.y + box.height));
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function stickyBoxOf(node: NodeJSON): Box {
	const width =
		typeof node.parameters?.width === 'number' ? node.parameters.width : DEFAULT_STICKY_SIZE[0];
	const height =
		typeof node.parameters?.height === 'number' ? node.parameters.height : DEFAULT_STICKY_SIZE[1];
	return { x: node.position[0], y: node.position[1], width, height };
}

/** Directed adjacency by node name, across all connection types. */
function buildAdjacency(json: WorkflowJSON): {
	parentsOf: Map<string, Set<string>>;
	childrenOf: Map<string, Set<string>>;
	subsOfHost: Map<string, Set<string>>;
} {
	const parentsOf = new Map<string, Set<string>>();
	const childrenOf = new Map<string, Set<string>>();
	const subsOfHost = new Map<string, Set<string>>();
	const link = (map: Map<string, Set<string>>, from: string, to: string) => {
		let set = map.get(from);
		if (!set) {
			set = new Set();
			map.set(from, set);
		}
		set.add(to);
	};

	for (const [source, connectionsByType] of Object.entries(json.connections ?? {})) {
		if (!isRecord(connectionsByType)) continue;
		for (const [type, groups] of Object.entries(connectionsByType)) {
			if (!Array.isArray(groups)) continue;
			for (const group of groups) {
				if (!Array.isArray(group)) continue;
				for (const connection of group) {
					if (!isRecord(connection) || typeof connection.node !== 'string') continue;
					link(childrenOf, source, connection.node);
					link(parentsOf, connection.node, source);
					// Sub-nodes (models, parsers, tools) hang off their host via
					// non-main connections; they must travel with the host.
					if (type !== 'main') link(subsOfHost, connection.node, source);
				}
			}
		}
	}

	return { parentsOf, childrenOf, subsOfHost };
}

/**
 * Places the added nodes onto the saved canvas. The mechanism is one rule, not
 * per-shape heuristics: lay the whole new graph out fresh (the "ideal frame",
 * which already handles branch fanning, AI subtrees, node sizes and spacing),
 * then carry each connected cluster of added nodes onto the canvas by the
 * offset that maps its surviving neighbours' ideal positions onto their saved
 * ones. See {@link preserveExistingNodePositions} for the resulting contract.
 */
class AddedNodePlacer {
	/** Ideal frame: fresh tidy-up layout of the full new graph. */
	private readonly ideal: Map<string, FreshLayoutBox>;

	private readonly parentsOf: Map<string, Set<string>>;

	private readonly childrenOf: Map<string, Set<string>>;

	private readonly subsOfHost: Map<string, Set<string>>;

	/** Saved canvas positions of surviving nodes, already restored onto the JSON. */
	private readonly survivorsByName = new Map<string, NodeJSON>();

	/** Non-sticky nodes already on the canvas: survivors, then clusters as they settle. */
	private readonly settled: NodeJSON[] = [];

	/** Sticky notes already on the canvas — they stretch or ride along on a push. */
	private readonly settledStickies: NodeJSON[] = [];

	/** Positions the build gave the added nodes, before any reconciliation. */
	private readonly builtPositions = new Map<NodeJSON, Position>();

	constructor(
		json: WorkflowJSON,
		private readonly added: NodeJSON[],
		nonMainInputCounts?: ReadonlyMap<string, number>,
	) {
		this.ideal = calculateFreshLayout(json, nonMainInputCounts);
		({
			parentsOf: this.parentsOf,
			childrenOf: this.childrenOf,
			subsOfHost: this.subsOfHost,
		} = buildAdjacency(json));

		const addedSet = new Set(added);
		for (const node of json.nodes ?? []) {
			if (addedSet.has(node)) continue;
			if (node.name) this.survivorsByName.set(node.name, node);
			if (isStickyNoteType(node.type)) this.settledStickies.push(node);
			else this.settled.push(node);
		}
		for (const node of added) this.builtPositions.set(node, [node.position[0], node.position[1]]);
	}

	/** Canvas box at the node's current position, sized from the ideal frame. */
	private boxOf(node: NodeJSON): Box {
		const size = node.name ? this.ideal.get(node.name) : undefined;
		return {
			x: node.position[0],
			y: node.position[1],
			width: size?.width ?? DEFAULT_NODE_SIZE[0],
			height: size?.height ?? DEFAULT_NODE_SIZE[1],
		};
	}

	run(): void {
		const nodes = this.added.filter((node) => !isStickyNoteType(node.type));
		const stickies = this.added.filter((node) => isStickyNoteType(node.type));

		for (const cluster of this.clustersOf(nodes)) {
			this.placeCluster(cluster);
		}
		this.followAddedStickies(stickies, nodes);
	}

	/** Weakly connected components of the added nodes, in JSON order. */
	private clustersOf(nodes: NodeJSON[]): NodeJSON[][] {
		const byName = new Map<string, NodeJSON>();
		for (const node of nodes) {
			if (node.name) byName.set(node.name, node);
		}
		const neighboursOf = (name: string) => [
			...(this.parentsOf.get(name) ?? []),
			...(this.childrenOf.get(name) ?? []),
		];

		const clusters: NodeJSON[][] = [];
		const seen = new Set<NodeJSON>();
		for (const node of nodes) {
			if (seen.has(node)) continue;
			const cluster: NodeJSON[] = [];
			const queue = [node];
			seen.add(node);
			while (queue.length > 0) {
				const current = queue.shift();
				if (!current) break;
				cluster.push(current);
				for (const name of neighboursOf(current.name ?? '')) {
					const neighbour = byName.get(name);
					if (neighbour && !seen.has(neighbour)) {
						seen.add(neighbour);
						queue.push(neighbour);
					}
				}
			}
			clusters.push(cluster);
		}
		return clusters;
	}

	/** Surviving nodes wired into (upstream) and out of (downstream) the cluster. */
	private anchorsOf(cluster: NodeJSON[]): { upstream: NodeJSON[]; downstream: NodeJSON[] } {
		const upstream = new Map<string, NodeJSON>();
		const downstream = new Map<string, NodeJSON>();
		for (const member of cluster) {
			for (const name of this.parentsOf.get(member.name ?? '') ?? []) {
				const survivor = this.survivorsByName.get(name);
				if (survivor && !isStickyNoteType(survivor.type)) upstream.set(name, survivor);
			}
			for (const name of this.childrenOf.get(member.name ?? '') ?? []) {
				const survivor = this.survivorsByName.get(name);
				if (survivor && !isStickyNoteType(survivor.type)) downstream.set(name, survivor);
			}
		}
		return { upstream: [...upstream.values()], downstream: [...downstream.values()] };
	}

	/**
	 * Offset carrying a cluster from the ideal frame onto the canvas: the median
	 * over the anchors of (saved position − ideal position). Exact, not
	 * grid-snapped — staying on the anchor's row beats staying on the grid when
	 * the user parked the anchor off-grid. Undefined when there are no anchors.
	 */
	private deltaFromAnchors(anchors: NodeJSON[]): Position | undefined {
		const deltas: Position[] = [];
		for (const anchor of anchors) {
			const idealBox = anchor.name ? this.ideal.get(anchor.name) : undefined;
			if (!idealBox) continue;
			deltas.push([anchor.position[0] - idealBox.x, anchor.position[1] - idealBox.y]);
		}
		if (deltas.length === 0) return undefined;
		return [
			Math.round(median(deltas.map(([dx]) => dx))),
			Math.round(median(deltas.map(([, dy]) => dy))),
		];
	}

	private moveToFrame(nodes: NodeJSON[], [deltaX, deltaY]: Position): void {
		for (const node of nodes) {
			const box = node.name ? this.ideal.get(node.name) : undefined;
			if (box) node.position = [box.x + deltaX, box.y + deltaY];
		}
	}

	private collides(nodes: NodeJSON[]): boolean {
		return nodes.some((node) =>
			this.settled.some((other) => intersects(this.boxOf(node), this.boxOf(other))),
		);
	}

	private placeCluster(cluster: NodeJSON[]): void {
		const { upstream, downstream } = this.anchorsOf(cluster);
		// A survivor wired both into and out of the cluster (a loop) must count
		// once in the median, not twice.
		const anchors = [...new Set([...upstream, ...downstream])];
		const delta = this.deltaFromAnchors(anchors) ?? this.parkBelowDelta(cluster);
		this.moveToFrame(cluster, delta);

		// No room where the anchoring put it. A splice (anchors on both sides)
		// re-flows everything from the frontier so old and new rows don't fight;
		// otherwise the canvas makes way and the cluster keeps its anchored spot.
		if (this.collides(cluster) && upstream.length > 0 && downstream.length > 0) {
			this.reflowFromFrontier(cluster, upstream, downstream);
			return;
		}
		if (this.collides(cluster)) this.openGap(cluster);
		this.settle(cluster);
	}

	/**
	 * Preservation ends at the insertion frontier: the cluster and everything
	 * graph-downstream of it (surviving nodes included, with their sub-nodes)
	 * rejoin the fresh frame, carried by the upstream anchors so the flow
	 * continues on their rows. Pinning the downstream to its old rows here is
	 * what produced vertical zigzags — those rows described a graph that no
	 * longer exists.
	 */
	private reflowFromFrontier(
		cluster: NodeJSON[],
		upstream: NodeJSON[],
		downstream: NodeJSON[],
	): void {
		const delta = this.deltaFromAnchors(upstream);
		if (!delta) {
			this.openGap(cluster);
			this.settle(cluster);
			return;
		}

		const clusterNames = new Set(cluster.map((node) => node.name));
		const tail = this.expandTail(downstream, clusterNames);
		const tailSet = new Set(tail);
		const savedTailBoxes = tail.map((node) => this.boxOf(node));
		for (let index = this.settled.length - 1; index >= 0; index--) {
			if (tailSet.has(this.settled[index])) this.settled.splice(index, 1);
		}

		const block = [...cluster, ...tail];
		this.moveToFrame(block, delta);

		// An unrelated surviving branch can still be in the way — push it aside.
		if (this.collides(block)) this.openGap(block);

		this.stretchStickiesOverTailShift(tail, savedTailBoxes);
		this.settle(block);
	}

	/** Surviving nodes graph-downstream of the insertion, plus their sub-nodes. */
	private expandTail(downstream: NodeJSON[], clusterNames: Set<string | undefined>): NodeJSON[] {
		const settledByName = new Map(this.settled.map((node) => [node.name ?? '', node]));
		const tail: NodeJSON[] = [];
		const seen = new Set<NodeJSON>();
		const queue = [...downstream];
		while (queue.length > 0) {
			const current = queue.shift();
			if (!current) break;
			if (seen.has(current)) continue;
			seen.add(current);
			tail.push(current);
			const names = [
				...(this.childrenOf.get(current.name ?? '') ?? []),
				...(this.subsOfHost.get(current.name ?? '') ?? []),
			];
			for (const name of names) {
				if (clusterNames.has(name)) continue;
				const survivor = settledByName.get(name);
				if (survivor && !seen.has(survivor)) queue.push(survivor);
			}
		}
		return tail;
	}

	/**
	 * Surviving stickies that wrapped the re-flowed tail keep wrapping it: ones
	 * spanning the old tail start stretch by the tail's median rightward shift,
	 * ones entirely beyond it slide along.
	 */
	private stretchStickiesOverTailShift(tail: NodeJSON[], savedBoxes: Box[]): void {
		if (tail.length === 0) return;
		const shifts = tail.map((node, index) => node.position[0] - savedBoxes[index].x);
		const margin = Math.round(median(shifts));
		if (margin <= 0) return;
		const savedBBox = boundingBox(savedBoxes);
		this.adjustStickies(
			savedBBox.x,
			margin,
			savedBBox.y - SHIFT_Y_TOLERANCE,
			savedBBox.y + savedBBox.height + SHIFT_Y_TOLERANCE,
		);
	}

	/** Left-aligned with the canvas, one row gap below everything on it. */
	private parkBelowDelta(cluster: NodeJSON[]): Position {
		const boxes = cluster
			.map((node) => (node.name ? this.ideal.get(node.name) : undefined))
			.filter((box): box is FreshLayoutBox => box !== undefined);
		const frame =
			this.settled.length > 0
				? this.settled.map((node) => this.boxOf(node))
				: this.settledStickies.map(stickyBoxOf);
		if (boxes.length === 0 || frame.length === 0) return [0, 0];

		const clusterMinX = Math.min(...boxes.map((box) => box.x));
		const clusterMinY = Math.min(...boxes.map((box) => box.y));
		const frameMinX = Math.min(...frame.map((box) => box.x));
		const frameBottom = Math.max(...frame.map((box) => box.y + box.height));

		return [
			Math.round(frameMinX - clusterMinX),
			Math.round(frameBottom + NODE_Y_SPACING - clusterMinY),
		];
	}

	/**
	 * Opens a gap so the cluster can keep its anchored spot, mirroring the editor's
	 * shiftDownstreamNodesPosition: everything at or beyond the insertion point —
	 * nodes in the cluster's vertical band plus their graph-downstream nodes —
	 * slides right as one block by the width the cluster needs. Sticky notes
	 * spanning the insertion point stretch instead, so they keep wrapping the
	 * nodes that slid.
	 */
	private openGap(cluster: NodeJSON[]): void {
		const clusterSet = new Set(cluster);
		const bbox = boundingBox(cluster.map((node) => this.boxOf(node)));
		const insertX = bbox.x;
		const margin = snapUpToGrid(bbox.width + NODE_X_SPACING);
		const bandTop = bbox.y - SHIFT_Y_TOLERANCE;
		const bandBottom = bbox.y + bbox.height + SHIFT_Y_TOLERANCE;

		const overlapsInsertX = (box: Box) => box.x + box.width > insertX - GRID_SIZE;
		const movers = new Set<NodeJSON>();
		for (const node of this.settled) {
			if (clusterSet.has(node)) continue;
			const box = this.boxOf(node);
			if (overlapsInsertX(box) && box.y + box.height > bandTop && box.y < bandBottom) {
				movers.add(node);
			}
		}
		// Graph-downstream of the movers rides along (the editor's getNodesToShift).
		const byName = new Map(this.settled.map((node) => [node.name ?? '', node]));
		const queue = [...movers];
		while (queue.length > 0) {
			const current = queue.pop();
			if (!current) break;
			for (const name of this.childrenOf.get(current.name ?? '') ?? []) {
				const child = byName.get(name);
				if (!child || movers.has(child) || clusterSet.has(child)) continue;
				if (!overlapsInsertX(this.boxOf(child))) continue;
				movers.add(child);
				queue.push(child);
			}
		}

		for (const node of movers) {
			node.position = [node.position[0] + margin, node.position[1]];
		}

		this.adjustStickies(insertX, margin, bandTop, bandBottom);
	}

	/**
	 * Stickies in the band: stretch the ones spanning the insertion point,
	 * slide the ones entirely beyond it.
	 */
	private adjustStickies(
		insertX: number,
		margin: number,
		bandTop: number,
		bandBottom: number,
	): void {
		for (const sticky of this.settledStickies) {
			const box = stickyBoxOf(sticky);
			if (box.y + box.height <= bandTop || box.y >= bandBottom) continue;
			if (box.x >= insertX) {
				sticky.position = [sticky.position[0] + margin, sticky.position[1]];
			} else if (box.x + box.width > insertX) {
				sticky.parameters = { ...sticky.parameters, width: box.width + margin };
			}
		}
	}

	/**
	 * Safety net for residual overlaps (parked clusters, shapes the band push
	 * missed): slide the cluster down as a rigid block until free.
	 */
	private settle(cluster: NodeJSON[]): void {
		for (let step = 0; step < MAX_SEPARATION_STEPS; step++) {
			let shift = 0;
			for (const node of cluster) {
				const box = this.boxOf(node);
				for (const other of this.settled) {
					const obstacle = this.boxOf(other);
					if (!intersects(box, obstacle)) continue;
					shift = Math.max(shift, obstacle.y + obstacle.height + NODE_Y_SPACING - box.y);
				}
			}
			if (shift <= 0) break;
			const deltaY = snapUpToGrid(shift);
			for (const node of cluster) {
				node.position = [node.position[0], node.position[1] + deltaY];
			}
		}
		this.settled.push(...cluster);
	}

	/**
	 * An added sticky was laid out around added nodes in the build's frame; move it
	 * by the same offset its nearest added node ended up moving, so it still wraps it.
	 */
	private followAddedStickies(stickies: NodeJSON[], anchors: NodeJSON[]): void {
		for (const sticky of stickies) {
			const builtSticky = this.builtPositions.get(sticky);
			if (!builtSticky || anchors.length === 0) {
				this.parkSticky(sticky);
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
				builtSticky[0] + nearest.position[0] - builtNearest[0],
				builtSticky[1] + nearest.position[1] - builtNearest[1],
			];
		}
	}

	/** No added nodes to follow — drop the sticky below everything on the canvas. */
	private parkSticky(sticky: NodeJSON): void {
		if (this.settled.length === 0) return;
		const boxes = this.settled.map((node) => this.boxOf(node));
		const minX = Math.min(...boxes.map((box) => box.x));
		const bottom = Math.max(...boxes.map((box) => box.y + box.height));
		sticky.position = [minX, bottom + NODE_Y_SPACING];
	}
}

/**
 * For updates, restore each surviving node's position from the saved workflow —
 * the sandbox build has no view of it, so `toJSON({ tidyUp: true })` scatters a
 * canvas the user had arranged. Reconciling by name mirrors ensureWebhookIds.
 *
 * Added nodes are then placed the way tidy-up would arrange them around their
 * surviving neighbours. The saved layout is preserved up to the insertion point
 * and never restructured: a cluster that fits moves nothing else; a colliding
 * cluster pushes the occupants right as one block (the editor's
 * insert-on-connection push); a splice that cannot fit re-flows the downstream
 * survivors into the fresh frame beside it rather than pinning rows of a graph
 * that no longer exists.
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

	const added: NodeJSON[] = [];
	let survivors = 0;
	for (const node of json.nodes ?? []) {
		const saved = node.name ? savedPositionsByName.get(node.name) : undefined;
		// Restore before any geometry, so placement math sees the real canvas.
		if (saved) {
			node.position = saved;
			survivors++;
		} else {
			added.push(node);
		}
	}

	// Every node is new (or renamed) — there is no prior layout left to honour.
	if (survivors === 0) return;

	if (added.length > 0) {
		const nonMainInputCounts = await resolveNonMainInputCounts(json, ctx);
		new AddedNodePlacer(json, added, nonMainInputCounts).run();
	}
}

/**
 * Resolve each node's non-main input slot count from its real node type
 * description, the way the editor sizes nodes: NodeHelpers.getNodeInputs
 * evaluates expression-valued `inputs` against the node's parameters and
 * version. Absent the adapter (sandbox, tests), layout falls back to its
 * wiring- and type-list heuristics.
 */
async function resolveNonMainInputCounts(
	json: WorkflowJSON,
	ctx: InstanceAiContext,
): Promise<Map<string, number> | undefined> {
	const resolveInputs = ctx.nodeService?.getResolvedNodeInputs?.bind(ctx.nodeService);
	if (!resolveInputs) return undefined;

	const counts = new Map<string, number>();
	for (const node of json.nodes ?? []) {
		if (!node.name || isStickyNoteType(node.type)) continue;
		const inputs = await resolveInputs(json, node.name).catch(() => undefined);
		// An empty list is ambiguous (trigger vs unknown type) — leave those to
		// the heuristics, which size both as standard cards anyway.
		if (!inputs || inputs.length === 0) continue;
		const nonMain = inputs.filter(
			(input) => (typeof input === 'string' ? input : input.type) !== 'main',
		).length;
		counts.set(node.name, nonMain);
	}
	return counts;
}
