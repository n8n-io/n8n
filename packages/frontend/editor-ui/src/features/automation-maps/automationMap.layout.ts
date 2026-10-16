import dagre from '@dagrejs/dagre';
import type {
	AutomationMapAnnotations,
	AutomationMapEdge,
	AutomationMapGraph,
	AutomationMapGroup,
} from '@n8n/api-types';

export const WORKFLOW_NODE_SIZE = { width: 300, height: 116 };
export const DATA_TABLE_NODE_SIZE = { width: 240, height: 52 };
export const SERVICE_NODE_SIZE = { width: 128, height: 116 };

const GROUP_PADDING = { top: 92, side: 32, bottom: 32 };
const GROUP_GAP = 96;
const ITEM_GAP = 28;
const RANK_GAP = 96;

export const WORKFLOW_LINK_KINDS = new Set<AutomationMapEdge['kind']>([
	'calls',
	'dispatches',
	'references',
	'errorHandler',
]);

export const DATA_TABLES_GROUP_ID = 'data-tables';
export const SERVICES_GROUP_ID = 'services';

interface Size {
	width: number;
	height: number;
}

interface Placed extends Size {
	id: string;
	x: number;
	y: number;
}

export interface LaidOutGroup {
	id: string;
	name: string;
	description: string;
	kind: 'workflows' | 'dataTables' | 'services';
	colorVariant: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface AutomationMapLayout {
	groups: LaidOutGroup[];
	positions: Map<string, { x: number; y: number }>;
}

interface Block extends Size {
	items: Placed[];
}

function shelfPack(blocks: Block[], maxWidth: number, gap: number) {
	const placed: Placed[] = [];
	let cursorX = 0;
	let cursorY = 0;
	let rowHeight = 0;
	let width = 0;
	for (const block of blocks) {
		if (cursorX > 0 && cursorX + block.width > maxWidth) {
			cursorX = 0;
			cursorY += rowHeight + gap;
			rowHeight = 0;
		}
		for (const item of block.items) {
			placed.push({ ...item, x: item.x + cursorX, y: item.y + cursorY });
		}
		cursorX += block.width + gap;
		rowHeight = Math.max(rowHeight, block.height);
		width = Math.max(width, cursorX - gap);
	}
	return { placed, width, height: cursorY + rowHeight };
}

function gridBlock(ids: string[], size: Size, columns: number): Block {
	const items = ids.map((id, index) => ({
		id,
		...size,
		x: (index % columns) * (size.width + ITEM_GAP),
		y: Math.floor(index / columns) * (size.height + ITEM_GAP),
	}));
	const usedColumns = Math.min(columns, ids.length);
	const rows = Math.ceil(ids.length / columns);
	return {
		items,
		width: usedColumns * size.width + (usedColumns - 1) * ITEM_GAP,
		height: rows * size.height + (rows - 1) * ITEM_GAP,
	};
}

function connectedComponents(ids: string[], links: Array<[string, string]>) {
	const parent = new Map(ids.map((id) => [id, id]));
	const find = (id: string): string => {
		const next = parent.get(id) ?? id;
		if (next === id) return id;
		const root = find(next);
		parent.set(id, root);
		return root;
	};
	for (const [a, b] of links) parent.set(find(a), find(b));
	const components = new Map<string, string[]>();
	for (const id of ids) {
		const root = find(id);
		components.set(root, [...(components.get(root) ?? []), id]);
	}
	return [...components.values()];
}

function dagreBlock(ids: string[], links: Array<[string, string]>): Block {
	const graph = new dagre.graphlib.Graph();
	graph.setGraph({ rankdir: 'LR', nodesep: ITEM_GAP, ranksep: RANK_GAP, marginx: 0, marginy: 0 });
	graph.setDefaultEdgeLabel(() => ({}));
	for (const id of ids) graph.setNode(id, { ...WORKFLOW_NODE_SIZE });
	for (const [source, target] of links) graph.setEdge(source, target);
	dagre.layout(graph);
	const items = ids.map((id) => {
		const node = graph.node(id);
		return {
			id,
			...WORKFLOW_NODE_SIZE,
			x: node.x - WORKFLOW_NODE_SIZE.width / 2,
			y: node.y - WORKFLOW_NODE_SIZE.height / 2,
		};
	});
	const minX = Math.min(...items.map((item) => item.x));
	const minY = Math.min(...items.map((item) => item.y));
	const normalized = items.map((item) => ({ ...item, x: item.x - minX, y: item.y - minY }));
	return {
		items: normalized,
		width: Math.max(...normalized.map((item) => item.x + item.width)),
		height: Math.max(...normalized.map((item) => item.y + item.height)),
	};
}

function layoutWorkflowGroup(workflowIds: string[], edges: AutomationMapEdge[]): Block {
	const members = new Set(workflowIds);
	const links = edges
		.filter((edge) => WORKFLOW_LINK_KINDS.has(edge.kind))
		.map((edge): [string, string] => [edge.source, edge.target])
		.filter(([source, target]) => members.has(source) && members.has(target));
	const components = connectedComponents(workflowIds, links);
	const connected = components
		.filter((component) => component.length > 1)
		.sort((a, b) => b.length - a.length)
		.map((component) =>
			dagreBlock(
				component,
				links.filter(([source]) => component.includes(source)),
			),
		);
	const singles = components.filter((component) => component.length === 1).flat();
	const widest = Math.max(0, ...connected.map((block) => block.width));
	const singleColumns = Math.max(1, Math.min(3, Math.round(Math.sqrt(singles.length))));
	const blocks = [...connected];
	if (singles.length > 0) blocks.push(gridBlock(singles, WORKFLOW_NODE_SIZE, singleColumns));
	const maxWidth = Math.max(widest, singleColumns * (WORKFLOW_NODE_SIZE.width + ITEM_GAP));
	const packed = shelfPack(blocks, maxWidth, ITEM_GAP * 2);
	return { items: packed.placed, width: packed.width, height: packed.height };
}

function withFrame(block: Block, minWidth: number): Block {
	const width = Math.max(block.width, minWidth) + GROUP_PADDING.side * 2;
	return {
		width,
		height: block.height + GROUP_PADDING.top + GROUP_PADDING.bottom,
		items: block.items.map((item) => ({
			...item,
			x: item.x + GROUP_PADDING.side,
			y: item.y + GROUP_PADDING.top,
		})),
	};
}

export function layoutAutomationMap(
	graph: AutomationMapGraph,
	annotations: AutomationMapAnnotations | null,
	labels: { dataTables: string; services: string },
): AutomationMapLayout {
	const workflowGroups: AutomationMapGroup[] = annotations?.groups.length
		? annotations.groups
		: [{ id: 'all', name: '', description: '', workflowIds: graph.workflows.map((w) => w.id) }];

	const frames: Array<{ group: Omit<LaidOutGroup, 'x' | 'y' | 'width' | 'height'>; block: Block }> =
		[];

	workflowGroups.forEach((group, index) => {
		const ids = group.workflowIds.map((id) => `wf:${id}`);
		if (ids.length === 0) return;
		frames.push({
			group: {
				id: `group:${group.id}`,
				name: group.name,
				description: group.description,
				kind: 'workflows',
				colorVariant: (index % 6) + 2,
			},
			block: withFrame(layoutWorkflowGroup(ids, graph.edges), 260),
		});
	});

	if (graph.dataTables.length > 0) {
		frames.push({
			group: {
				id: `group:${DATA_TABLES_GROUP_ID}`,
				name: labels.dataTables,
				description: '',
				kind: 'dataTables',
				colorVariant: 7,
			},
			block: withFrame(
				gridBlock(
					graph.dataTables.map((table) => `dt:${table.id}`),
					DATA_TABLE_NODE_SIZE,
					graph.dataTables.length > 6 ? 2 : 1,
				),
				260,
			),
		});
	}

	if (graph.services.length > 0) {
		frames.push({
			group: {
				id: `group:${SERVICES_GROUP_ID}`,
				name: labels.services,
				description: '',
				kind: 'services',
				colorVariant: 7,
			},
			block: withFrame(
				gridBlock(
					graph.services.map((service) => `svc:${service.key}`),
					SERVICE_NODE_SIZE,
					Math.min(4, Math.max(2, Math.ceil(Math.sqrt(graph.services.length)))),
				),
				260,
			),
		});
	}

	const totalArea = frames.reduce((sum, frame) => sum + frame.block.width * frame.block.height, 0);
	const widestFrame = Math.max(0, ...frames.map((frame) => frame.block.width));
	const targetWidth = Math.max(widestFrame, Math.sqrt(totalArea * 2.2));

	const packed = shelfPack(
		frames.map((frame) => ({
			width: frame.block.width,
			height: frame.block.height,
			items: [
				{ id: frame.group.id, x: 0, y: 0, width: frame.block.width, height: frame.block.height },
			],
		})),
		targetWidth,
		GROUP_GAP,
	);

	const positions = new Map<string, { x: number; y: number }>();
	const groups: LaidOutGroup[] = frames.map((frame) => {
		const origin = packed.placed.find((item) => item.id === frame.group.id) ?? {
			x: 0,
			y: 0,
		};
		for (const item of frame.block.items) {
			positions.set(item.id, { x: origin.x + item.x, y: origin.y + item.y });
		}
		return {
			...frame.group,
			x: origin.x,
			y: origin.y,
			width: frame.block.width,
			height: frame.block.height,
		};
	});

	return { groups, positions };
}
