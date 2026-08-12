import { getComponentDef } from '../kit';
import { DEFAULT_REGION } from './types';
import type { UiNode, UiRegion, UiTree } from './types';

/** Where in the document a node goes: whose child, and in which of its regions. */
export interface UiSlotRef {
	id: string;
	region: string;
}

export function createEmptyDocument(): UiNode {
	return { id: 'page', type: 'page', props: {}, tree: {} };
}

/** The regions a node offers. Empty for a component that takes no children. */
export function regionsOf(node: UiNode): UiRegion[] {
	return getComponentDef(node.type)?.regions ?? [];
}

export function childrenIn(node: UiNode, region: string): UiNode[] {
	return node.tree[region] ?? [];
}

function eachChild(node: UiNode): UiNode[] {
	return Object.values(node.tree).flat();
}

/**
 * Accepts the older shape, where a node's children were one bare array, and
 * returns the region map. Definitions authored before regions existed are
 * common enough (every demo, every saved node) that reading them is cheaper than
 * migrating them.
 */
export function normaliseNode(node: UiNode): UiNode {
	const raw = node.tree as UiTree | UiNode[] | undefined;
	const source: UiTree = Array.isArray(raw) ? { [DEFAULT_REGION]: raw } : (raw ?? {});

	// A fresh map rather than the caller's: the spread below is shallow, so
	// writing into `source` would rewrite the arrays of whatever was passed in,
	// which is not what a function returning a new node should do.
	const tree: UiTree = {};
	for (const [region, children] of Object.entries(source)) {
		tree[region] = children.map(normaliseNode);
	}

	return { ...node, tree };
}

function collectIds(node: UiNode, into: Set<string>): void {
	into.add(node.id);
	for (const child of eachChild(node)) collectIds(child, into);
}

/** `button-1`, `button-2`, … unique within the document. */
export function createNode(type: string, root: UiNode): UiNode {
	const taken = new Set<string>();
	collectIds(root, taken);

	let n = 1;
	while (taken.has(`${type}-${n}`)) n++;

	const props: Record<string, unknown> = {};
	for (const descriptor of getComponentDef(type)?.props ?? []) {
		// Copied, not referenced: an action prop defaults to a list, and every node
		// of that type would otherwise share the one the descriptor holds.
		props[descriptor.name] =
			typeof descriptor.default === 'object' && descriptor.default !== null
				? structuredClone(descriptor.default)
				: descriptor.default;
	}

	return { id: `${type}-${n}`, type, props, tree: {} };
}

export function findNode(root: UiNode, id: string): UiNode | undefined {
	if (root.id === id) return root;

	for (const child of eachChild(root)) {
		const found = findNode(child, id);
		if (found) return found;
	}

	return undefined;
}

/**
 * The chain of ancestors from the root down to (not including) the node with
 * `id`, or undefined if the document does not hold it. The root's own
 * ancestor chain is empty, not undefined: it is in the document, it just has
 * none.
 */
export function ancestorsOf(root: UiNode, id: string): UiNode[] | undefined {
	if (root.id === id) return [];

	for (const child of eachChild(root)) {
		const found = ancestorsOf(child, id);
		if (found) return [root, ...found];
	}

	return undefined;
}

/** Where a node sits: its parent, the region holding it, and its index there. */
export interface UiPlacement {
	parent: UiNode;
	region: string;
	index: number;
}

export function findPlacement(root: UiNode, id: string): UiPlacement | undefined {
	// Every region's own children first, then downwards. Ids are unique, so this
	// only decides how long the search takes, but the shallow pass is the cheap
	// one and doing it first is what the function reads as doing.
	for (const [region, children] of Object.entries(root.tree)) {
		const index = children.findIndex((child) => child.id === id);
		if (index !== -1) return { parent: root, region, index };
	}

	for (const child of eachChild(root)) {
		const found = findPlacement(child, id);
		if (found) return found;
	}

	return undefined;
}

function push(parent: UiNode, region: string, node: UiNode): void {
	parent.tree[region] = [...childrenIn(parent, region), node];
}

/** Where a node goes when there is nothing to place it relative to. */
function fallbackRegion(root: UiNode): string {
	return regionsOf(root)[0]?.name ?? DEFAULT_REGION;
}

/**
 * Puts a node into the tree relative to the current selection: into the given
 * region of it when it has one, otherwise straight after it among its siblings.
 * With nothing selected it appends to the root's first region.
 *
 * `target.region` is what makes a component with several drop points editable at
 * all: without it, "add to the selection" has no answer for a component whose
 * children could go in a header or a footer.
 */
export function insertRelativeTo(
	root: UiNode,
	target: UiSlotRef | string | undefined,
	node: UiNode,
): void {
	const ref = typeof target === 'string' ? { id: target, region: '' } : target;
	const selected = ref?.id ? findNode(root, ref.id) : undefined;

	if (!selected) {
		push(root, fallbackRegion(root), node);
		return;
	}

	const regions = regionsOf(selected);

	if (regions.length > 0) {
		const region = regions.some((r) => r.name === ref?.region)
			? (ref?.region as string)
			: regions[0].name;
		push(selected, region, node);
		return;
	}

	const placement = findPlacement(root, selected.id);

	if (!placement) {
		push(root, fallbackRegion(root), node);
		return;
	}

	const siblings = [...childrenIn(placement.parent, placement.region)];
	siblings.splice(placement.index + 1, 0, node);
	placement.parent.tree[placement.region] = siblings;
}

/**
 * Moves a node among the siblings sharing its region. `delta` is a step, so -1
 * is up and 1 is down.
 *
 * A move stops at either end of the region rather than spilling into the next
 * one: the same keypress would otherwise sometimes reorder and sometimes
 * reparent, and the author has no way to tell which they are about to get.
 */
export function moveWithinRegion(root: UiNode, id: string, delta: number): boolean {
	const placement = findPlacement(root, id);
	if (!placement) return false;

	const siblings = [...childrenIn(placement.parent, placement.region)];
	const target = placement.index + delta;
	if (target < 0 || target >= siblings.length) return false;

	const [node] = siblings.splice(placement.index, 1);
	siblings.splice(target, 0, node);
	placement.parent.tree[placement.region] = siblings;
	return true;
}

/** Removes a node, and everything under it. The root cannot be removed. */
export function removeNode(root: UiNode, id: string): boolean {
	const placement = findPlacement(root, id);
	if (!placement) return false;

	const siblings = [...childrenIn(placement.parent, placement.region)];
	siblings.splice(placement.index, 1);
	placement.parent.tree[placement.region] = siblings;
	return true;
}
