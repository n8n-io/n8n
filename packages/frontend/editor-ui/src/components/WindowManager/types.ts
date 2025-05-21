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
	id: string;
	readonly nodeType: 'split';
	weights: number[];
	direction: SplitDirection;
	children: PaneNode[];
}

export interface LeafPane {
	id: string;
	readonly nodeType: 'leaf';
	content: ContentDescriptor;
}

export type PaneNode = SplitPane | LeafPane;

export function isSplitPane(node: PaneNode): node is SplitPane {
	return node.nodeType === 'split';
}

export function isLeafPane(node: PaneNode): node is LeafPane {
	return node.nodeType === 'leaf';
}
