import { ref, nextTick } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import { useDebounceFn } from '@vueuse/core';
import type { CanvasNodeData } from '@/features/workflows/canvas/canvas.types';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import { DEFAULT_NODE_SIZE } from '@/app/utils/nodeViewUtils';

// FormStepCard.vue wraps the card in 20px top+bottom padding.
// MIN_WRAPPER_GAP = 60px between wrapper bottom and next wrapper top
// → 60 + 20 (bottom pad) + 20 (top pad) = 100px visual gap between card edges.
const MIN_WRAPPER_GAP = 60;

const DEFAULT_H = DEFAULT_NODE_SIZE[1]; // 96

/**
 * Post-render layout for the Forms canvas view.
 *
 * useCanvasMapping only applies the X offset needed to centre form-step cards
 * on their workflow position. This composable runs after VueFlow measures
 * actual node dimensions and then:
 *
 *  1. Vertically centres every FormStep card on its row's natural centre point
 *     (originalY + DEFAULT_H / 2), matching how a 96px default node is centred.
 *  2. Pushes rows apart when neighbouring card wrappers would otherwise overlap,
 *     guaranteeing at least MIN_WRAPPER_GAP pixels between wrapper edges.
 *  3. Applies an interpolated Y shift to non-FormStep nodes (e.g. Edit Fields)
 *     so they move proportionally with their surrounding FormStep rows and
 *     connection lines stay geometrically consistent (no sinusoid effect).
 *  4. Re-runs automatically when any FormStep card changes height (e.g. after
 *     its iframe finishes loading), using snapshotted original Y positions so
 *     row grouping stays stable across multiple layout passes.
 */
export function useFormsLayout(vueFlowId: string) {
	const { onNodesInitialized, onNodesChange, getNodes, updateNode, updateNodeInternals, fitView } =
		useVueFlow(vueFlowId);

	const layoutReady = ref(false);

	// Original workflow Y positions snapshotted on first layout run.
	// Re-runs use these so shifted positions don't corrupt row grouping.
	const originalYById = new Map<string, number>();

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

		// Snapshot original Ys on first encounter so subsequent runs use stable row keys.
		for (const node of nodes) {
			if (!originalYById.has(node.id)) {
				originalYById.set(node.id, node.position.y);
			}
		}

		// Group FormStep nodes by original workflow Y (row identity).
		const byRow = new Map<number, typeof formStepNodes>();
		for (const node of formStepNodes) {
			const y = Math.round(originalYById.get(node.id) ?? node.position.y);
			const row = byRow.get(y) ?? [];
			row.push(node);
			byRow.set(y, row);
		}

		const sortedRows = [...byRow.entries()].sort(([a], [b]) => a - b);

		// Compute the vertical centre for each row.
		// Rows that already have enough natural space keep their original centre.
		// Rows that would overlap the previous row are pushed down.
		const rowCenters = new Map<number, number>();
		let prevWrapperBottom = -Infinity;

		for (const [originalY, rowNodes] of sortedRows) {
			const maxH = Math.max(...rowNodes.map((n) => n.dimensions.height || DEFAULT_H));
			const naturalCenter = originalY + DEFAULT_H / 2;
			const minCenter =
				prevWrapperBottom === -Infinity
					? naturalCenter
					: prevWrapperBottom + MIN_WRAPPER_GAP + maxH / 2;
			const center = Math.max(naturalCenter, minCenter);
			rowCenters.set(originalY, center);
			prevWrapperBottom = center + maxH / 2;
		}

		// Compute the Y shift applied to each FormStep row's natural centre.
		const rowYs = sortedRows.map(([y]) => y);
		const rowShifts = new Map(
			rowYs.map((y) => [y, (rowCenters.get(y) ?? y + DEFAULT_H / 2) - (y + DEFAULT_H / 2)]),
		);

		// For a given original Y, interpolate (or clamp) the shift from surrounding FormStep rows.
		function shiftAt(y: number): number {
			if (rowYs.length === 0) return 0;
			if (y <= rowYs[0]) return rowShifts.get(rowYs[0]) ?? 0;
			if (y >= rowYs[rowYs.length - 1]) return rowShifts.get(rowYs[rowYs.length - 1]) ?? 0;
			let lo = 0;
			let hi = rowYs.length - 1;
			while (hi - lo > 1) {
				const mid = (lo + hi) >> 1;
				if (rowYs[mid] <= y) lo = mid;
				else hi = mid;
			}
			const y0 = rowYs[lo];
			const y1 = rowYs[hi];
			const t = (y - y0) / (y1 - y0);
			return (rowShifts.get(y0) ?? 0) + t * ((rowShifts.get(y1) ?? 0) - (rowShifts.get(y0) ?? 0));
		}

		// Reposition all nodes:
		// - FormStep nodes: centre on their row's computed centre using actual height.
		// - All other nodes: apply interpolated shift to preserve relative geometry.
		const updatedIds: string[] = [];
		for (const node of nodes) {
			const origY = originalYById.get(node.id) ?? node.position.y;
			const isFormStep =
				(node.data as CanvasNodeData).render?.type === CanvasNodeRenderType.FormStep;

			let newY: number;
			if (isFormStep) {
				const rowY = Math.round(origY);
				const center = rowCenters.get(rowY);
				if (center === undefined) continue;
				const h = node.dimensions.height || DEFAULT_H;
				newY = center - h / 2;
			} else {
				newY = origY + shiftAt(origY);
			}

			if (Math.abs(newY - node.position.y) >= 0.5) {
				updateNode(node.id, { position: { x: node.position.x, y: newY } });
				updatedIds.push(node.id);
			}
		}

		if (updatedIds.length) {
			updateNodeInternals(updatedIds);
		}

		void nextTick(() => {
			if (doFitView) void fitView({ padding: 0.1 });
			layoutReady.value = true;
		});
	}

	// Re-apply layout (without fitView) when a FormStep card changes height.
	// Debounced so rapid sequential loads don't thrash.
	const debouncedApply = useDebounceFn(() => applyLayout({ doFitView: false }), 50);

	onNodesChange((changes) => {
		if (!layoutReady.value) return;
		const hasDimChange = changes.some((c) => {
			if (c.type !== 'dimensions') return false;
			const node = getNodes.value.find((n) => n.id === c.id);
			return (
				(node?.data as CanvasNodeData | undefined)?.render?.type === CanvasNodeRenderType.FormStep
			);
		});
		if (hasDimChange) debouncedApply();
	});

	const { off } = onNodesInitialized(() => {
		applyLayout({ doFitView: true });
		off();
	});

	return { layoutReady };
}
