<script lang="ts" setup>
import { computed } from 'vue';
import type { WorkflowGraph, WorkflowGraphNode } from '../stores/workflow.store';
import type { StepExecution } from '../stores/execution.store';
import { LUCIDE_PATHS } from './lucide-paths';
import {
	getSleepLabel as _getSleepLabel,
	getSleepDetail as _getSleepDetail,
	SLEEP_NODE_COLOR,
} from '../utils/sleep-node';

const props = defineProps<{
	graph: WorkflowGraph;
	steps: StepExecution[];
	selectedStepId: string | null;
}>();

const emit = defineEmits<{
	'select-step': [stepId: string];
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
	config?: Record<string, unknown>;
}

interface LayoutEdge {
	from: LayoutNode;
	to: LayoutNode;
	label?: string;
	condition?: string;
}

/**
 * Format a raw condition expression into a human-readable label.
 */
function formatCondition(raw: string): string {
	let text = raw.trim();
	text = text.replace(/\boutput\./g, '');

	const negatedMatch = text.match(/^!\s*\((.+)\)$/);
	if (negatedMatch) {
		const inner = negatedMatch[1].trim();
		const opMap: Record<string, string> = {
			'>': '\u2264',
			'<': '\u2265',
			'>=': '<',
			'<=': '>',
			'===': '\u2260',
			'!==': '===',
			'==': '\u2260',
			'!=': '==',
		};
		for (const [op, replacement] of Object.entries(opMap)) {
			if (inner.includes(` ${op} `)) {
				return inner.replace(` ${op} `, ` ${replacement} `);
			}
		}
		return `NOT ${inner}`;
	}

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

	// Filter out trigger nodes — they are implicit
	const triggerNodeIds = new Set(allNodes.filter((n) => n.type === 'trigger').map((n) => n.id));
	const visibleNodes = allNodes.filter((n) => n.type !== 'trigger');

	// Remove edges that involve trigger nodes
	const visibleEdges = allEdges.filter(
		(e) => !triggerNodeIds.has(e.from) && !triggerNodeIds.has(e.to),
	);

	// Build adjacency map
	const children = new Map<string, string[]>();
	const parents = new Map<string, string[]>();
	for (const node of visibleNodes) {
		children.set(node.id, []);
		parents.set(node.id, []);
	}
	for (const edge of visibleEdges) {
		children.get(edge.from)?.push(edge.to);
		parents.get(edge.to)?.push(edge.from);
	}

	// Assign levels via BFS from root nodes (no parents)
	const levels = new Map<string, number>();
	const roots = visibleNodes.filter((n) => !parents.get(n.id)?.length);
	if (roots.length === 0 && visibleNodes.length > 0) {
		roots.push(visibleNodes[0]);
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
	for (const node of visibleNodes) {
		if (!levels.has(node.id)) {
			levels.set(node.id, 0);
		}
	}

	// Group nodes by level
	const levelGroups = new Map<number, WorkflowGraphNode[]>();
	for (const node of visibleNodes) {
		const level = levels.get(node.id) ?? 0;
		if (!levelGroups.has(level)) levelGroups.set(level, []);
		levelGroups.get(level)!.push(node);
	}

	const maxLevel = Math.max(...levels.values(), 0);
	const maxNodesInLevel = Math.max(...Array.from(levelGroups.values()).map((g) => g.length), 1);

	// Position nodes
	const layoutNodes = new Map<string, LayoutNode>();
	const anyDesc = hasAnyDescription(visibleNodes);
	const effectiveHeight = nodeHeight(anyDesc);

	for (let level = 0; level <= maxLevel; level++) {
		const group = levelGroups.get(level) ?? [];
		const totalWidth = group.length * NODE_WIDTH + (group.length - 1) * NODE_GAP_X;
		const startX =
			PADDING + (maxNodesInLevel * (NODE_WIDTH + NODE_GAP_X) - NODE_GAP_X - totalWidth) / 2;

		for (let i = 0; i < group.length; i++) {
			const node = group[i];
			layoutNodes.set(node.id, {
				id: node.id,
				name: node.name,
				type: node.type,
				x: startX + i * (NODE_WIDTH + NODE_GAP_X),
				y: PADDING + level * (effectiveHeight + LEVEL_GAP_Y),
				level,
				config: node.config,
			});
		}
	}

	// Build layout edges — include condition text
	const layoutEdges: LayoutEdge[] = [];
	for (const edge of visibleEdges) {
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

const STATUS_COLORS: Record<string, string> = {
	completed: '#17bf63',
	failed: '#ff4949',
	running: '#f5a623',
	queued: '#d1d5db',
	pending: '#d1d5db',
	waiting: '#4a9eff',
	waiting_approval: '#8b5cf6',
	cancelled: '#9ca3af',
	retry_pending: '#f5a623',
	skipped: '#9ca3af',
	cached: '#17bf63',
};

const STATUS_LABELS: Record<string, string> = {
	completed: 'Completed',
	failed: 'Failed',
	running: 'Running',
	queued: 'Queued',
	pending: 'Pending',
	waiting: 'Waiting',
	waiting_approval: 'Awaiting Approval',
	cancelled: 'Cancelled',
	retry_pending: 'Retry Pending',
	skipped: 'Skipped',
	cached: 'Cached',
};

function findStep(stepId: string): StepExecution | undefined {
	return props.steps.find((s) => s.stepId === stepId);
}

// Check if the execution is finished (no more steps will run)
const executionFinished = computed(() => {
	if (props.steps.length === 0) return false;
	const hasRunning = props.steps.some((s) =>
		['running', 'queued', 'pending', 'retry_pending', 'waiting', 'waiting_approval'].includes(
			s.status,
		),
	);
	return !hasRunning;
});

function statusColor(stepId: string): string {
	const step = findStep(stepId);
	if (!step) {
		// No step execution: skipped if execution finished, pending if still running
		return executionFinished.value ? '#9ca3af' : '#d1d5db';
	}
	return STATUS_COLORS[step.status] ?? '#d1d5db';
}

function statusLabel(stepId: string): string {
	const step = findStep(stepId);
	if (!step) {
		return executionFinished.value ? 'Skipped' : 'Pending';
	}
	return STATUS_LABELS[step.status] ?? step.status;
}

function stepDuration(stepId: string): string | null {
	const step = findStep(stepId);
	if (!step || step.durationMs === null || step.durationMs === undefined) return null;
	return formatMs(step.durationMs);
}

function isRunning(stepId: string): boolean {
	const step = findStep(stepId);
	return step?.status === 'running';
}

function isSelected(stepId: string): boolean {
	return props.selectedStepId === stepId;
}

function formatMs(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	const mins = Math.floor(ms / 60000);
	const secs = ((ms % 60000) / 1000).toFixed(0);
	return `${mins}m ${secs}s`;
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

function edgeColor(from: LayoutNode, to: LayoutNode): string {
	const fromStep = findStep(from.id);
	const toStep = findStep(to.id);
	// Both completed → green edge
	if (fromStep?.status === 'completed' && toStep?.status === 'completed') {
		return '#17bf63';
	}
	// From completed, to running → amber edge
	if (fromStep?.status === 'completed' && toStep?.status === 'running') {
		return '#f5a623';
	}
	// From completed → partially active
	if (fromStep?.status === 'completed') {
		return '#a0d8b0';
	}
	// From failed → red
	if (fromStep?.status === 'failed') {
		return '#ff4949';
	}
	return '#d1d5db';
}

function truncateName(name: string, maxLen: number = 20): string {
	return name.length > maxLen ? name.slice(0, maxLen) + '...' : name;
}

function handleNodeClick(nodeId: string) {
	emit('select-step', nodeId);
}

function getSleepLabel(node: LayoutNode): string {
	return _getSleepLabel(node.config);
}

function getSleepDetailText(node: LayoutNode): string | undefined {
	return _getSleepDetail(node.config);
}
</script>

<template>
	<div :class="$style.container">
		<div v-if="!graph || !graph.nodes.length" :class="$style.empty">
			<p :class="$style.emptyTitle">No graph data</p>
			<p :class="$style.emptyHint">The workflow graph is not available</p>
		</div>
		<svg
			v-else
			:class="$style.svg"
			:viewBox="`0 0 ${layout.width} ${layout.height}`"
			:width="layout.width"
			:height="layout.height"
		>
			<defs>
				<filter id="execNodeShadow" x="-5%" y="-5%" width="110%" height="120%">
					<feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.08" />
				</filter>
				<filter id="execNodeShadowHover" x="-5%" y="-5%" width="110%" height="130%">
					<feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.15" />
				</filter>
				<filter id="execNodeShadowSelected" x="-5%" y="-5%" width="110%" height="130%">
					<feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.2" />
				</filter>
				<marker id="execArrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
					<polygon points="0 0, 8 3, 0 6" fill="var(--color-text-lighter)" />
				</marker>
				<marker
					id="execArrowheadGreen"
					markerWidth="8"
					markerHeight="6"
					refX="8"
					refY="3"
					orient="auto"
				>
					<polygon points="0 0, 8 3, 0 6" fill="#17bf63" />
				</marker>
				<marker
					id="execArrowheadAmber"
					markerWidth="8"
					markerHeight="6"
					refX="8"
					refY="3"
					orient="auto"
				>
					<polygon points="0 0, 8 3, 0 6" fill="#f5a623" />
				</marker>
				<marker
					id="execArrowheadRed"
					markerWidth="8"
					markerHeight="6"
					refX="8"
					refY="3"
					orient="auto"
				>
					<polygon points="0 0, 8 3, 0 6" fill="#ff4949" />
				</marker>
			</defs>

			<!-- Edges -->
			<g v-for="(edge, idx) in layout.edges" :key="`edge-${idx}`">
				<path
					:d="edgePath(edge.from, edge.to, layout.effectiveHeight)"
					fill="none"
					:stroke="edgeColor(edge.from, edge.to)"
					stroke-width="1.5"
					:marker-end="
						edgeColor(edge.from, edge.to) === '#17bf63'
							? 'url(#execArrowheadGreen)'
							: edgeColor(edge.from, edge.to) === '#f5a623'
								? 'url(#execArrowheadAmber)'
								: edgeColor(edge.from, edge.to) === '#ff4949'
									? 'url(#execArrowheadRed)'
									: 'url(#execArrowhead)'
					"
					:class="$style.edge"
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
						fill="var(--color-bg)"
						stroke="#e0e0e0"
						stroke-width="1"
					/>
					<text
						:x="edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).x"
						:y="edgeLabelPos(edge.from, edge.to, layout.effectiveHeight).y"
						text-anchor="middle"
						dominant-baseline="central"
						font-size="11"
						font-weight="500"
						fill="var(--color-text-light)"
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
					isRunning(node.id) ? $style.nodeRunning : '',
					isSelected(node.id) ? $style.nodeSelected : '',
				]"
				pointer-events="all"
				@click.stop="handleNodeClick(node.id)"
			>
				<!-- Node background -->
				<rect
					:x="node.x"
					:y="node.y"
					:width="NODE_WIDTH"
					:height="layout.effectiveHeight"
					rx="8"
					ry="8"
					fill="var(--color-bg)"
					:stroke="statusColor(node.id)"
					:stroke-width="isSelected(node.id) ? 3 : 1.5"
					:stroke-dasharray="node.type === 'sleep' ? '6 3' : 'none'"
					:filter="isSelected(node.id) ? 'url(#execNodeShadowSelected)' : 'url(#execNodeShadow)'"
					:class="[$style.nodeRect, node.type === 'sleep' ? $style.sleepNodeRect : '']"
				/>

				<!-- Sleep node — same layout as regular nodes: icon+name top, description middle, status+duration bottom -->
				<template v-if="node.type === 'sleep'">
					<!-- Clock icon -->
					<g :transform="`translate(${node.x + 10}, ${node.y + 10}) scale(0.75)`">
						<path
							v-for="(d, pi) in LUCIDE_PATHS['clock']"
							:key="pi"
							:d="d"
							fill="none"
							:stroke="SLEEP_NODE_COLOR"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</g>
					<!-- Sleep label -->
					<text
						:x="node.x + 32"
						:y="node.y + 21"
						text-anchor="start"
						dominant-baseline="central"
						font-size="13"
						font-weight="600"
						font-family="var(--font-family)"
						:class="$style.sleepNodeText"
					>
						{{ getSleepLabel(node) }}
					</text>
					<!-- waitUntil expression as description -->
					<text
						v-if="getSleepDetailText(node)"
						:x="node.x + 14"
						:y="node.y + 38"
						text-anchor="start"
						dominant-baseline="central"
						font-size="10"
						font-weight="400"
						font-family="var(--font-family-mono, monospace)"
						:class="$style.nodeDescription"
					>
						{{ truncateName(getSleepDetailText(node)!, 26) }}
					</text>
					<!-- Status — always at the bottom of the card -->
					<text
						:x="node.x + 14"
						:y="node.y + layout.effectiveHeight - 12"
						text-anchor="start"
						dominant-baseline="central"
						font-size="10"
						font-weight="500"
						:fill="statusColor(node.id)"
						font-family="var(--font-family)"
						:class="$style.nodeText"
					>
						{{ statusLabel(node.id) }}
					</text>
					<!-- Duration — always at the bottom of the card -->
					<text
						v-if="stepDuration(node.id)"
						:x="node.x + NODE_WIDTH - 10"
						:y="node.y + layout.effectiveHeight - 12"
						text-anchor="end"
						dominant-baseline="central"
						font-size="10"
						font-weight="400"
						fill="var(--color-text-lighter)"
						font-family="var(--font-family-mono, monospace)"
						:class="$style.nodeText"
					>
						{{ stepDuration(node.id) }}
					</text>
				</template>

				<!-- Regular node -->
				<template v-else>
					<!-- Icon -->
					<g
						v-if="getDisplayConfig(node)?.icon && LUCIDE_PATHS[getDisplayConfig(node)!.icon!]"
						:transform="`translate(${node.x + 10}, ${node.y + 10}) scale(0.75)`"
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
							(getDisplayConfig(node)?.icon && LUCIDE_PATHS[getDisplayConfig(node)!.icon!]
								? 32
								: 14)
						"
						:y="node.y + 21"
						text-anchor="start"
						dominant-baseline="central"
						font-size="13"
						font-weight="600"
						fill="var(--color-text)"
						font-family="var(--font-family)"
						:class="$style.nodeText"
					>
						{{ truncateName(node.name) }}
					</text>
					<!-- Description (if present) -->
					<text
						v-if="getDisplayConfig(node)?.description"
						:x="node.x + 14"
						:y="node.y + 38"
						text-anchor="start"
						dominant-baseline="central"
						font-size="10"
						font-weight="400"
						font-family="var(--font-family)"
						:class="$style.nodeDescription"
					>
						{{ truncateName(getDisplayConfig(node)!.description!, 30) }}
					</text>
					<!-- Status label -->
					<text
						:x="node.x + 14"
						:y="
							getDisplayConfig(node)?.description
								? node.y + layout.effectiveHeight - 12
								: node.y + 40
						"
						text-anchor="start"
						dominant-baseline="central"
						font-size="10"
						font-weight="500"
						:fill="statusColor(node.id)"
						font-family="var(--font-family)"
						:class="$style.nodeText"
					>
						{{ statusLabel(node.id) }}
					</text>
					<!-- Duration on right -->
					<text
						v-if="stepDuration(node.id)"
						:x="node.x + NODE_WIDTH - 10"
						:y="
							getDisplayConfig(node)?.description
								? node.y + layout.effectiveHeight - 12
								: node.y + 40
						"
						text-anchor="end"
						dominant-baseline="central"
						font-size="10"
						font-weight="400"
						fill="var(--color-text-lighter)"
						font-family="var(--font-family-mono, monospace)"
						:class="$style.nodeText"
					>
						{{ stepDuration(node.id) }}
					</text>
				</template>
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
	border: 1px solid var(--color-border-light);
}

.svg {
	display: block;
}

.edge {
	transition: stroke 0.2s ease;
}

.conditionLabelBg {
	fill: #fef3c7;
	stroke: #f5a623;
	stroke-width: 1;
}

.conditionLabelText {
	fill: #92400e;
}

.node {
	cursor: pointer;
	transition: transform 0.15s ease;
}

.nodeRect {
	transition:
		filter 0.15s ease,
		stroke 0.15s ease,
		stroke-width 0.15s ease;
}

.node:hover .nodeRect {
	filter: url(#execNodeShadowHover);
}

.nodeText {
	pointer-events: none;
	user-select: none;
}

.nodeDescription {
	fill: var(--color-text-lighter);
	pointer-events: none;
	user-select: none;
}

.sleepNodeRect {
	opacity: 0.9;
}

.sleepNodeText {
	fill: #4a9eff;
	pointer-events: none;
	user-select: none;
	font-style: italic;
}

@keyframes pulseNode {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.7;
	}
}

.nodeRunning .nodeRect {
	animation: pulseNode 2s ease-in-out infinite;
}

.nodeSelected .nodeRect {
	stroke-width: 3 !important;
	filter: url(#execNodeShadowSelected);
	fill: var(--color-primary-tint-2, #fff2f0);
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 150px;
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
