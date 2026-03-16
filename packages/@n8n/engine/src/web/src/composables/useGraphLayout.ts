import type { WorkflowGraphNode, WorkflowGraphEdge } from '../stores/workflow.store';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 58;
export const NODE_HEIGHT_WITH_DESC = 74;
export const LEVEL_GAP_Y = 80;
export const NODE_GAP_X = 40;
export const PADDING = 60;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface DisplayConfig {
	icon?: string;
	color?: string;
	description?: string;
}

export interface LayoutNode {
	id: string;
	name: string;
	type: string;
	x: number;
	y: number;
	level: number;
	config?: Record<string, unknown>;
}

export interface LayoutEdge {
	from: LayoutNode;
	to: LayoutNode;
	label?: string;
	condition?: string;
}

export interface GraphLayout<N extends LayoutNode = LayoutNode> {
	nodes: N[];
	edges: LayoutEdge[];
	width: number;
	height: number;
	effectiveHeight: number;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function getDisplayConfig(node: LayoutNode): DisplayConfig | undefined {
	const cfg = node.config;
	if (!cfg) return undefined;
	// New format: icon/color/description at top level of config
	if (cfg.icon || cfg.color || cfg.description) {
		return {
			icon: cfg.icon as string,
			color: cfg.color as string,
			description: cfg.description as string,
		};
	}
	// Legacy format: nested under display
	return cfg.display as DisplayConfig | undefined;
}

export function hasAnyDescription(nodes: WorkflowGraphNode[]): boolean {
	return nodes.some((n) => {
		const cfg = n.config;
		if (!cfg) return false;
		// New format
		if (cfg.description) return true;
		// Legacy format
		const display = cfg.display as DisplayConfig | undefined;
		return display?.description;
	});
}

export function nodeHeight(hasDesc: boolean): number {
	return hasDesc ? NODE_HEIGHT_WITH_DESC : NODE_HEIGHT;
}

// ---------------------------------------------------------------------------
// Condition formatting
// ---------------------------------------------------------------------------

/**
 * Format a raw condition expression (e.g. `output.amount > 100`) into
 * a human-readable label for the canvas edge.
 */
export function formatCondition(raw: string): string {
	let text = raw.trim();
	// Strip leading `output.` prefix for brevity
	text = text.replace(/\boutput\./g, '');

	// Translate negated comparisons into their natural form
	// e.g. `!(amount > 100)` -> `amount <= 100`
	const negatedMatch = text.match(/^!\s*\((.+)\)$/);
	if (negatedMatch) {
		const inner = negatedMatch[1].trim();
		const opMap: Record<string, string> = {
			'>': '\u2264', // <=
			'<': '\u2265', // >=
			'>=': '<',
			'<=': '>',
			'===': '\u2260', // !=
			'!==': '===',
			'==': '\u2260',
			'!=': '==',
		};
		for (const [op, replacement] of Object.entries(opMap)) {
			if (inner.includes(` ${op} `)) {
				return inner.replace(` ${op} `, ` ${replacement} `);
			}
		}
		// Fallback -- just show NOT prefix
		return `NOT ${inner}`;
	}

	// Simple negation: `!foo` -> `NOT foo`
	if (text.startsWith('!')) {
		return `NOT ${text.slice(1).trim()}`;
	}

	return text;
}

// ---------------------------------------------------------------------------
// Edge geometry
// ---------------------------------------------------------------------------

export function edgePath(from: LayoutNode, to: LayoutNode, h: number): string {
	const x1 = from.x + NODE_WIDTH / 2;
	const y1 = from.y + h;
	const x2 = to.x + NODE_WIDTH / 2;
	const y2 = to.y;
	const midY = (y1 + y2) / 2;
	return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

export function edgeLabelPos(
	from: LayoutNode,
	to: LayoutNode,
	h: number,
): { x: number; y: number } {
	const x = (from.x + NODE_WIDTH / 2 + to.x + NODE_WIDTH / 2) / 2;
	const y = (from.y + h + to.y) / 2;
	return { x, y };
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export function truncateName(name: string, maxLen: number = 20): string {
	return name.length > maxLen ? name.slice(0, maxLen) + '...' : name;
}

// ---------------------------------------------------------------------------
// BFS layout computation
// ---------------------------------------------------------------------------

/**
 * Compute a layered graph layout using BFS level assignment and horizontal
 * centering within each level.
 *
 * This is the core algorithm shared between GraphCanvas and ExecutionGraph.
 * Both components provide their own pre-processed node/edge lists (e.g. after
 * filtering triggers or adding webhook pseudo-nodes) and an optional
 * `augmentNode` callback to attach extra fields to each LayoutNode.
 */
export function computeGraphLayout<N extends LayoutNode = LayoutNode>(
	nodes: WorkflowGraphNode[],
	edges: WorkflowGraphEdge[],
	augmentNode?: (node: WorkflowGraphNode, base: LayoutNode) => N,
): GraphLayout<N> {
	if (nodes.length === 0) {
		return {
			nodes: [] as unknown as N[],
			edges: [],
			width: 0,
			height: 0,
			effectiveHeight: 0,
		};
	}

	// Build adjacency map
	const children = new Map<string, string[]>();
	const parents = new Map<string, string[]>();
	for (const node of nodes) {
		children.set(node.id, []);
		parents.set(node.id, []);
	}
	for (const edge of edges) {
		children.get(edge.from)?.push(edge.to);
		parents.get(edge.to)?.push(edge.from);
	}

	// Assign levels via BFS from root nodes (no parents)
	const levels = new Map<string, number>();
	const roots = nodes.filter((n) => !parents.get(n.id)?.length);
	if (roots.length === 0 && nodes.length > 0) {
		roots.push(nodes[0]);
	}

	const queue: Array<{ id: string; level: number }> = roots.map((r) => ({
		id: r.id,
		level: 0,
	}));
	const visited = new Set<string>();

	while (queue.length > 0) {
		const item = queue.shift();
		if (!item) break;
		const { id, level } = item;

		if (visited.has(id)) {
			// Update level if deeper
			const current = levels.get(id) ?? 0;
			if (level > current) levels.set(id, level);
			continue;
		}

		visited.add(id);
		levels.set(id, level);

		for (const childId of children.get(id) ?? []) {
			queue.push({ id: childId, level: level + 1 });
		}
	}

	// Handle unvisited nodes
	for (const node of nodes) {
		if (!levels.has(node.id)) {
			levels.set(node.id, 0);
		}
	}

	// Group nodes by level
	const levelGroups = new Map<number, WorkflowGraphNode[]>();
	for (const node of nodes) {
		const level = levels.get(node.id) ?? 0;
		if (!levelGroups.has(level)) levelGroups.set(level, []);
		levelGroups.get(level)!.push(node);
	}

	const maxLevel = Math.max(...levels.values(), 0);
	const maxNodesInLevel = Math.max(...Array.from(levelGroups.values()).map((g) => g.length), 1);

	// Position nodes
	const layoutNodes = new Map<string, N>();
	const anyDesc = hasAnyDescription(nodes);
	const effectiveHeight = nodeHeight(anyDesc);

	for (let level = 0; level <= maxLevel; level++) {
		const group = levelGroups.get(level) ?? [];
		const totalWidth = group.length * NODE_WIDTH + (group.length - 1) * NODE_GAP_X;
		const startX =
			PADDING + (maxNodesInLevel * (NODE_WIDTH + NODE_GAP_X) - NODE_GAP_X - totalWidth) / 2;

		for (let i = 0; i < group.length; i++) {
			const node = group[i];
			const base: LayoutNode = {
				id: node.id,
				name: node.name,
				type: node.type,
				x: startX + i * (NODE_WIDTH + NODE_GAP_X),
				y: PADDING + level * (effectiveHeight + LEVEL_GAP_Y),
				level,
				config: node.config,
			};

			const layoutNode = augmentNode ? augmentNode(node, base) : (base as N);
			layoutNodes.set(node.id, layoutNode);
		}
	}

	// Build layout edges -- include condition text for conditional edges
	const layoutEdges: LayoutEdge[] = [];
	for (const edge of edges) {
		const fromNode = layoutNodes.get(edge.from);
		const toNode = layoutNodes.get(edge.to);
		if (fromNode && toNode) {
			layoutEdges.push({
				from: fromNode,
				to: toNode,
				label: edge.label,
				condition: edge.condition,
			});
		}
	}

	const width = maxNodesInLevel * (NODE_WIDTH + NODE_GAP_X) - NODE_GAP_X + PADDING * 2;
	const height = (maxLevel + 1) * (effectiveHeight + LEVEL_GAP_Y) - LEVEL_GAP_Y + PADDING * 2;

	return {
		nodes: Array.from(layoutNodes.values()),
		edges: layoutEdges,
		width: Math.max(width, 300),
		height: Math.max(height, 200),
		effectiveHeight,
	};
}
