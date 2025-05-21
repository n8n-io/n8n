export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export const enum SplitDirection {
	Horizontal = 'horizontal',
	Vertical = 'vertical',
}

export interface ContentDescriptor {
	kind: 'node-view';
	meta?: Record<string, unknown>;
}

export interface SplitPane {
	readonly nodeType: 'split';
	weights: number[];
	direction: SplitDirection;
	children: PaneNode[];
}

export interface LeafPane {
	readonly nodeType: 'leaf';
	content: ContentDescriptor;
}

export type PaneNode = SplitPane | LeafPane;
