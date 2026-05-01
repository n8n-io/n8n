import { ref, nextTick } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { GraphNode } from '@vue-flow/core';
import { useDebounceFn } from '@vueuse/core';
import type { CanvasNodeData } from '@/features/workflows/canvas/canvas.types';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import { DEFAULT_NODE_SIZE } from '@/app/utils/nodeViewUtils';
import { FORM_STEP_MIN_GAP } from '../constants';

const DEFAULT_H = DEFAULT_NODE_SIZE[1]; // 96 — standard canvas node height

// ---------------------------------------------------------------------------
// Pure layout helpers — no Vue reactivity, easy to unit-test in isolation.
// ---------------------------------------------------------------------------

/**
 * Groups FormStep nodes by their original workflow Y coordinate.
 * Nodes sharing the same rounded Y belong to the same canvas "row" and compete
 * for vertical space together.
 *
 * @param formStepNodes  Only the FormStep-typed nodes.
 * @param originalYById  Snapshot of each node's Y before any layout shift;
 *                       used so re-runs don't corrupt grouping after positions move.
 */
function groupFormStepsByRow(
	formStepNodes: GraphNode[],
	originalYById: Map<string, number>,
): Map<number, GraphNode[]> {
	const byRow = new Map<number, GraphNode[]>();
	for (const node of formStepNodes) {
		const y = Math.round(originalYById.get(node.id) ?? node.position.y);
		const row = byRow.get(y) ?? [];
		row.push(node);
		byRow.set(y, row);
	}
	return byRow;
}

/**
 * For each row (sorted top-to-bottom by original Y), computes the Y coordinate
 * of the row's vertical centre.
 *
 * A row keeps its natural centre (originalY + DEFAULT_H / 2) when there is enough
 * room above it. When the previous row's wrapper would overlap, the row is pushed
 * down so the gap between wrapper edges is at least FORM_STEP_MIN_GAP pixels.
 * Visual gap between card content edges = FORM_STEP_MIN_GAP + 2 × FORM_STEP_PADDING (from constants).
 *
 * @param sortedRows  [originalY, nodes] pairs sorted ascending by originalY.
 */
function computeRowCenters(
	sortedRows: Array<[originalY: number, nodes: GraphNode[]]>,
): Map<number, number> {
	const rowCenters = new Map<number, number>();
	let prevWrapperBottom = -Infinity;

	for (const [originalY, rowNodes] of sortedRows) {
		const wrapperH = Math.max(...rowNodes.map((n) => n.dimensions.height || DEFAULT_H));
		const naturalCenter = originalY + DEFAULT_H / 2;
		const minCenter =
			prevWrapperBottom === -Infinity
				? naturalCenter
				: prevWrapperBottom + FORM_STEP_MIN_GAP + wrapperH / 2;
		const center = Math.max(naturalCenter, minCenter);
		rowCenters.set(originalY, center);
		prevWrapperBottom = center + wrapperH / 2;
	}

	return rowCenters;
}

/**
 * Returns how far each FormStep row moved from its natural vertical centre.
 * shift > 0 means the row was pushed down; shift = 0 means it kept its place.
 *
 * These shifts are later used to move non-FormStep nodes proportionally so
 * connection lines maintain geometrically consistent angles.
 *
 * @param rowYs      Original Y values in ascending order (index matches sortedRows).
 * @param rowCenters Computed centre for each original Y (from computeRowCenters).
 */
function buildRowShifts(rowYs: number[], rowCenters: Map<number, number>): Map<number, number> {
	return new Map(
		rowYs.map((y) => [y, (rowCenters.get(y) ?? y + DEFAULT_H / 2) - (y + DEFAULT_H / 2)]),
	);
}

/**
 * Returns the layout shift for a non-FormStep node by taking the shift of the
 * last FormStep row whose original Y is ≤ the node's Y (floor). Clamps to the
 * first row's shift when the node sits above all form rows.
 *
 * Using the floor row (rather than interpolating) means all non-FormStep nodes
 * between two form rows shift by the same amount, so entire branches move
 * together as a unit instead of stretching.
 *
 * @param y          The node's original workflow Y.
 * @param rowYs      Sorted original Y values of all FormStep rows.
 * @param rowShifts  Shift amount for each row Y (from buildRowShifts).
 */
function floorShift(y: number, rowYs: number[], rowShifts: Map<number, number>): number {
	if (rowYs.length === 0) return 0;
	let result = rowShifts.get(rowYs[0]) ?? 0; // clamp: default to first row when y is above all rows
	for (const ry of rowYs) {
		if (ry <= y) result = rowShifts.get(ry) ?? 0;
		else break; // rowYs is sorted ascending
	}
	return result;
}

/**
 * Computes the new Y position for a single node.
 *
 * - **FormStep node**: positioned so its vertical centre lands on the row's computed
 *   centre, taking the node's actual measured height into account.
 * - **Other node**: shifted by the floor shift at its original Y (shift of the nearest
 *   FormStep row at or above), so the whole branch moves as a unit.
 *
 * Returns `null` when the node's row has no entry in rowCenters (should not happen).
 *
 * @param origY        The node's original workflow Y (pre-layout snapshot).
 * @param isFormStep   Whether this node renders as a FormStepCard.
 * @param wrapperH     The node's measured height (or DEFAULT_H as fallback).
 * @param rowCenters   Computed centres from computeRowCenters.
 * @param rowYs        Sorted row Y values.
 * @param rowShifts    Row shifts from buildRowShifts.
 */
function computeNodeNewY(
	origY: number,
	isFormStep: boolean,
	wrapperH: number,
	rowCenters: Map<number, number>,
	rowYs: number[],
	rowShifts: Map<number, number>,
): number | null {
	if (isFormStep) {
		const center = rowCenters.get(Math.round(origY));
		if (center === undefined) return null;
		return center - wrapperH / 2;
	}
	return origY + floorShift(origY, rowYs, rowShifts);
}

// ---------------------------------------------------------------------------
// Composable — orchestrates the helpers above with VueFlow reactivity.
// ---------------------------------------------------------------------------

/**
 * Post-render layout for the Forms canvas view.
 *
 * useCanvasMapping applies only the X offset needed to centre form-step cards on
 * their workflow position. This composable runs after VueFlow measures actual node
 * dimensions and then:
 *
 *  1. Vertically centres every FormStep card on its row's natural centre point.
 *  2. Pushes rows apart when neighbouring card wrappers would otherwise overlap.
 *  3. Shifts non-FormStep nodes proportionally so connection lines stay straight.
 *  4. Re-runs automatically when any FormStep card changes height (e.g. after its
 *     iframe finishes loading).
 */
export function useFormsLayout(vueFlowId: string) {
	const { onNodesInitialized, onNodesChange, getNodes, updateNode, updateNodeInternals, fitView } =
		useVueFlow(vueFlowId);

	const layoutReady = ref(false);

	// Original workflow Y positions snapshotted on first layout run.
	// Re-runs use these so shifted positions don't corrupt row grouping.
	const originalYById = new Map<string, number>();

	// FormStep node ID set for O(1) lookup in the onNodesChange handler.
	// Populated/refreshed inside applyLayout so it's always in sync.
	const formStepNodeIds = new Set<string>();

	function applyLayout({ doFitView }: { doFitView: boolean }) {
		const nodes = getNodes.value;
		if (!nodes.length) {
			layoutReady.value = true;
			return;
		}

		const formStepNodes = nodes.filter(
			(n) => (n.data as CanvasNodeData).render?.type === CanvasNodeRenderType.FormStep,
		);
		if (!formStepNodes.length) {
			layoutReady.value = true;
			return;
		}

		// Refresh the lookup set so the onNodesChange handler can use O(1) checks.
		formStepNodeIds.clear();
		for (const n of formStepNodes) formStepNodeIds.add(n.id);

		// Snapshot original Ys on first encounter so subsequent re-runs use stable row keys.
		for (const node of nodes) {
			if (!originalYById.has(node.id)) {
				originalYById.set(node.id, node.position.y);
			}
		}

		const byRow = groupFormStepsByRow(formStepNodes, originalYById);
		const sortedRows = [...byRow.entries()].sort(([a], [b]) => a - b);
		const rowCenters = computeRowCenters(sortedRows);
		const rowYs = sortedRows.map(([y]) => y);
		const rowShifts = buildRowShifts(rowYs, rowCenters);

		const updatedIds: string[] = [];
		for (const node of nodes) {
			const origY = originalYById.get(node.id) ?? node.position.y;
			const isFormStep =
				(node.data as CanvasNodeData).render?.type === CanvasNodeRenderType.FormStep;
			const newY = computeNodeNewY(
				origY,
				isFormStep,
				node.dimensions.height || DEFAULT_H,
				rowCenters,
				rowYs,
				rowShifts,
			);
			if (newY === null) continue;
			if (Math.abs(newY - node.position.y) >= 0.5) {
				updateNode(node.id, { position: { x: node.position.x, y: newY } });
				updatedIds.push(node.id);
			}
		}

		if (updatedIds.length) updateNodeInternals(updatedIds);

		void nextTick(() => {
			if (doFitView) void fitView({ padding: 0.1 });
			layoutReady.value = true;
		});
	}

	// Re-apply layout (without fitView) when a FormStep card changes height.
	// Debounced so rapid sequential iframe loads don't thrash.
	const debouncedApply = useDebounceFn(() => applyLayout({ doFitView: false }), 50);

	onNodesChange((changes) => {
		if (!layoutReady.value) return;
		const hasDimChange = changes.some((c) => c.type === 'dimensions' && formStepNodeIds.has(c.id));
		if (hasDimChange) void debouncedApply();
	});

	const { off } = onNodesInitialized(() => {
		applyLayout({ doFitView: true });
		off();
	});

	function refreshLayout() {
		applyLayout({ doFitView: false });
	}

	return { layoutReady, refreshLayout };
}
