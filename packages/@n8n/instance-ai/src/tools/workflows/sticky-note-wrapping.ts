import { isStickyNoteType, type WorkflowJSON } from '@n8n/workflow-sdk';

type WorkflowNode = WorkflowJSON['nodes'][number];
type NodeSizes = ReadonlyMap<string, { width: number; height: number }>;

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** A sticky note and the nodes that sit inside it, with the space it leaves around them. */
export interface StickyNoteWrap {
	note: WorkflowNode;
	members: WorkflowNode[];
	margins: { left: number; top: number; right: number; bottom: number };
}

function boxOf(node: WorkflowNode, sizes: NodeSizes): Box | undefined {
	// The layout keys a node without a name by its ID.
	const size = sizes.get(node.name ?? node.id);
	if (!size || !Array.isArray(node.position)) return undefined;
	return { x: node.position[0], y: node.position[1], ...size };
}

function contains(outer: Box, inner: Box): boolean {
	return (
		inner.x >= outer.x &&
		inner.y >= outer.y &&
		inner.x + inner.width <= outer.x + outer.width &&
		inner.y + inner.height <= outer.y + outer.height
	);
}

function wrappingBox(boxes: Box[]): Box {
	const minX = Math.min(...boxes.map((box) => box.x));
	const minY = Math.min(...boxes.map((box) => box.y));
	const maxX = Math.max(...boxes.map((box) => box.x + box.width));
	const maxY = Math.max(...boxes.map((box) => box.y + box.height));
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function boxesOf(nodes: WorkflowNode[], sizes: NodeSizes): Box[] {
	return nodes.flatMap((node) => boxOf(node, sizes) ?? []);
}

function wrapOf(json: WorkflowJSON, note: WorkflowNode, sizes: NodeSizes): StickyNoteWrap[] {
	const noteBox = boxOf(note, sizes);
	if (!noteBox) return [];
	const members = json.nodes.filter((node) => {
		if (isStickyNoteType(node.type)) return false;
		const box = boxOf(node, sizes);
		return box !== undefined && contains(noteBox, box);
	});
	if (members.length === 0) return [];
	const wrapped = wrappingBox(boxesOf(members, sizes));
	const margins = {
		left: wrapped.x - noteBox.x,
		top: wrapped.y - noteBox.y,
		right: noteBox.x + noteBox.width - (wrapped.x + wrapped.width),
		bottom: noteBox.y + noteBox.height - (wrapped.y + wrapped.height),
	};
	return [{ note, members, margins }];
}

/**
 * The sticky notes that wrap other nodes. A JSON workflow does not record which nodes a
 * note belongs to, so a note owns the nodes that sit fully inside it.
 */
export function findStickyNoteWraps(json: WorkflowJSON, sizes: NodeSizes): StickyNoteWrap[] {
	return json.nodes
		.filter((node) => isStickyNoteType(node.type))
		.flatMap((note) => wrapOf(json, note, sizes));
}

/** Moves and resizes each note so that it wraps its nodes again, with the same margins. */
export function rewrapStickyNotes(wraps: StickyNoteWrap[], sizes: NodeSizes): void {
	for (const { note, members, margins } of wraps) {
		const boxes = boxesOf(members, sizes);
		if (boxes.length === 0) continue;
		const wrapped = wrappingBox(boxes);
		note.position = [wrapped.x - margins.left, wrapped.y - margins.top];
		note.parameters = {
			...note.parameters,
			width: wrapped.width + margins.left + margins.right,
			height: wrapped.height + margins.top + margins.bottom,
		};
	}
}
