import { isRecord } from '@n8n/utils/is-record';

// Shift the reveal by four zoom-out clicks. Vue Flow divides the zoom by 1.2 per click.
const ZOOM_DELAY = 1.2 ** 4;
export const CONSTELLATION_ZOOM_START = 0.32 / ZOOM_DELAY;
export const CONSTELLATION_ZOOM_FULL = 0.18 / ZOOM_DELAY;

export function getConstellationProgress(zoom: number) {
	const progress = Math.max(
		0,
		Math.min(
			1,
			(CONSTELLATION_ZOOM_START - zoom) / (CONSTELLATION_ZOOM_START - CONSTELLATION_ZOOM_FULL),
		),
	);
	return progress * progress * (3 - 2 * progress);
}

export interface ConstellationCanvasNode {
	id: string;
	computedPosition: { x: number; y: number };
	dimensions: { width: number; height: number };
	data: unknown;
	hidden?: boolean;
}

export interface ConstellationCanvasEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string | null;
}

export interface ConstellationViewport {
	x: number;
	y: number;
	zoom: number;
}

export function projectCanvasStars(
	nodes: ConstellationCanvasNode[],
	viewport: ConstellationViewport,
) {
	return nodes.flatMap((node) => {
		if (
			node.hidden ||
			!isRecord(node.data) ||
			typeof node.data.name !== 'string' ||
			typeof node.data.type !== 'string' ||
			node.data.type === 'n8n-nodes-base.stickyNote'
		)
			return [];
		return [
			{
				id: node.id,
				name: node.data.name,
				x: (node.computedPosition.x + node.dimensions.width / 2) * viewport.zoom + viewport.x,
				y: (node.computedPosition.y + node.dimensions.height / 2) * viewport.zoom + viewport.y,
			},
		];
	});
}
