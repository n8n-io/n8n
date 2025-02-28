export const directionsCursorMaps = {
	right: 'ew-resize',
	top: 'ns-resize',
	bottom: 'ns-resize',
	left: 'ew-resize',
	topLeft: 'nw-resize',
	topRight: 'ne-resize',
	bottomLeft: 'sw-resize',
	bottomRight: 'se-resize',
} as const;

export type Direction = keyof typeof directionsCursorMaps;

export interface ResizeData {
	height: number;
	width: number;
	dX: number;
	dY: number;
	x: number;
	y: number;
	direction: Direction;
}
