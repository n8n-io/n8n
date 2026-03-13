<script lang="ts" setup>
import { computed } from 'vue';
import type { WorkflowGraph, WorkflowGraphNode, WorkflowGraphEdge } from '../stores/workflow.store';
import { LUCIDE_PATHS } from './lucide-paths';
import {
	getSleepLabel as _getSleepLabel,
	getSleepDetail,
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

interface CanvasLayoutNode extends LayoutNode {
	isWebhook?: boolean;
	webhookMethod?: string;
	webhookPath?: string;
}

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

const layout = computed((): GraphLayout<CanvasLayoutNode> => {
	if (!props.graph || !props.graph.nodes.length) {
		return { nodes: [], edges: [], width: 0, height: 0, effectiveHeight: 0 };
	}

	const { nodes: allNodes, edges: allEdges } = props.graph;

	// Identify trigger node IDs so we can filter them out
	const triggerNodeIds = new Set(allNodes.filter((n) => n.type === 'trigger').map((n) => n.id));

	// Filter out trigger nodes -- they are implicit
	const visibleNodes = allNodes.filter((n) => n.type !== 'trigger');

	// Remap edges: drop edges between triggers, and for edges originating
	// from a trigger node, simply remove them (the successors become roots)
	const visibleEdges = allEdges.filter(
		(e) => !triggerNodeIds.has(e.from) && !triggerNodeIds.has(e.to),
	);

	// Check if there are webhook triggers to display
	const webhookTriggers = (props.triggers ?? []).filter((t) => t.type === 'webhook');

	// Build the list of nodes to lay out -- webhook triggers come first
	const webhookNodes: WorkflowGraphNode[] = webhookTriggers.map((wh, idx) => ({
		id: `__webhook_${idx}`,
		name: `${(wh.config?.method ?? 'POST').toUpperCase()} ${wh.config?.path ?? '/'}`,
		type: 'webhook' as WorkflowGraphNode['type'],
		stepFunctionRef: '',
		config: {},
	}));

	const nodesToLayout = [...webhookNodes, ...visibleNodes];

	// Build edges -- webhook nodes connect to root visible nodes
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

	// Augment layout nodes with webhook-specific fields
	const webhookNodeIdSet = new Set(webhookNodes.map((n) => n.id));

	return computeGraphLayout<CanvasLayoutNode>(nodesToLayout, edgesToLayout, (node, base) => {
		const isWebhook = webhookNodeIdSet.has(node.id);
		const whTrigger = isWebhook
			? webhookTriggers[webhookNodes.findIndex((w) => w.id === node.id)]
			: undefined;

		return {
			...base,
			type: isWebhook ? 'webhook' : node.type,
			isWebhook,
			webhookMethod: whTrigger?.config?.method?.toUpperCase(),
			webhookPath: whTrigger?.config?.path,
		};
	});
});

function typeColor(type: string): string {
	const colors: Record<string, string> = {
		trigger: '#ff6d5a',
		webhook: '#f97316',
		step: '#3b82f6',
		condition: '#f5a623',
		approval: '#8b5cf6',
		sleep: SLEEP_NODE_COLOR,
		batch: BATCH_NODE_COLOR,
		'trigger-workflow': TRIGGER_WORKFLOW_NODE_COLOR,
		end: '#6b7280',
	};
	return colors[type] ?? '#6b7280';
}

function stripeColor(node: CanvasLayoutNode): string {
	const display = getDisplayConfig(node);
	return display?.color ?? typeColor(node.type);
}

function getSleepLabel(node: CanvasLayoutNode): string {
	return _getSleepLabel(node.config);
}

function getSleepDetailText(node: CanvasLayoutNode): string | undefined {
	return getSleepDetail(node.config);
}

function getBatchLabel(node: CanvasLayoutNode): string {
	return _getBatchLabel(node.config);
}

function getBatchDetailText(node: CanvasLayoutNode): string | undefined {
	return _getBatchDetail(node.config);
}

function getTriggerWorkflowLabel(node: CanvasLayoutNode): string {
	return _getTriggerWorkflowLabel(node.config);
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
					$style.nodeClickable,
					props.selectedNodeId === node.id ? $style.nodeSelected : '',
				]"
				@click="emit('node-click', node.isWebhook ? 'trigger' : node.id)"
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
					:stroke-dasharray="node.type === 'sleep' ? '6 3' : 'none'"
					:class="[
						$style.nodeRect,
						node.type === 'sleep' ? $style.sleepNodeRect : '',
						node.type === 'batch' ? $style.batchNodeRect : '',
						node.type === 'trigger-workflow' ? $style.triggerWorkflowNodeRect : '',
					]"
				/>

				<!-- Sleep node: clock icon, label on top, detail on bottom -->
				<template v-if="node.type === 'sleep'">
					<g
						:transform="`translate(${node.x + 10}, ${getSleepDetailText(node) ? node.y + 13 : node.y + layout.effectiveHeight / 2 - 9}) scale(0.75)`"
					>
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
					<text
						:x="node.x + 32"
						:y="getSleepDetailText(node) ? node.y + 24 : node.y + layout.effectiveHeight / 2"
						text-anchor="start"
						dominant-baseline="central"
						font-size="13"
						font-weight="500"
						font-family="var(--font-family)"
						:class="$style.sleepNodeText"
					>
						{{ getSleepLabel(node) }}
					</text>
					<!-- Detail on bottom line (waitUntil expression) -->
					<text
						v-if="getSleepDetailText(node)"
						:x="node.x + 14"
						:y="node.y + layout.effectiveHeight - 16"
						text-anchor="start"
						dominant-baseline="central"
						font-size="10"
						font-weight="400"
						font-family="var(--font-family-mono, monospace)"
						:class="$style.nodeDescription"
					>
						{{ truncateName(getSleepDetailText(node)!, 26) }}
					</text>
				</template>

				<!-- Batch node: layers icon, label, description on bottom -->
				<template v-else-if="node.type === 'batch'">
					<g
						:transform="`translate(${node.x + 10}, ${getDisplayConfig(node)?.description ? node.y + 13 : node.y + layout.effectiveHeight / 2 - 9}) scale(0.75)`"
					>
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
					<text
						:x="node.x + 32"
						:y="
							getDisplayConfig(node)?.description
								? node.y + 24
								: node.y + layout.effectiveHeight / 2
						"
						text-anchor="start"
						dominant-baseline="central"
						font-size="13"
						font-weight="500"
						font-family="var(--font-family)"
						:class="$style.batchNodeText"
					>
						{{ truncateName(getBatchLabel(node)) }}
					</text>
					<!-- Description on second line -->
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
						{{ truncateName(getDisplayConfig(node)!.description!, 26) }}
					</text>
				</template>

				<!-- Trigger-workflow node: external-link icon, label, description -->
				<template v-else-if="node.type === 'trigger-workflow'">
					<g
						:transform="`translate(${node.x + 10}, ${getDisplayConfig(node)?.description ? node.y + 13 : node.y + layout.effectiveHeight / 2 - 9}) scale(0.75)`"
					>
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
					<text
						:x="node.x + 32"
						:y="
							getDisplayConfig(node)?.description
								? node.y + 24
								: node.y + layout.effectiveHeight / 2
						"
						text-anchor="start"
						dominant-baseline="central"
						font-size="13"
						font-weight="500"
						font-family="var(--font-family)"
						:class="$style.triggerWorkflowNodeText"
					>
						{{ truncateName(getTriggerWorkflowLabel(node), 18) }}
					</text>
					<!-- Description on second line -->
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
						{{ truncateName(getDisplayConfig(node)!.description!, 26) }}
					</text>
				</template>

				<!-- Regular node: icon + name -->
				<template v-else>
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
							(getDisplayConfig(node)?.icon && LUCIDE_PATHS[getDisplayConfig(node)!.icon!]
								? 32
								: 14)
						"
						:y="
							getDisplayConfig(node)?.description
								? node.y + 24
								: node.y + layout.effectiveHeight / 2
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
				</template>
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

.sleepNodeRect {
	fill: var(--color-bg);
	opacity: 0.9;
}

.sleepNodeText {
	fill: #4a9eff;
	pointer-events: none;
	user-select: none;
	font-style: italic;
}

.batchNodeRect {
	fill: var(--color-bg);
}

.batchNodeText {
	fill: #f97316;
	pointer-events: none;
	user-select: none;
}

.triggerWorkflowNodeRect {
	fill: var(--color-bg);
}

.triggerWorkflowNodeText {
	fill: #6366f1;
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
