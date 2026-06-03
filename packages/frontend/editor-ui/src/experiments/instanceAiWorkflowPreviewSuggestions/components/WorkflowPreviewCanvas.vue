<script lang="ts" setup>
import { computed, reactive, ref, onMounted, onUnmounted, watch, type Component } from 'vue';
import { useElementSize } from '@vueuse/core';
import type {
	PreviewWorkflow,
	PreviewWorkflowConnection,
	PreviewVisualizationType,
	PreviewOutputVisualization,
} from '../workflows/types';
import WorkflowPreviewNode from './WorkflowPreviewNode.vue';
import SlackMessageVisualization from './visualizations/SlackMessageVisualization.vue';
import SalesforceCardVisualization from './visualizations/SalesforceCardVisualization.vue';
import InvoiceSpreadsheetVisualization from './visualizations/InvoiceSpreadsheetVisualization.vue';
import WhatsAppChatVisualization from './visualizations/WhatsAppChatVisualization.vue';

const NODE_HALF_WIDTH = 48;
const EDGE_CURVE_OFFSET = 60;
const PADDING = 80;
const CANVAS_HEIGHT = 420;
const NODE_LABEL_OFFSET = 13;

const NODE_RUNNING_DURATION_MS = 250;

export type NodeAnimationState = 'idle' | 'running' | 'success';
export type AnimationPhase = 'idle' | 'input' | 'nodes' | 'output' | 'done';

const visualizationComponents: Record<PreviewVisualizationType, Component> = {
	'slack-message': SlackMessageVisualization,
	'salesforce-card': SalesforceCardVisualization,
	'invoice-spreadsheet': InvoiceSpreadsheetVisualization,
	'whatsapp-chat': WhatsAppChatVisualization,
};

const props = withDefaults(
	defineProps<{
		workflow: PreviewWorkflow;
		animating?: boolean;
	}>(),
	{ animating: true },
);

const canvasRef = ref<HTMLElement | null>(null);
const { width: canvasRenderedWidth } = useElementSize(canvasRef);

const animationPhase = ref<AnimationPhase>('idle');
const nodeStates = reactive<Record<string, NodeAnimationState>>({});

const hasInputViz = computed(() => !!props.workflow.inputVisualization);
const hasOutputViz = computed(() => !!props.workflow.outputVisualization);

const outputVizItems = computed((): PreviewOutputVisualization[] => {
	const viz = props.workflow.outputVisualization;
	if (!viz) return [];
	if (Array.isArray(viz)) return viz;
	const last = lastNode.value;
	if (!last) return [];
	return [{ type: viz.type, props: viz.props, targetNodeId: last.id }];
});

const inputVizComponent = computed(() =>
	props.workflow.inputVisualization
		? visualizationComponents[props.workflow.inputVisualization.type]
		: undefined,
);

const executionSteps = computed(() => {
	const { nodes, connections } = props.workflow;
	const incomingMap = new Map<string, Set<string>>();
	for (const node of nodes) {
		incomingMap.set(node.id, new Set());
	}
	for (const conn of connections) {
		incomingMap.get(conn.target)?.add(conn.source);
	}

	const visited = new Set<string>();
	const steps: string[][] = [];

	while (visited.size < nodes.length) {
		const ready = nodes
			.filter((n) => !visited.has(n.id))
			.filter((n) => {
				const deps = incomingMap.get(n.id);
				return !deps || [...deps].every((d) => visited.has(d));
			})
			.map((n) => n.id);

		if (ready.length === 0) break;
		steps.push(ready);
		for (const id of ready) visited.add(id);
	}

	return steps;
});

const firstNode = computed(() => {
	const nodes = props.workflow.nodes;
	if (nodes.length === 0) return undefined;
	return nodes.reduce((min, n) => (n.position.x < min.position.x ? n : min), nodes[0]);
});

const lastNode = computed(() => {
	const nodes = props.workflow.nodes;
	if (nodes.length === 0) return undefined;
	return nodes.reduce((max, n) => (n.position.x > max.position.x ? n : max), nodes[0]);
});

const triggerNodeIds = computed(() => {
	const targets = new Set(props.workflow.connections.map((c) => c.target));
	return new Set(props.workflow.nodes.filter((n) => !targets.has(n.id)).map((n) => n.id));
});

function resetStates() {
	for (const node of props.workflow.nodes) {
		nodeStates[node.id] = 'idle';
	}
}

let animationTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = false;

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		animationTimer = setTimeout(resolve, ms);
	});
}

let outputCompletedCount = 0;

async function runNodeAnimation() {
	for (const step of executionSteps.value) {
		if (stopped) return;
		for (const id of step) nodeStates[id] = 'running';
		await sleep(NODE_RUNNING_DURATION_MS);
		if (stopped) return;
		for (const id of step) nodeStates[id] = 'success';
	}
	if (stopped) return;
	if (hasOutputViz.value) {
		outputCompletedCount = 0;
		animationPhase.value = 'output';
	} else {
		animationPhase.value = 'done';
	}
}

function startAnimation() {
	stopped = false;
	resetStates();
	if (hasInputViz.value) {
		animationPhase.value = 'input';
	} else {
		animationPhase.value = 'nodes';
		void runNodeAnimation();
	}
}

function stopAnimation() {
	stopped = true;
	if (animationTimer) {
		clearTimeout(animationTimer);
		animationTimer = null;
	}
}

function handleInputComplete() {
	if (stopped) return;
	animationPhase.value = 'nodes';
	void runNodeAnimation();
}

function handleOutputComplete() {
	if (stopped) return;
	outputCompletedCount++;
	if (outputCompletedCount >= outputVizItems.value.length) {
		animationPhase.value = 'done';
	}
}

watch(
	() => props.animating,
	(val) => {
		if (val) {
			startAnimation();
		} else {
			stopAnimation();
			resetStates();
			animationPhase.value = 'idle';
		}
	},
);

onMounted(() => {
	resetStates();
	if (props.animating) {
		startAnimation();
	}
});

onUnmounted(stopAnimation);

// CRM icons cycling logic (score-my-leads example)
const crmCycleIndex = ref(0);
const crmCycleVisible = ref(false);
let crmCycleStartTimer: ReturnType<typeof setTimeout> | null = null;
let crmCycleInterval: ReturnType<typeof setInterval> | null = null;

const hasCrmCycle = computed(() => !!props.workflow.crmCycle);
const crmVariants = computed(() => props.workflow.crmCycle?.variants ?? []);
const crmCurrentVariant = computed(() => crmVariants.value[crmCycleIndex.value]);
const crmCycleNodeIds = computed(() => new Set(props.workflow.crmCycle?.nodeIds ?? []));

const CRM_INITIAL_DELAY_MS = 500;
const CRM_INTERVAL_MS = 1400;

function startCrmCycle() {
	if (!hasCrmCycle.value) return;
	crmCycleVisible.value = true;
	crmCycleIndex.value = 0;
	const interval = props.workflow.crmCycle?.intervalMs ?? CRM_INTERVAL_MS;

	crmCycleStartTimer = setTimeout(() => {
		crmCycleIndex.value = (crmCycleIndex.value + 1) % crmVariants.value.length;
		crmCycleInterval = setInterval(() => {
			crmCycleIndex.value = (crmCycleIndex.value + 1) % crmVariants.value.length;
		}, interval);
	}, CRM_INITIAL_DELAY_MS);
}

function stopCrmCycle() {
	crmCycleVisible.value = false;
	if (crmCycleStartTimer) {
		clearTimeout(crmCycleStartTimer);
		crmCycleStartTimer = null;
	}
	if (crmCycleInterval) {
		clearInterval(crmCycleInterval);
		crmCycleInterval = null;
	}
}

watch(animationPhase, (phase) => {
	if (phase === 'done' && hasCrmCycle.value) {
		startCrmCycle();
	} else {
		stopCrmCycle();
	}
});

onUnmounted(stopCrmCycle);

const inputVizIcon = computed(() => {
	if (crmCycleVisible.value && crmCurrentVariant.value) {
		return crmCurrentVariant.value.icon.src;
	}
	return undefined;
});

const bounds = computed(() => {
	const nodes = props.workflow.nodes;
	if (nodes.length === 0) return { minX: 0, minY: 0, width: 400, height: 200 };

	const xs = nodes.map((n) => n.position.x);
	const ys = nodes.map((n) => n.position.y);
	const minX = Math.min(...xs) - PADDING;
	const minY = Math.min(...ys) - PADDING;
	const maxX = Math.max(...xs) + PADDING;
	const maxY = Math.max(...ys) + PADDING;

	return { minX, minY, width: maxX - minX, height: maxY - minY };
});

const CANVAS_WIDTH = 1600;
const VIZ_MARGIN = 160;
const VIZ_GAP = 28;
const CANVAS_INNER_PADDING = 60;

const scale = computed(() => {
	const { width, height } = bounds.value;
	let availableWidth = CANVAS_WIDTH - 2 * CANVAS_INNER_PADDING;
	if (hasInputViz.value) availableWidth -= VIZ_MARGIN;
	if (hasOutputViz.value) availableWidth -= VIZ_MARGIN;
	const scaleX = availableWidth / width;
	const scaleY = (CANVAS_HEIGHT - 2 * CANVAS_INNER_PADDING) / height;
	return Math.min(scaleX, scaleY, 1);
});

const effectiveCanvasWidth = computed(() =>
	canvasRenderedWidth.value > 0 ? canvasRenderedWidth.value : CANVAS_WIDTH,
);

const containerStyle = computed(() => {
	const { width, height } = bounds.value;
	const s = scale.value;
	const scaledWidth = width * s;
	const scaledHeight = height * s;

	return {
		width: `${width}px`,
		height: `${height}px`,
		transform: `scale(${s})`,
		transformOrigin: 'top left',
		left: `${(effectiveCanvasWidth.value - scaledWidth) / 2}px`,
		top: `${(CANVAS_HEIGHT - scaledHeight) / 2}px`,
	};
});

const viewBox = computed(
	() => `${bounds.value.minX} ${bounds.value.minY} ${bounds.value.width} ${bounds.value.height}`,
);

const canvasMarginLeft = computed(() => {
	const s = scale.value;
	const scaledWidth = bounds.value.width * s;
	return (effectiveCanvasWidth.value - scaledWidth) / 2;
});

const canvasMarginTop = computed(() => {
	const s = scale.value;
	const scaledHeight = bounds.value.height * s;
	return (CANVAS_HEIGHT - scaledHeight) / 2;
});

function toScreenX(workflowX: number): number {
	return (workflowX - bounds.value.minX) * scale.value + canvasMarginLeft.value;
}

function toScreenY(workflowY: number): number {
	return (workflowY - bounds.value.minY) * scale.value + canvasMarginTop.value;
}

const inputSlotStyle = computed(() => {
	if (!firstNode.value) return {};
	const nodeScreenX = toScreenX(firstNode.value.position.x - NODE_HALF_WIDTH);
	const nodeScreenY = toScreenY(firstNode.value.position.y - NODE_LABEL_OFFSET);
	return {
		left: `${nodeScreenX - VIZ_GAP}px`,
		top: `${nodeScreenY}px`,
		transform: 'translateX(-100%) translateY(-50%)',
	};
});

const OUTPUT_VIZ_HEIGHT = 80;
const OUTPUT_VIZ_GAP = 16;

const outputSlotStyles = computed(() => {
	const items = outputVizItems.value;
	if (items.length === 0) return [];

	const positions = items.map((item) => {
		const node = props.workflow.nodes.find((n) => n.id === item.targetNodeId);
		const targetNode = node ?? lastNode.value;
		if (!targetNode) return { x: 0, y: 0 };
		return {
			x: toScreenX(targetNode.position.x + NODE_HALF_WIDTH),
			y: toScreenY(targetNode.position.y - NODE_LABEL_OFFSET),
		};
	});

	if (items.length > 1) {
		const sorted = positions.map((p, i) => ({ idx: i, y: p.y })).sort((a, b) => a.y - b.y);
		const minSpacing = OUTPUT_VIZ_HEIGHT + OUTPUT_VIZ_GAP;
		for (let i = 1; i < sorted.length; i++) {
			const prev = sorted[i - 1];
			const curr = sorted[i];
			if (curr.y - prev.y < minSpacing) {
				positions[curr.idx].y = positions[prev.idx].y + minSpacing;
			}
		}
	}

	const isMulti = items.length > 1;
	return positions.map((pos) => ({
		left: `${pos.x + VIZ_GAP}px`,
		top: `${pos.y}px`,
		...(isMulti ? {} : { transform: 'translateY(-50%)' }),
	}));
});

function getEdgePath(connection: PreviewWorkflowConnection): string {
	const sourceNode = props.workflow.nodes.find((n) => n.id === connection.source);
	const targetNode = props.workflow.nodes.find((n) => n.id === connection.target);
	if (!sourceNode || !targetNode) return '';

	const sx = sourceNode.position.x + NODE_HALF_WIDTH;
	const sy = sourceNode.position.y - NODE_LABEL_OFFSET;
	const tx = targetNode.position.x - NODE_HALF_WIDTH;
	const ty = targetNode.position.y - NODE_LABEL_OFFSET;

	const dist = Math.abs(tx - sx);
	const cx = Math.min(EDGE_CURVE_OFFSET, dist * 0.4);
	return `M ${sx} ${sy} C ${sx + cx} ${sy}, ${tx - cx} ${ty}, ${tx} ${ty}`;
}

function isEdgeSuccess(connection: PreviewWorkflowConnection): boolean {
	return nodeStates[connection.target] === 'success';
}
</script>

<template>
	<div ref="canvasRef" :class="$style.canvas">
		<div :class="$style.viewport" :style="containerStyle">
			<svg :class="$style.edges" :viewBox="viewBox">
				<path
					v-for="(conn, idx) in props.workflow.connections"
					:key="`edge-${idx}`"
					:d="getEdgePath(conn)"
					:class="[$style.edge, isEdgeSuccess(conn) && $style.edgeSuccess]"
				/>
			</svg>
			<div :class="$style.nodesLayer">
				<WorkflowPreviewNode
					v-for="node in props.workflow.nodes"
					:key="node.id"
					:node="node"
					:state="nodeStates[node.id] ?? 'idle'"
					:trigger="triggerNodeIds.has(node.id)"
					:offset-x="bounds.minX"
					:offset-y="bounds.minY"
					:icon-override="
						crmCycleNodeIds.has(node.id) && crmCycleVisible ? crmCurrentVariant?.icon : undefined
					"
				/>
			</div>
		</div>

		<div v-if="inputVizComponent" :class="$style.vizSlot" :style="inputSlotStyle">
			<component
				:is="inputVizComponent"
				:active="animationPhase !== 'idle'"
				v-bind="props.workflow.inputVisualization?.props"
				:icon-override="inputVizIcon"
				slide-from="left"
				@complete="handleInputComplete"
			/>
		</div>

		<div
			v-for="(outputViz, idx) in outputVizItems"
			:key="`output-viz-${idx}`"
			:class="[$style.vizSlot, outputVizItems.length > 1 && $style.vizSlotCompact]"
			:style="outputSlotStyles[idx]"
		>
			<component
				:is="visualizationComponents[outputViz.type]"
				:active="animationPhase === 'output' || animationPhase === 'done'"
				v-bind="outputViz.props"
				:icon-override="
					outputViz.type === 'salesforce-card' && crmCycleVisible ? inputVizIcon : undefined
				"
				@complete="handleOutputComplete"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.canvas {
	position: relative;
	width: 100%;
	max-width: 1600px;
	height: 420px;
	margin: 0 auto;
	overflow: hidden;
	background-color: var(--canvas--color--background);
	background-image: radial-gradient(
		oklch(from var(--canvas--dot--color) l c h / 0.5) 1px,
		transparent 1px
	);
	background-size: 16px 16px;
	border: 1px solid var(--border-color);
	border-radius: var(--radius--xl);
}

.viewport {
	position: absolute;
}

.edges {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

.edge {
	fill: none;
	stroke: var(--color--foreground--shade-1);
	stroke-width: 2;
	stroke-linecap: round;
	transition: stroke 0.3s ease;
}

.edgeSuccess {
	stroke: var(--color--success);
}

.nodesLayer {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.vizSlot {
	position: absolute;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
}

.vizSlotCompact {
	transform: translateY(-50%);
	transform-origin: left center;
}
</style>
