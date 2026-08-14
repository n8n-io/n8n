import { Comment, Fragment, Text, type VNode } from 'vue';
import type { WorkflowUiConnection } from '../workflowPayload';

export const flowLayoutIntents = ['auto', 'sequence', 'branch', 'hub', 'parallel'] as const;
export type FlowLayoutIntent = (typeof flowLayoutIntents)[number];

export type FlowNodeInput = {
	key: string;
	nodeIds: string[];
	label: string | null;
};

export type FlowConnectionInput = {
	fromNodeId: string;
	toNodeId: string;
	type?: string | null;
	outputIndex?: number | null;
	inputIndex?: number | null;
	label?: string | null;
};

export type FlowPlacement = {
	key: string;
	column: number;
	row: number;
};

export type FlowLayoutResult = {
	placements: FlowPlacement[];
	columns: number;
	rows: number;
	intent: FlowLayoutIntent;
};

export type FlowTuple = {
	fromKey: string;
	toKey: string;
	connection: WorkflowUiConnection;
	label: string | null;
};

export type FlowEdge = {
	fromKey: string;
	toKey: string;
	label: string | null;
	tuples: FlowTuple[];
};

export type FlowConnectionListItem = {
	fromKey: string;
	toKey: string;
	fromLabel: string;
	toLabel: string;
	label: string | null;
};

export type FlowModel = {
	layout: FlowLayoutResult;
	tuples: FlowTuple[];
	edges: FlowEdge[];
	connectionList: FlowConnectionListItem[];
};

export type FlowViewport = {
	scale: number;
	narrow: boolean;
};

export const flowNarrowWidth = 480;
export const flowMinScale = 0.6;

type PlainEdge = { fromKey: string; toKey: string };

export function resolveFlowViewport(input: {
	availableWidth: number;
	contentWidth: number;
}): FlowViewport {
	const { availableWidth, contentWidth } = input;

	if (availableWidth <= 0) return { scale: 1, narrow: false };
	if (availableWidth < flowNarrowWidth) return { scale: 1, narrow: true };
	if (contentWidth <= 0 || contentWidth <= availableWidth) return { scale: 1, narrow: false };

	const scale = availableWidth / contentWidth;
	if (scale < flowMinScale) return { scale: 1, narrow: true };
	return { scale, narrow: false };
}

function isBlankText(node: VNode): boolean {
	return node.type === Text && typeof node.children === 'string' && node.children.trim() === '';
}

export function flattenFlowSlot(nodes: VNode[] | undefined): VNode[] {
	if (!nodes) return [];

	return nodes.flatMap((node) => {
		if (node.type === Comment) return [];
		if (isBlankText(node)) return [];
		if (node.type === Fragment && Array.isArray(node.children)) {
			return flattenFlowSlot(node.children as VNode[]);
		}
		return [node];
	});
}

function dedupeEdges(keys: string[], edges: PlainEdge[]): PlainEdge[] {
	const known = new Set(keys);
	const seen = new Set<string>();
	const result: PlainEdge[] = [];

	for (const edge of edges) {
		if (!known.has(edge.fromKey) || !known.has(edge.toKey) || edge.fromKey === edge.toKey) {
			continue;
		}
		const id = `${edge.fromKey}\u0000${edge.toKey}`;
		if (seen.has(id)) continue;
		seen.add(id);
		result.push(edge);
	}

	return result;
}

function orderIndex(keys: string[]): Map<string, number> {
	return new Map(keys.map((key, index) => [key, index]));
}

function placeByColumn(
	keys: string[],
	columnByKey: Map<string, number>,
	order: Map<string, number>,
): FlowPlacement[] {
	const byColumn = new Map<number, string[]>();
	for (const key of keys) {
		const column = columnByKey.get(key) ?? 0;
		const bucket = byColumn.get(column);
		if (bucket) bucket.push(key);
		else byColumn.set(column, [key]);
	}

	const rowByKey = new Map<string, number>();
	for (const bucket of byColumn.values()) {
		bucket.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
		bucket.forEach((key, row) => rowByKey.set(key, row));
	}

	return keys.map((key) => ({
		key,
		column: columnByKey.get(key) ?? 0,
		row: rowByKey.get(key) ?? 0,
	}));
}

function longestPathColumns(keys: string[], edges: PlainEdge[]): Map<string, number> {
	const order = orderIndex(keys);
	const adjacency = new Map<string, string[]>(keys.map((key) => [key, []]));
	const indegree = new Map<string, number>(keys.map((key) => [key, 0]));

	for (const edge of edges) {
		adjacency.get(edge.fromKey)?.push(edge.toKey);
		indegree.set(edge.toKey, (indegree.get(edge.toKey) ?? 0) + 1);
	}

	const column = new Map<string, number>(keys.map((key) => [key, 0]));
	const remaining = new Map(indegree);
	const processed = new Set<string>();
	let frontier = keys.filter((key) => remaining.get(key) === 0);

	while (frontier.length > 0) {
		frontier.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
		const next: string[] = [];
		for (const key of frontier) {
			if (processed.has(key)) continue;
			processed.add(key);
			for (const target of adjacency.get(key) ?? []) {
				column.set(target, Math.max(column.get(target) ?? 0, (column.get(key) ?? 0) + 1));
				remaining.set(target, (remaining.get(target) ?? 0) - 1);
				if (remaining.get(target) === 0) next.push(target);
			}
		}
		frontier = next;
	}

	let maxColumn = keys.reduce((max, key) => Math.max(max, column.get(key) ?? 0), 0);
	for (const key of keys) {
		if (!processed.has(key)) {
			maxColumn += 1;
			column.set(key, maxColumn);
		}
	}

	return column;
}

function layeredLayout(keys: string[], edges: PlainEdge[]): FlowPlacement[] {
	return placeByColumn(keys, longestPathColumns(keys, edges), orderIndex(keys));
}

function sequenceLayout(keys: string[]): FlowPlacement[] {
	return keys.map((key, column) => ({ key, column, row: 0 }));
}

function connectedComponents(keys: string[], edges: PlainEdge[]): string[][] {
	const parent = new Map<string, string>(keys.map((key) => [key, key]));

	const find = (key: string): string => {
		let root = key;
		while (parent.get(root) !== root) root = parent.get(root) as string;
		let cursor = key;
		while (parent.get(cursor) !== root) {
			const nextCursor = parent.get(cursor) as string;
			parent.set(cursor, root);
			cursor = nextCursor;
		}
		return root;
	};

	const union = (a: string, b: string) => {
		const rootA = find(a);
		const rootB = find(b);
		if (rootA !== rootB) parent.set(rootA, rootB);
	};

	for (const edge of edges) union(edge.fromKey, edge.toKey);

	const groups = new Map<string, string[]>();
	for (const key of keys) {
		const root = find(key);
		const bucket = groups.get(root);
		if (bucket) bucket.push(key);
		else groups.set(root, [key]);
	}

	const order = orderIndex(keys);
	return [...groups.values()].sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0));
}

function parallelLayout(keys: string[], edges: PlainEdge[]): FlowPlacement[] {
	const order = orderIndex(keys);
	const columnByKey = longestPathColumns(keys, edges);
	const rowByKey = new Map<string, number>();
	const columnByKeyLinear = new Map<string, number>();

	connectedComponents(keys, edges).forEach((component, row) => {
		component
			.slice()
			.sort(
				(a, b) =>
					(columnByKey.get(a) ?? 0) - (columnByKey.get(b) ?? 0) ||
					(order.get(a) ?? 0) - (order.get(b) ?? 0),
			)
			.forEach((key, column) => {
				rowByKey.set(key, row);
				columnByKeyLinear.set(key, column);
			});
	});

	return keys.map((key) => ({
		key,
		column: columnByKeyLinear.get(key) ?? 0,
		row: rowByKey.get(key) ?? 0,
	}));
}

function hubLayout(keys: string[], edges: PlainEdge[]): FlowPlacement[] {
	const order = orderIndex(keys);
	const degree = new Map<string, number>(keys.map((key) => [key, 0]));
	for (const edge of edges) {
		degree.set(edge.fromKey, (degree.get(edge.fromKey) ?? 0) + 1);
		degree.set(edge.toKey, (degree.get(edge.toKey) ?? 0) + 1);
	}

	const hub = keys.reduce((best, key) => {
		const bestDegree = degree.get(best) ?? 0;
		const keyDegree = degree.get(key) ?? 0;
		if (keyDegree > bestDegree) return key;
		return best;
	}, keys[0]);

	const spokes = keys.filter((key) => key !== hub);
	spokes.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

	const placements: FlowPlacement[] = [{ key: hub, column: 0, row: 0 }];
	spokes.forEach((key, index) => placements.push({ key, column: 1, row: index }));

	return keys.map((key) => placements.find((placement) => placement.key === key) as FlowPlacement);
}

export function computeFlowLayout(
	keys: string[],
	edges: PlainEdge[],
	intent: FlowLayoutIntent = 'auto',
): FlowLayoutResult {
	if (keys.length === 0) {
		return { placements: [], columns: 0, rows: 0, intent };
	}

	const cleaned = dedupeEdges(keys, edges);
	let placements: FlowPlacement[];

	switch (intent) {
		case 'sequence':
			placements = sequenceLayout(keys);
			break;
		case 'parallel':
			placements = parallelLayout(keys, cleaned);
			break;
		case 'hub':
			placements = hubLayout(keys, cleaned);
			break;
		default:
			placements = layeredLayout(keys, cleaned);
			break;
	}

	const columns = placements.reduce((max, placement) => Math.max(max, placement.column), 0) + 1;
	const rows = placements.reduce((max, placement) => Math.max(max, placement.row), 0) + 1;

	return { placements, columns, rows, intent };
}

function matchesTuple(tuple: FlowTuple, entry: FlowConnectionInput): boolean {
	const { connection } = tuple;
	if (connection.sourceNodeId !== entry.fromNodeId) return false;
	if (connection.targetNodeId !== entry.toNodeId) return false;
	if (entry.type !== undefined && entry.type !== null && connection.type !== entry.type) {
		return false;
	}
	if (
		entry.outputIndex !== undefined &&
		entry.outputIndex !== null &&
		connection.outputIndex !== entry.outputIndex
	) {
		return false;
	}
	if (
		entry.inputIndex !== undefined &&
		entry.inputIndex !== null &&
		connection.inputIndex !== entry.inputIndex
	) {
		return false;
	}
	return true;
}

export function buildFlowModel(
	nodes: FlowNodeInput[],
	connections: WorkflowUiConnection[],
	explicit: FlowConnectionInput[],
	intent: FlowLayoutIntent = 'auto',
): FlowModel {
	const keys = nodes.map((node) => node.key);
	const labelByKey = new Map(nodes.map((node) => [node.key, node.label]));
	const keyByNodeId = new Map<string, string>();
	for (const node of nodes) {
		for (const id of node.nodeIds) {
			if (!keyByNodeId.has(id)) keyByNodeId.set(id, node.key);
		}
	}

	const tuples: FlowTuple[] = [];
	for (const connection of connections) {
		const fromKey = keyByNodeId.get(connection.sourceNodeId);
		const toKey = keyByNodeId.get(connection.targetNodeId);
		if (!fromKey || !toKey || fromKey === toKey) continue;
		tuples.push({ fromKey, toKey, connection, label: null });
	}

	for (const entry of explicit) {
		const label = typeof entry.label === 'string' ? entry.label.trim() : '';
		const match = tuples.find((tuple) => matchesTuple(tuple, entry));
		if (!match) continue;
		if (label.length > 0 && !match.label) match.label = label;
	}

	const edgeById = new Map<string, FlowEdge>();
	const edgeOrder: string[] = [];
	for (const tuple of tuples) {
		const id = `${tuple.fromKey}\u0000${tuple.toKey}`;
		const existing = edgeById.get(id);
		if (existing) {
			existing.tuples.push(tuple);
			continue;
		}
		edgeById.set(id, {
			fromKey: tuple.fromKey,
			toKey: tuple.toKey,
			label: null,
			tuples: [tuple],
		});
		edgeOrder.push(id);
	}

	const edges = edgeOrder.map((id) => edgeById.get(id) as FlowEdge);
	for (const edge of edges) {
		const labels: string[] = [];
		for (const tuple of edge.tuples) {
			if (tuple.label && !labels.includes(tuple.label)) labels.push(tuple.label);
		}
		edge.label = labels.length > 0 ? labels.join(' / ') : null;
	}

	const layout = computeFlowLayout(
		keys,
		edges.map((edge) => ({ fromKey: edge.fromKey, toKey: edge.toKey })),
		intent,
	);

	const placementByKey = new Map(layout.placements.map((placement) => [placement.key, placement]));
	const resolveLabel = (key: string) => {
		const label = labelByKey.get(key);
		return label && label.length > 0 ? label : key;
	};

	const connectionList = edges
		.slice()
		.sort((a, b) => {
			const fromA = placementByKey.get(a.fromKey);
			const fromB = placementByKey.get(b.fromKey);
			const toA = placementByKey.get(a.toKey);
			const toB = placementByKey.get(b.toKey);
			return (
				(fromA?.column ?? 0) - (fromB?.column ?? 0) ||
				(fromA?.row ?? 0) - (fromB?.row ?? 0) ||
				(toA?.column ?? 0) - (toB?.column ?? 0) ||
				(toA?.row ?? 0) - (toB?.row ?? 0)
			);
		})
		.map((edge) => ({
			fromKey: edge.fromKey,
			toKey: edge.toKey,
			fromLabel: resolveLabel(edge.fromKey),
			toLabel: resolveLabel(edge.toKey),
			label: edge.label,
		}));

	return { layout, tuples, edges, connectionList };
}
