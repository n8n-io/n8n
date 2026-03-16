<script lang="ts" setup>
import { computed } from 'vue';
import type { WorkflowGraph } from '../stores/workflow.store';
import type { StepExecution } from '../stores/execution.store';
import { LUCIDE_PATHS } from './lucide-paths';
import {
	getSleepLabel as _getSleepLabel,
	getSleepDetail as _getSleepDetail,
	SLEEP_NODE_COLOR,
} from '../utils/sleep-node';
import {
	getBatchLabel as _getBatchLabel,
	getBatchDetail as _getBatchDetail,
	BATCH_NODE_COLOR,
} from '../utils/batch-node';
import {
	getTriggerWorkflowLabel as _getTriggerWorkflowLabel,
	TRIGGER_WORKFLOW_NODE_COLOR,
} from '../utils/trigger-workflow-node';
import {
	NODE_WIDTH,
	computeGraphLayout,
	getDisplayConfig,
	formatCondition,
	edgePath,
	edgeLabelPos,
	truncateName,
	type LayoutNode,
	type GraphLayout,
} from '../composables/useGraphLayout';

const props = defineProps<{
	graph: WorkflowGraph;
	steps: StepExecution[];
	selectedStepId: string | null;
}>();

const emit = defineEmits<{
	'select-step': [stepId: string];
}>();

const TRIGGER_COLOR = '#ff6d5a';

/**
 * Derive a human-readable trigger node name.
 * For webhook triggers the graph node config carries method/path from the
 * transpiler, so we can show e.g. "POST /echo".  For manual triggers we
 * fall back to the node name stored in the graph (e.g. "Manual Trigger").
 */
function triggerDisplayName(node: LayoutNode): string {
	const cfg = node.config;
	if (cfg) {
		const method = cfg.method as string | undefined;
		const path = cfg.path as string | undefined;
		if (method && path) {
			return `${method.toUpperCase()} ${path}`;
		}
	}
	return node.name || 'Trigger';
}

const layout = computed((): GraphLayout => {
	if (!props.graph || !props.graph.nodes.length) {
		return { nodes: [], edges: [], width: 0, height: 0, effectiveHeight: 0 };
	}

	return computeGraphLayout(props.graph.nodes, props.graph.edges);
});

const STATUS_COLORS: Record<string, string> = {
	completed: '#17bf63',
	failed: '#ff4949',
	running: '#f5a623',
	queued: '#d1d5db',
	pending: '#d1d5db',
	waiting: '#4a9eff',
	waiting_approval: '#8b5cf6',
	suspended: '#8b5cf6',
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
	suspended: 'Suspended',
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
		[
			'running',
			'queued',
			'pending',
			'retry_pending',
			'waiting',
			'waiting_approval',
			'suspended',
		].includes(s.status),
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

function handleNodeClick(nodeId: string) {
	emit('select-step', nodeId);
}

function getSleepLabel(node: LayoutNode): string {
	return _getSleepLabel(node.config);
}

function getSleepDetailText(node: LayoutNode): string | undefined {
	return _getSleepDetail(node.config);
}

function getBatchLabel(node: LayoutNode): string {
	return _getBatchLabel(node.config);
}

function getBatchDetailText(node: LayoutNode): string | undefined {
	return _getBatchDetail(node.config);
}

function getTriggerWorkflowLabel(node: LayoutNode): string {
	return _getTriggerWorkflowLabel(node.config);
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
					:class="[
						$style.nodeRect,
						node.type === 'sleep' ? $style.sleepNodeRect : '',
						node.type === 'batch' ? $style.batchNodeRect : '',
						node.type === 'trigger-workflow' ? $style.triggerWorkflowNodeRect : '',
					]"
				/>

				<!-- Trigger node — zap icon, trigger color, name + status/duration -->
				<template v-if="node.type === 'trigger'">
					<!-- Zap icon -->
					<g :transform="`translate(${node.x + 10}, ${node.y + 10}) scale(0.75)`">
						<path
							v-for="(d, pi) in LUCIDE_PATHS['zap']"
							:key="pi"
							:d="d"
							fill="none"
							:stroke="TRIGGER_COLOR"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</g>
					<!-- Trigger name -->
					<text
						:x="node.x + 32"
						:y="node.y + 21"
						text-anchor="start"
						dominant-baseline="central"
						font-size="13"
						font-weight="600"
						font-family="var(--font-family)"
						:class="$style.triggerNodeText"
					>
						{{ truncateName(triggerDisplayName(node), 20) }}
					</text>
					<!-- Status label -->
					<text
						:x="node.x + 14"
						:y="node.y + 40"
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
						:y="node.y + 40"
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

				<template v-else-if="node.type === 'sleep'">
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

				<!-- Batch node: layers icon, label, detail, status + duration -->
				<template v-else-if="node.type === 'batch'">
					<!-- Layers icon -->
					<g :transform="`translate(${node.x + 10}, ${node.y + 10}) scale(0.75)`">
						<path
							v-for="(d, pi) in LUCIDE_PATHS['layers']"
							:key="pi"
							:d="d"
							fill="none"
							:stroke="BATCH_NODE_COLOR"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</g>
					<!-- Batch label -->
					<text
						:x="node.x + 32"
						:y="node.y + 21"
						text-anchor="start"
						dominant-baseline="central"
						font-size="13"
						font-weight="600"
						font-family="var(--font-family)"
						:class="$style.batchNodeText"
					>
						{{ getBatchLabel(node) }}
					</text>
					<!-- onItemFailure detail -->
					<text
						v-if="getBatchDetailText(node)"
						:x="node.x + 14"
						:y="node.y + 38"
						text-anchor="start"
						dominant-baseline="central"
						font-size="10"
						font-weight="400"
						font-family="var(--font-family-mono, monospace)"
						:class="$style.nodeDescription"
					>
						{{ truncateName(getBatchDetailText(node)!, 26) }}
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

				<!-- Trigger-workflow node: external-link icon, label, description, status + duration -->
				<template v-else-if="node.type === 'trigger-workflow'">
					<!-- External-link icon -->
					<g :transform="`translate(${node.x + 10}, ${node.y + 10}) scale(0.75)`">
						<path
							v-for="(d, pi) in LUCIDE_PATHS['external-link']"
							:key="pi"
							:d="d"
							fill="none"
							:stroke="TRIGGER_WORKFLOW_NODE_COLOR"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</g>
					<!-- Trigger-workflow label -->
					<text
						:x="node.x + 32"
						:y="node.y + 21"
						text-anchor="start"
						dominant-baseline="central"
						font-size="13"
						font-weight="600"
						font-family="var(--font-family)"
						:class="$style.triggerWorkflowNodeText"
					>
						{{ truncateName(getTriggerWorkflowLabel(node), 20) }}
					</text>
					<!-- Description -->
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
						{{ truncateName(getDisplayConfig(node)!.description!, 26) }}
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

.batchNodeRect {
	/* solid border, no special opacity */
}

.batchNodeText {
	fill: #f97316;
	pointer-events: none;
	user-select: none;
}

.triggerNodeText {
	fill: #ff6d5a;
	pointer-events: none;
	user-select: none;
}

.triggerWorkflowNodeRect {
	/* solid border, standard fill */
}

.triggerWorkflowNodeText {
	fill: #6366f1;
	pointer-events: none;
	user-select: none;
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
