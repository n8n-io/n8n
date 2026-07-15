import { computed, reactive, ref, shallowRef } from 'vue';
import type { Ref } from 'vue';
import type { WorkflowTriggerType } from '@n8n/api-types';

import type { GraphModel } from './graph-model';
import { buildGraphModel } from './graph-model';
import { useProjectDependencyGraph } from './composables/useProjectDependencyGraph';

/** Node tint per trigger type, shared by the experimental graph views. */
export const TRIGGER_TINTS: Record<WorkflowTriggerType, string> = {
	chat: 'var(--color--primary)',
	webhook: 'var(--color--primary)',
	slack: 'var(--color--primary)',
	schedule: 'var(--color--success)',
	form: 'var(--color--success)',
	error: 'var(--color--warning)',
	mcp: 'var(--color--secondary)',
	subworkflow: 'var(--color--text--tint-1)',
	manual: 'var(--color--text--tint-1)',
	none: 'var(--color--text--tint-1)',
};

export const CREDENTIAL_TINT = 'var(--color--warning)';

/** Deterministic distinct-ish color per folder, for hulls/boxes/arcs. */
export function folderColor(folderId: string): string {
	let hash = 0;
	for (let i = 0; i < folderId.length; i++) {
		hash = (hash * 31 + folderId.charCodeAt(i)) >>> 0;
	}
	const hue = hash % 360;
	return `hsl(${hue} 55% 55%)`;
}

/**
 * Fetch the root graph plus every folder discovered along the way — the full project —
 * and expose the merged model.
 */
export function useFullProjectModel(projectId: string) {
	const { fetchRootGraph, fetchFolderGraph, getAllGraphs } = useProjectDependencyGraph(projectId);
	const isLoading = ref(true);
	const model = shallowRef<GraphModel | null>(null);

	async function load(): Promise<GraphModel> {
		isLoading.value = true;
		try {
			await fetchRootGraph();
			const fetched = new Set<string>();
			let merged = buildGraphModel(getAllGraphs());
			let guard = 0;
			while (guard++ < 50) {
				const pending = [...merged.folders.keys()].filter((id) => !fetched.has(id));
				if (pending.length === 0) break;
				for (const folderId of pending) {
					fetched.add(folderId);
					await fetchFolderGraph(folderId);
				}
				merged = buildGraphModel(getAllGraphs());
			}
			model.value = merged;
			return merged;
		} finally {
			isLoading.value = false;
		}
	}

	return { isLoading, model, load };
}

/** Shared view-only pan/zoom for the SVG graph views (drag pans, ctrl/cmd-wheel zooms). */
export function usePanZoom(svgEl: Ref<SVGSVGElement | undefined>) {
	const view = reactive({ x: 0, y: 0, zoom: 1 });
	let panning: { startX: number; startY: number; viewX: number; viewY: number } | null = null;

	function onPointerDown(event: PointerEvent): void {
		if (event.button !== 0) return;
		panning = { startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y };
	}

	function onPointerMove(event: PointerEvent): void {
		if (!panning) return;
		view.x = panning.viewX + (event.clientX - panning.startX);
		view.y = panning.viewY + (event.clientY - panning.startY);
	}

	function onPointerUp(): void {
		panning = null;
	}

	function onWheel(event: WheelEvent): void {
		event.preventDefault();
		const bounds = svgEl.value?.getBoundingClientRect();
		if (!bounds) return;
		if (event.ctrlKey || event.metaKey) {
			const factor = Math.exp(-event.deltaY * 0.01);
			const zoom = Math.min(3, Math.max(0.1, view.zoom * factor));
			const cx = event.clientX - bounds.left;
			const cy = event.clientY - bounds.top;
			view.x = cx - ((cx - view.x) / view.zoom) * zoom;
			view.y = cy - ((cy - view.y) / view.zoom) * zoom;
			view.zoom = zoom;
		} else {
			view.x -= event.deltaX;
			view.y -= event.deltaY;
		}
	}

	function centerOn(svg: SVGSVGElement | undefined): void {
		const bounds = svg?.getBoundingClientRect();
		if (!bounds) return;
		view.x = bounds.width / 2;
		view.y = bounds.height / 2;
	}

	const transform = computed(() => `translate(${view.x}, ${view.y}) scale(${view.zoom})`);

	return { view, transform, onPointerDown, onPointerMove, onPointerUp, onWheel, centerOn };
}

/** Andrew's monotone chain convex hull. Returns hull points in order. */
export function convexHull(
	points: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
	if (points.length < 3) return [...points];
	const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
	const cross = (
		o: { x: number; y: number },
		a: { x: number; y: number },
		b: { x: number; y: number },
	) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	const lower: Array<{ x: number; y: number }> = [];
	for (const p of sorted) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
			lower.pop();
		}
		lower.push(p);
	}
	const upper: Array<{ x: number; y: number }> = [];
	for (let i = sorted.length - 1; i >= 0; i--) {
		const p = sorted[i];
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
			upper.pop();
		}
		upper.push(p);
	}
	lower.pop();
	upper.pop();
	return [...lower, ...upper];
}

/** Closed smooth path through hull points (quadratic curves via midpoints). */
export function smoothClosedPath(points: Array<{ x: number; y: number }>): string {
	if (points.length === 0) return '';
	if (points.length === 1) {
		const p = points[0];
		return `M ${p.x - 1} ${p.y} A 1 1 0 1 0 ${p.x + 1} ${p.y} A 1 1 0 1 0 ${p.x - 1} ${p.y}`;
	}
	if (points.length === 2) {
		const [a, b] = points;
		return `M ${a.x} ${a.y} L ${b.x} ${b.y} Z`;
	}
	const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
		x: (a.x + b.x) / 2,
		y: (a.y + b.y) / 2,
	});
	let d = '';
	for (let i = 0; i < points.length; i++) {
		const current = points[i];
		const next = points[(i + 1) % points.length];
		const m = mid(current, next);
		if (i === 0) {
			const prevMid = mid(points[points.length - 1], current);
			d = `M ${prevMid.x} ${prevMid.y}`;
		}
		d += ` Q ${current.x} ${current.y} ${m.x} ${m.y}`;
	}
	return `${d} Z`;
}
