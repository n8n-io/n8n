<script lang="ts" setup>
import { computed } from 'vue';
import type { WorkflowGraph, WorkflowGraphNode, WorkflowGraphEdge } from '../stores/workflow.store';
import { LUCIDE_PATHS } from './lucide-paths';

interface TriggerDef {
	type: string;
	config?: { path?: string; method?: string };
}

const props = defineProps<{
	graph: WorkflowGraph | null;
	triggers?: TriggerDef[];
	selectedNodeId?: string | null;
}>();

const emit = defineEmits<{
	'node-click': [nodeId: string];
}>();

// Layout configuration
const NODE_WIDTH = 200;
const NODE_HEIGHT = 58;
const NODE_HEIGHT_WITH_DESC = 74;
const LEVEL_GAP_Y = 80;
const NODE_GAP_X = 40;
const PADDING = 60;

interface DisplayConfig {
	icon?: string;
	color?: string;
	description?: string;
}

function getDisplayConfig(node: LayoutNode): DisplayConfig | undefined {
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

function hasAnyDescription(nodes: WorkflowGraphNode[]): boolean {
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

function nodeHeight(hasDesc: boolean): number {
	return hasDesc ? NODE_HEIGHT_WITH_DESC : NODE_HEIGHT;
}

interface LayoutNode {
	id: string;
	name: string;
	type: string;
	x: number;
	y: number;
	level: number;
	isWebhook?: boolean;
	webhookMethod?: string;
	webhookPath?: string;
	config?: Record<string, unknown>;
}

interface LayoutEdge {
	from: LayoutNode;
	to: LayoutNode;
	label?: string;
	condition?: string;
}

/**
 * Format a raw condition expression (e.g. `output.amount > 100`) into
 * a human-readable label for the canvas edge.
 */
function formatCondition(raw: string): string {
	let text = raw.trim();
	// Strip leading `output.` prefix for brevity
	text = text.replace(/\boutput\./g, '');

	// Translate negated comparisons into their natural form
	// e.g. `!(amount > 100)` → `amount <= 100`
	const negatedMatch = text.match(/^!\s*\((.+)\)$/);
	if (negatedMatch) {
		const inner = negatedMatch[1].trim();
		const opMap: Record<string, string> = {
			'>': '\u2264', // ≤
			'<': '\u2265', // ≥
			'>=': '<',
			'<=': '>',
			'===': '\u2260', // ≠
			'!==': '===',
			'==': '\u2260',
			'!=': '==',
		};
		for (const [op, replacement] of Object.entries(opMap)) {
			if (inner.includes(` ${op} `)) {
				return inner.replace(` ${op} `, ` ${replacement} `);
			}
		}
		// Fallback — just show NOT prefix
		return `NOT ${inner}`;
	}

	// Simple negation: `!foo` → `NOT foo`
	if (text.startsWith('!')) {
		return `NOT ${text.slice(1).trim()}`;
	}

	return text;
}

const layout = computed(() => {
	if (!props.graph || !props.graph.nodes.length) {
		return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[], width: 0, height: 0 };
	}

	const { nodes: allNodes, edges: allEdges } = props.graph;

	// Identify trigger node IDs so we can filter them out
	const triggerNodeIds = new Set(allNodes.filter((n) => n.type === 'trigger').map((n) => n.id));

	// Filter out trigger nodes — they are implicit
	const visibleNodes = allNodes.filter((n) => n.type !== 'trigger');

	// Remap edges: drop edges between triggers, and for edges originating
	// from a trigger node, simply remove them (the successors become roots)
	const visibleEdges = allEdges.filter(
		(e) => !triggerNodeIds.has(e.from) && !triggerNodeIds.has(e.to),
	);

	// Check if there are webhook triggers to display
	const webhookTriggers = (props.triggers ?? []).filter((t) => t.type === 'webhook');

	// Build the list of nodes to lay out — webhook triggers come first
	const webhookNodes: WorkflowGraphNode[] = webhookTriggers.map((wh, idx) => ({
		id: `__webhook_${idx}`,
		name: `${(wh.config?.method ?? 'POST').toUpperCase()} ${wh.config?.path ?? '/'}`,
		type: 'webhook' as WorkflowGraphNode['type'],
		stepFunctionRef: '',
		config: {},
	}));

	const nodesToLayout = [...webhookNodes, ...visibleNodes];

	// Build edges — webhook nodes connect to root visible nodes
	// (nodes that had no incoming edges from other visible nodes)
	const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
	const hasIncomingFromVisible = new Set(
		visibleEdges.filter((e) => visibleNodeIds.has(e.from)).map((e) => e.to),
	);
	const rootVisibleIds = visibleNodes
		.filter((n) => !hasIncomingFromVisible.has(n.id))
		.map((n) => n.id);

	const webhookEdges: WorkflowGraphEdge[] = [];
	for (const whNode of webhookNodes) {
		for (const rootId of rootVisibleIds) {
			webhookEdges.push({ from: whNode.id, to: rootId });
		}
	}

	const edgesToLayout = [...webhookEdges, ...visibleEdges];

	// Build adjacency map
	const children = new Map<string, string[]>();
	const parents = new Map<string, string[]>();
	for (const node of nodesToLayout) {
		children.set(node.id, []);
		parents.set(node.id, []);
	}
	for (const edge of edgesToLayout) {
		children.get(edge.from)?.push(edge.to);
		parents.get(edge.to)?.push(edge.from);
	}

	// Assign levels via BFS from root nodes (no parents)
	const levels = new Map<string, number>();
	const roots = nodesToLayout.filter((n) => !parents.get(n.id)?.length);
	if (roots.length === 0 && nodesToLayout.length > 0) {
		roots.push(nodesToLayout[0]);
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
	for (const node of nodesToLayout) {
		if (!levels.has(node.id)) {
			levels.set(node.id, 0);
		}
	}

	// Group nodes by level
	const levelGroups = new Map<number, WorkflowGraphNode[]>();
	for (const node of nodesToLayout) {
		const level = levels.get(node.id) ?? 0;
		if (!levelGroups.has(level)) levelGroups.set(level, []);
		levelGroups.get(level)!.push(node);
	}

	const maxLevel = Math.max(...levels.values());
	const maxNodesInLevel = Math.max(...Array.from(levelGroups.values()).map((g) => g.length));

	// Position nodes
	const layoutNodes = new Map<string, LayoutNode>();
	const webhookNodeIdSet = new Set(webhookNodes.map((n) => n.id));
	const anyDesc = hasAnyDescription(nodesToLayout);
	const effectiveHeight = nodeHeight(anyDesc);

	for (let level = 0; level <= maxLevel; level++) {
		const group = levelGroups.get(level) ?? [];
		const totalWidth = group.length * NODE_WIDTH + (group.length - 1) * NODE_GAP_X;
		const startX =
			PADDING + (maxNodesInLevel * (NODE_WIDTH + NODE_GAP_X) - NODE_GAP_X - totalWidth) / 2;

		for (let i = 0; i < group.length; i++) {
			const node = group[i];
			const isWebhook = webhookNodeIdSet.has(node.id);
			const whTrigger = isWebhook
				? webhookTriggers[webhookNodes.findIndex((w) => w.id === node.id)]
				: undefined;

			layoutNodes.set(node.id, {
				id: node.id,
				name: node.name,
				type: isWebhook ? 'webhook' : node.type,
				x: startX + i * (NODE_WIDTH + NODE_GAP_X),
				y: PADDING + level * (effectiveHeight + LEVEL_GAP_Y),
				level,
				isWebhook,
				webhookMethod: whTrigger?.config?.method?.toUpperCase(),
				webhookPath: whTrigger?.config?.path,
				config: node.config,
			});
		}
	}

	// Build layout edges — include condition text for conditional edges
	const layoutEdges: LayoutEdge[] = [];
	for (const edge of edgesToLayout) {
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
});

function typeColor(type: string): string {
	const colors: Record<string, string> = {
		trigger: '#ff6d5a',
		webhook: '#f97316',
		step: '#3b82f6',
		condition: '#f5a623',
		approval: '#8b5cf6',
		end: '#6b7280',
	};
	return colors[type] ?? '#6b7280';
}

function edgePath(from: LayoutNode, to: LayoutNode, h: number): string {
	const x1 = from.x + NODE_WIDTH / 2;
	const y1 = from.y + h;
	const x2 = to.x + NODE_WIDTH / 2;
	const y2 = to.y;
	const midY = (y1 + y2) / 2;
	return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function edgeLabelPos(from: LayoutNode, to: LayoutNode, h: number): { x: number; y: number } {
	const x = (from.x + NODE_WIDTH / 2 + to.x + NODE_WIDTH / 2) / 2;
	const y = (from.y + h + to.y) / 2;
	return { x, y };
}

function stripeColor(node: LayoutNode): string {
	const display = getDisplayConfig(node);
	return display?.color ?? typeColor(node.type);
}

function truncateName(name: string, maxLen: number = 18): string {
	return name.length > maxLen ? name.slice(0, maxLen) + '...' : name;
}
</script>

<template>
	<div :class="$style.container">
		<div v-if="!graph || !graph.nodes.length" :class="$style.empty">
			<p :class="$style.emptyTitle">No graph data</p>
			<p :class="$style.emptyHint">Save the workflow to generate the execution graph</p>
		</div>
		<svg
			v-else
			:class="$style.svg"
			:viewBox="`0 0 ${layout.width} ${layout.height}`"
			:width="layout.width"
			:height="layout.height"
		>
			<defs>
				<filter id="nodeShadow" x="-5%" y="-5%" width="110%" height="120%">
					<feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.08" />
				</filter>
				<filter id="nodeShadowHover" x="-5%" y="-5%" width="110%" height="130%">
					<feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.12" />
				</filter>
				<marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
					<polygon points="0 0, 8 3, 0 6" :class="$style.arrowhead" />
				</marker>
			</defs>

			<!-- Edges -->
			<g v-for="(edge, idx) in layout.edges" :key="`edge-${idx}`">
				<path
					:d="edgePath(edge.from, edge.to, layout.effectiveHeight)"
					fill="none"
					:class="$style.edge"
					stroke-width="1.5"
					marker-end="url(#arrowhead)"
				/>
				<!-- Edge label badge -->
				<g v-if="edge.label">
					<rect
						:x="edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).x - 20"
						:y="edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).y - 10"
						width="40"
						height="20"
						rx="10"
						ry="10"
						:class="$style.edgeLabelBg"
					/>
					<text
						:x="edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).x"
						:y="edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).y"
						text-anchor="middle"
						dominant-baseline="central"
						font-size="11"
						font-weight="500"
						:class="$style.edgeLabelText"
						font-family="var(--font-family)"
					>
						{{ edge.label }}
					</text>
				</g>
				<!-- Condition label on conditional edges -->
				<g v-if="edge.condition && !edge.label">
					<rect
						:x="
							edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).x -
							formatCondition(edge.condition).length * 3.5 -
							8
						"
						:y="edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).y - 10"
						:width="formatCondition(edge.condition).length * 7 + 16"
						height="20"
						rx="10"
						ry="10"
						:class="$style.conditionLabelBg"
					/>
					<text
						:x="edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).x"
						:y="edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).y"
						text-anchor="middle"
						dominant-baseline="central"
						font-size="10"
						font-weight="500"
						:class="$style.conditionLabelText"
						font-family="var(--font-family-mono, monospace)"
					>
						{{ formatCondition(edge.condition) }}
					</text>
				</g>
			</g>

			<!-- Nodes -->
			<g
				v-for="node in layout.nodes"
				:key="node.id"
				:class="[
					$style.node,
					node.type !== 'webhook' ? $style.nodeClickable : '',
					props.selectedNodeId === node.id ? $style.nodeSelected : '',
				]"
				@click="node.type !== 'webhook' ? emit('node-click', node.id) : undefined"
			>
				<!-- Node background -->
				<rect
					:x="node.x"
					:y="node.y"
					:width="NODE_WIDTH"
					:height="layout.effectiveHeight"
					rx="8"
					ry="8"
					filter="url(#nodeShadow)"
					:stroke="stripeColor(node)"
					stroke-width="1.5"
					:class="$style.nodeRect"
				/>
				<!-- Icon -->
				<g
					v-if="getDisplayConfig(node)?.icon && LUCIDE_PATHS[getDisplayConfig(node)!.icon!]"
					:transform="`translate(${node.x + 10}, ${getDisplayConfig(node)?.description ? node.y + 13 : node.y + layout.effectiveHeight / 2 - 9}) scale(0.75)`"
				>
					<path
						v-for="(d, pi) in LUCIDE_PATHS[getDisplayConfig(node)!.icon!]"
						:key="pi"
						:d="d"
						fill="none"
						:stroke="getDisplayConfig(node)?.color ?? 'var(--color-text-lighter)'"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</g>
				<!-- Node name -->
				<text
					:x="
						node.x +
						(getDisplayConfig(node)?.icon && LUCIDE_PATHS[getDisplayConfig(node)!.icon!] ? 32 : 14)
					"
					:y="
						getDisplayConfig(node)?.description ? node.y + 24 : node.y + layout.effectiveHeight / 2
					"
					text-anchor="start"
					dominant-baseline="central"
					font-size="13"
					font-weight="500"
					font-family="var(--font-family)"
					:class="$style.nodeText"
				>
					{{ truncateName(node.name) }}
				</text>
				<!-- Description on second line (if present) -->
				<text
					v-if="getDisplayConfig(node)?.description"
					:x="node.x + 14"
					:y="node.y + layout.effectiveHeight - 16"
					text-anchor="start"
					dominant-baseline="central"
					font-size="10"
					font-weight="400"
					font-family="var(--font-family)"
					:class="$style.nodeDescription"
				>
					{{ truncateName(getDisplayConfig(node)!.description!, 30) }}
				</text>
			</g>
		</svg>
	</div>
</template>

<style module>
.container {
	display: flex;
	align-items: flex-start;
	justify-content: center;
	overflow: auto;
	height: 100%;
	min-height: 0;
	background-color: var(--color-bg-light);
	background-image: radial-gradient(circle, var(--color-border) 1px, transparent 1px);
	background-size: 20px 20px;
	border-radius: var(--radius-md);
}

.svg {
	display: block;
}

.edge {
	stroke: var(--color-border);
	transition: stroke 0.2s ease;
}

.edge:hover {
	stroke: var(--color-text-lighter);
}

.edgeLabelBg {
	fill: var(--color-bg);
	stroke: var(--color-border-light);
	stroke-width: 1;
}

.edgeLabelText {
	fill: var(--color-text-lighter);
}

.conditionLabelBg {
	fill: #fef3c7;
	stroke: #f5a623;
	stroke-width: 1;
}

.conditionLabelText {
	fill: #92400e;
}

.arrowhead {
	fill: var(--color-text-lighter);
}

.node {
	cursor: default;
	transition: transform 0.15s ease;
}

.nodeClickable {
	cursor: pointer;
}

.nodeRect {
	fill: var(--color-bg);
	transition:
		filter 0.15s ease,
		stroke-width 0.15s ease;
}

.node:hover .nodeRect {
	filter: url(#nodeShadowHover);
	stroke-width: 2 !important;
}

.nodeSelected .nodeRect {
	stroke-width: 3 !important;
	filter: url(#nodeShadowHover);
	fill: var(--color-primary-tint-2, #fff2f0);
}

.nodeText {
	fill: var(--color-text);
	pointer-events: none;
	user-select: none;
}

.nodeDescription {
	fill: var(--color-text-lighter);
	pointer-events: none;
	user-select: none;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 300px;
	gap: var(--spacing-xs);
}

.emptyTitle {
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
}

.emptyHint {
	font-size: var(--font-size-sm);
	color: var(--color-text-placeholder);
}
</style>
