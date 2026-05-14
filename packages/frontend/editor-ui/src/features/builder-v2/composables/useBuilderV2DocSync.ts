import { nextTick, watch, type ShallowRef } from 'vue';
import { NodeConnectionTypes, type IConnections, type INode } from 'n8n-workflow';
import type { EventBus } from '@n8n/utils/event-bus';
import type { INodeUi } from '@/Interface';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { CanvasEventBusEvents } from '@/features/workflows/canvas/canvas.types';
import { useBuilderV2Store } from '../stores/builder-v2.store';
import type {
	BuilderV2ConnectionContext,
	BuilderV2Ghost,
	BuilderV2InsertionPoint,
} from '../builder-v2.api';
import { builderV2GhostId, isBuilderV2GhostId } from '../utils/ghostIds';

/**
 * Builder-V2 doc sync.
 *
 * Why this exists: ghosts (agent-proposed candidate nodes) and BE-committed
 * nodes used to be synthesised into the canvas computed in WorkflowCanvas.vue.
 * That made them invisible to NDV (which looks nodes up in the workflow
 * document store by id), so clicking a ghost couldn't open its parameter
 * panel. This composable instead writes them INTO the document store with a
 * `placeholderKind: 'ghost'` flag, so NDV opens naturally on dbl-click while
 * the marching-ants ghost visual stays intact.
 *
 * Lifecycle:
 *  - On every change to `builderV2Store.ghosts` / `builderV2Store.workflow`:
 *    1. Remove ghosts from doc that are no longer in `state.ghosts` (and
 *       their preview connections).
 *    2. Add new ghosts to doc as real nodes with synthetic ids, centered
 *       vertically around their anchor.
 *    3. Add BE-committed nodes (returned in `state.workflow.nodes`) to doc.
 *    4. Merge BE connections into the doc.
 *    5. For `kind: 'after'` insertion points, add FE-only preview edges from
 *       the source node to each ghost so the user sees WHERE each candidate
 *       would slot in. Runs after step 4 so the BE-connections merge cannot
 *       clobber the preview edges.
 *
 * Optimistic mutations from pick/reject in the store live alongside this
 * sync — the next refresh after a pick reconciles them with BE truth.
 *
 * Identification:
 *  - Ghost ids: `__builder-v2-ghost-${sessionId}-${idx}` (FE-synthetic).
 *  - BE-committed ids: BE-assigned UUIDs. On reconcile we keep BE ids as the
 *    source of truth; optimistically-converted ghosts get replaced when the
 *    BE-committed equivalent shows up at the next refresh.
 */

// Vertical spacing between stacked ghosts. Stack is centered around the anchor
// y so a single ghost stays inline with its parent, two ghosts straddle the
// parent's y by ±60, three sit at -120/0/+120, etc.
const GHOST_STACK_OFFSET_Y = 120;
// Horizontal offset from the source node to its ghost children. Kept in sync
// with `NODE_SPACING_X` in packages/cli/src/modules/workflow-builder-v2/tools/commit-node.tool.ts
// so the BE fallback position matches the FE ghost position when no
// `pickedPosition` is supplied.
const GHOST_AFTER_OFFSET_X = 220;
const GHOST_FROM_START_X = 250;
const GHOST_FROM_START_Y = 300;

/**
 * Compute the on-canvas position for a ghost given the insertion-point hint
 * and the existing real nodes (doc + BE-committed). Falls back to a sensible
 * default if no real nodes exist. Multiple ghosts stack vertically, centered
 * around the anchor y so the parent has a balanced fan-out:
 *   1 ghost  → inline with parent
 *   2 ghosts → ±60 around parent
 *   3 ghosts → -120 / 0 / +120 around parent
 */
function computeGhostPosition(
	idx: number,
	count: number,
	ghost: BuilderV2Ghost,
	insertionPoint: BuilderV2InsertionPoint | null,
	connectionContext: BuilderV2ConnectionContext | null,
	realNodes: Array<{ id: string; position: [number, number] }>,
): [number, number] {
	if (ghost.position) return ghost.position;

	let anchorX = GHOST_FROM_START_X;
	let anchorY = GHOST_FROM_START_Y;

	if (connectionContext) {
		const anchor = realNodes.find((n) => n.id === connectionContext.nodeId);
		const target = connectionContext.targetNodeId
			? realNodes.find((n) => n.id === connectionContext.targetNodeId)
			: undefined;
		if (anchor && target) {
			anchorX = (anchor.position[0] + target.position[0]) / 2;
			anchorY = (anchor.position[1] + target.position[1]) / 2;
		} else if (anchor) {
			anchorX =
				connectionContext.mode === 'inputs'
					? anchor.position[0]
					: anchor.position[0] + GHOST_AFTER_OFFSET_X;
			anchorY =
				connectionContext.mode === 'inputs'
					? anchor.position[1] + GHOST_STACK_OFFSET_Y
					: anchor.position[1];
		}
	} else if (insertionPoint?.kind === 'after') {
		const afterNode = realNodes.find((n) => n.id === insertionPoint.afterNodeId);
		if (afterNode) {
			anchorX = afterNode.position[0] + GHOST_AFTER_OFFSET_X;
			anchorY = afterNode.position[1];
		} else if (realNodes.length > 0) {
			const last = realNodes[realNodes.length - 1];
			anchorX = last.position[0] + GHOST_AFTER_OFFSET_X;
			anchorY = last.position[1];
		}
	} else if (realNodes.length > 0) {
		const minX = Math.min(...realNodes.map((n) => n.position[0]));
		const triggerY = realNodes[0].position[1];
		anchorX = minX - GHOST_AFTER_OFFSET_X;
		anchorY = triggerY;
	}

	const yOffset = (idx - (count - 1) / 2) * GHOST_STACK_OFFSET_Y;
	return [anchorX, anchorY + yOffset];
}

type WorkflowDocumentStore = ReturnType<typeof useWorkflowDocumentStore>;

/**
 * Builds the INodeUi representation of a ghost. Marked with
 * `placeholderKind: 'ghost'` so the canvas applies the marching-ants treatment.
 */
function ghostToNode(
	sessionId: string,
	idx: number,
	ghost: BuilderV2Ghost,
	position: [number, number],
): INodeUi {
	return {
		id: builderV2GhostId(sessionId, idx),
		name: ghost.displayName,
		type: ghost.nodeType,
		typeVersion: ghost.version,
		position,
		parameters: ghost.parameters ?? {},
		placeholder: true,
		placeholderKind: 'ghost',
		builderV2GhostIndex: idx,
		draggable: false,
	};
}

function isSameGhostNode(node: INodeUi, ghost: BuilderV2Ghost, idx: number): boolean {
	return (
		node.placeholder === true &&
		node.placeholderKind === 'ghost' &&
		node.builderV2GhostIndex === idx &&
		node.name === ghost.displayName &&
		node.type === ghost.nodeType &&
		node.typeVersion === ghost.version &&
		JSON.stringify(node.parameters ?? {}) === JSON.stringify(ghost.parameters ?? {})
	);
}

interface SyncContext {
	doc: WorkflowDocumentStore;
	sessionId: string;
	ghosts: BuilderV2Ghost[];
	insertionPoint: BuilderV2InsertionPoint | null;
	connectionContext: BuilderV2ConnectionContext | null;
	committedNodes: INode[];
	committedConnections: IConnections;
}

interface SyncResult {
	addedGhostIds: string[];
	hadRealNodesBeforeSync: boolean;
}

/**
 * Single sync step: reconciles doc-store nodes/connections with the builder-v2
 * store's current ghosts + BE-committed workflow.
 */
export function syncDocStore(ctx: SyncContext): SyncResult {
	const {
		doc,
		sessionId,
		ghosts,
		insertionPoint,
		connectionContext,
		committedNodes,
		committedConnections,
	} = ctx;

	const docNodes = doc.allNodes;
	const hadRealNodesBeforeSync = docNodes.some((node) => !isBuilderV2GhostId(node.id));
	const addedGhostIds: string[] = [];

	// 1. Remove ghosts no longer in state.ghosts. Wipe their incoming preview
	//    connections first so we don't leave dangling edges that reference a
	//    node name that no longer exists.
	const validGhostIds = new Set(ghosts.map((_, idx) => builderV2GhostId(sessionId, idx)));
	for (const node of [...docNodes]) {
		if (isBuilderV2GhostId(node.id) && !validGhostIds.has(node.id)) {
			doc.removeAllNodeConnection(node);
			doc.removeNodeById(node.id);
		}
	}

	// 2. Add / update ghost nodes. Build the "real nodes" anchor set from the
	//    current doc nodes (excluding ghosts) plus the BE-committed nodes.
	const realNodes: Array<{ id: string; position: [number, number] }> = [
		...doc.allNodes
			.filter((n) => !isBuilderV2GhostId(n.id))
			.map((n) => ({ id: n.id, position: n.position })),
		...committedNodes.map((n) => ({
			id: n.id,
			position: n.position ?? [0, 0],
		})),
	];

	ghosts.forEach((ghost, idx) => {
		const id = builderV2GhostId(sessionId, idx);
		const existing = doc.getNodeById(id);
		const position = computeGhostPosition(
			idx,
			ghosts.length,
			ghost,
			insertionPoint,
			connectionContext,
			realNodes,
		);
		if (existing && !isSameGhostNode(existing, ghost, idx)) {
			doc.removeAllNodeConnection(existing);
			doc.removeNodeById(id);
			doc.addNode(ghostToNode(sessionId, idx, ghost, position));
		} else if (!existing) {
			doc.addNode(ghostToNode(sessionId, idx, ghost, position));
			addedGhostIds.push(id);
		}
		// We intentionally don't re-position existing ghosts; positions are
		// established on first insertion and stable until the ghost is removed.
	});

	// 3. Add BE-committed nodes that aren't already in the doc by id.
	const docIds = new Set(doc.allNodes.map((n) => n.id));
	const docNames = new Set(
		doc.allNodes.filter((n) => !isBuilderV2GhostId(n.id)).map((n) => n.name),
	);
	for (const node of committedNodes) {
		if (docIds.has(node.id)) continue;

		// If a doc node already exists with the same name, the BE committed node
		// is the canonical version of an optimistically-converted ghost. Replace
		// the doc node id so future updates use the BE id.
		if (docNames.has(node.name)) {
			// Find and remove the optimistic doc entry (it has a different id but
			// same name), then re-add with the BE id.
			const stale = doc.allNodes.find(
				(n) => n.name === node.name && !isBuilderV2GhostId(n.id) && n.id !== node.id,
			);
			if (stale) doc.removeNodeById(stale.id);
		}

		doc.addNode({
			...node,
			position: node.position ?? [0, 0],
		});
	}

	// 4. Merge BE connections into the doc — BE owns its own committed
	//    connections; preserve any existing user-owned connections that aren't
	//    overwritten.
	const beKeys = Object.keys(committedConnections);
	if (beKeys.length > 0) {
		const docConnections = doc.connectionsBySourceNode;
		const merged: IConnections = { ...docConnections };
		for (const key of beKeys) {
			merged[key] = committedConnections[key];
		}
		doc.setConnections(merged);
	}

	// 5. Add preview connections for ghosts so the user can see WHERE each
	//    candidate would slot into the workflow. These are FE-only and live as
	//    long as the ghost does — they're cleaned up in step 1 on the next
	//    sync, or by the store's pick/reject optimistic mutations.
	//
	//    Run this AFTER step 4 so the BE-connections merge (which replaces the
	//    whole connection entry for each key it touches) can't clobber the
	//    preview edges we add here.
	if (connectionContext && ghosts.length > 0) {
		addContextPreviewConnections({
			doc,
			sessionId,
			ghosts,
			connectionContext,
			committedNodes,
		});
	} else if (insertionPoint?.kind === 'after' && ghosts.length > 0) {
		// `insertionPoint.afterNodeId` is the BE node id. n8n connections are
		// keyed on node NAME — resolve the source by id first.
		const sourceNode =
			doc.getNodeById(insertionPoint.afterNodeId) ??
			committedNodes.find((n) => n.id === insertionPoint.afterNodeId);
		if (sourceNode) {
			for (let idx = 0; idx < ghosts.length; idx++) {
				const ghostId = builderV2GhostId(sessionId, idx);
				const ghostNode = doc.getNodeById(ghostId);
				if (!ghostNode) continue;
				doc.addConnection({
					connection: [
						{ node: sourceNode.name, type: NodeConnectionTypes.Main, index: 0 },
						{ node: ghostNode.name, type: NodeConnectionTypes.Main, index: 0 },
					],
				});
			}
		}
	}

	return { addedGhostIds, hadRealNodesBeforeSync };
}

function removeBuilderGhosts(doc: WorkflowDocumentStore) {
	for (const node of [...doc.allNodes]) {
		if (isBuilderV2GhostId(node.id)) {
			doc.removeAllNodeConnection(node);
			doc.removeNodeById(node.id);
		}
	}
}

function addContextPreviewConnections(input: {
	doc: WorkflowDocumentStore;
	sessionId: string;
	ghosts: BuilderV2Ghost[];
	connectionContext: BuilderV2ConnectionContext;
	committedNodes: INode[];
}) {
	const { doc, sessionId, ghosts, connectionContext, committedNodes } = input;
	const anchorNode =
		doc.getNodeById(connectionContext.nodeId) ??
		committedNodes.find((n) => n.id === connectionContext.nodeId);
	const targetNode = connectionContext.targetNodeId
		? (doc.getNodeById(connectionContext.targetNodeId) ??
			committedNodes.find((n) => n.id === connectionContext.targetNodeId))
		: undefined;
	if (!anchorNode) return;

	for (let idx = 0; idx < ghosts.length; idx++) {
		const ghostNode = doc.getNodeById(builderV2GhostId(sessionId, idx));
		if (!ghostNode) continue;

		if (connectionContext.mode === 'outputs') {
			doc.addConnection({
				connection: [
					{
						node: anchorNode.name,
						type: connectionContext.type,
						index: connectionContext.index,
					},
					{ node: ghostNode.name, type: connectionContext.type, index: 0 },
				],
			});
			if (targetNode) {
				doc.addConnection({
					connection: [
						{
							node: ghostNode.name,
							type: connectionContext.targetType ?? connectionContext.type,
							index: 0,
						},
						{
							node: targetNode.name,
							type: connectionContext.targetType ?? connectionContext.type,
							index: connectionContext.targetIndex ?? 0,
						},
					],
				});
			}
		} else {
			doc.addConnection({
				connection: [
					{ node: ghostNode.name, type: connectionContext.type, index: 0 },
					{ node: anchorNode.name, type: connectionContext.type, index: connectionContext.index },
				],
			});
		}
	}
}

/**
 * Wire the builder-v2 store to the workflow document store. Returns a cleanup
 * function that stops the watcher.
 */
export function useBuilderV2DocSync(
	workflowDocumentStore: ShallowRef<WorkflowDocumentStore>,
	eventBus?: EventBus<CanvasEventBusEvents>,
): { stop: () => void } {
	const builderV2Store = useBuilderV2Store();
	let tidyQueued = false;
	let stopped = false;

	function scheduleBuilderTidyUp() {
		if (!eventBus) return;
		if (tidyQueued) return;
		tidyQueued = true;

		void nextTick(() => {
			tidyQueued = false;
			if (stopped) return;

			eventBus.emit('tidyUp', {
				source: 'builder-update',
				preserveViewport: true,
				trackEvents: false,
				trackHistory: false,
				trackBulk: true,
			});
		});
	}

	function scheduleInitialGhostCenter(ghostId: string) {
		if (!eventBus) return;

		void nextTick(() => {
			if (stopped) return;

			eventBus.emit('nodes:select', { ids: [ghostId], centerIntoView: true });
		});
	}

	const stopWatch = watch(
		() => ({
			sessionId: builderV2Store.sessionId,
			activeWorkflowId: builderV2Store.activeWorkflowId,
			// Tracked reactively via `.ghosts` (referenced inside cb too) — `length`
			// keeps the dependency cheap.
			ghostsLen: builderV2Store.ghosts.length,
			ghostsKey: builderV2Store.ghosts
				.map((g) => `${g.nodeType}@${g.displayName}:${JSON.stringify(g.parameters ?? {})}`)
				.join('|'),
			workflowRev: builderV2Store.workflow,
			insertionPoint: builderV2Store.insertionPoint,
			connectionContext: builderV2Store.connectionContext,
		}),
		() => {
			const sessionId = builderV2Store.sessionId;
			const doc = workflowDocumentStore.value;
			const activeWorkflowId = builderV2Store.activeWorkflowId;
			if (activeWorkflowId !== null && activeWorkflowId !== doc.workflowId) {
				// Builder-v2 state is global, but workflow documents are scoped.
				// Never hydrate nodes from a previous workflow into the document
				// currently mounted by the canvas.
				removeBuilderGhosts(doc);
				return;
			}

			if (!sessionId) {
				// Session was reset — drop any leftover ghost nodes and their
				// preview connections from the doc.
				removeBuilderGhosts(doc);
				return;
			}

			const wf = builderV2Store.workflow as { nodes?: INode[]; connections?: IConnections } | null;

			const syncResult = syncDocStore({
				doc,
				sessionId,
				ghosts: builderV2Store.ghosts,
				insertionPoint: builderV2Store.insertionPoint,
				connectionContext: builderV2Store.connectionContext,
				committedNodes: wf?.nodes ?? [],
				committedConnections: wf?.connections ?? {},
			});
			if (
				!syncResult.hadRealNodesBeforeSync &&
				(wf?.nodes?.length ?? 0) === 0 &&
				syncResult.addedGhostIds.length > 0
			) {
				scheduleInitialGhostCenter(syncResult.addedGhostIds[0]);
			}
			if (builderV2Store.ghosts.length > 0 || (wf?.nodes?.length ?? 0) > 0) {
				scheduleBuilderTidyUp();
			}
		},
		{ immediate: true, deep: true },
	);

	return {
		stop: () => {
			stopped = true;
			stopWatch();
		},
	};
}
