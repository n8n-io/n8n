import { ref, nextTick } from 'vue';
import { useVueFlow } from '@vue-flow/core';
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
 */
export function useFormsLayout(vueFlowId: string) {
	const { onNodesInitialized, getNodes, updateNode, updateNodeInternals, fitView } =
		useVueFlow(vueFlowId);

	const layoutReady = ref(false);

	function applyLayout() {
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

		// Group FormStep nodes by original Y coordinate (row).
		// Nodes on the same workflow row share the same Y value.
		const byRow = new Map<number, typeof formStepNodes>();
		for (const node of formStepNodes) {
			const y = Math.round(node.position.y);
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
		// shift = 0 means the row stayed in place; positive means pushed down.
		const rowYs = sortedRows.map(([y]) => y);
		const rowShifts = new Map(
			rowYs.map((y) => [y, (rowCenters.get(y) ?? y + DEFAULT_H / 2) - (y + DEFAULT_H / 2)]),
		);

		// For a given Y, interpolate (or clamp) the shift from surrounding FormStep rows.
		// This keeps non-FormStep nodes (Edit Fields, etc.) moving in proportion to their
		// neighbouring form cards so connection lines maintain consistent angles.
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
			const originalY = node.position.y;
			const isFormStep =
				(node.data as CanvasNodeData).render?.type === CanvasNodeRenderType.FormStep;

			let newY: number;
			if (isFormStep) {
				const rowY = Math.round(originalY);
				const center = rowCenters.get(rowY);
				if (center === undefined) continue;
				const h = node.dimensions.height || DEFAULT_H;
				newY = center - h / 2;
			} else {
				newY = originalY + shiftAt(originalY);
			}

			if (Math.abs(newY - originalY) >= 0.5) {
				updateNode(node.id, { position: { x: node.position.x, y: newY } });
				updatedIds.push(node.id);
			}
		}

		if (updatedIds.length) {
			updateNodeInternals(updatedIds);
		}

		void nextTick(() => {
			void fitView({ padding: 0.1 });
			layoutReady.value = true;
		});
	}

	const { off } = onNodesInitialized(() => {
		applyLayout();
		off();
	});

	return { layoutReady };
}
