<!-- Experiment cleanup (124_workflow_previews_above_assistant) -->
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useElementSize, usePreferredReducedMotion } from '@vueuse/core';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { NODE_X_SPACING } from '@/app/utils/nodeViewUtils';
import type { NodeAnimationState } from '@/experiments/instanceAiWorkflowPreviewSuggestions/components/WorkflowPreviewCanvas.vue';
import WorkflowPreviewNode from '@/experiments/instanceAiWorkflowPreviewSuggestions/components/WorkflowPreviewNode.vue';
import InvoiceSpreadsheetVisualization from '@/experiments/instanceAiWorkflowPreviewSuggestions/components/visualizations/InvoiceSpreadsheetVisualization.vue';
import SalesforceCardVisualization from '@/experiments/instanceAiWorkflowPreviewSuggestions/components/visualizations/SalesforceCardVisualization.vue';
import SlackMessageVisualization from '@/experiments/instanceAiWorkflowPreviewSuggestions/components/visualizations/SlackMessageVisualization.vue';
import type { PreviewWorkflowNode } from '@/experiments/instanceAiWorkflowPreviewSuggestions/workflows/types';

import { getPreviewFileIcon, getPreviewIcon } from '../icons';
import {
	CARD_NATIVE_WIDTH,
	CARD_SCALE,
	NODE_HALF_SIZE,
	NODE_LABEL_OFFSET,
	NODE_SIZE,
	computePreviewLayout,
	getRenderScale,
	type CardBox,
} from '../layout';
import type { WorkflowPreviewConnection, WorkflowPreviewExample } from '../types';

const EDGE_CURVE_OFFSET = NODE_X_SPACING / 2;
const NODE_CORNER_RADIUS = 8;
const TRIGGER_CORNER_RADIUS = 36;

const START_DELAY_MS = 120;
const LAYER_INTERVAL_MS = 200;
const NODE_FADE_MS = 400;
const EDGES_START_GAP_MS = 100;
const EDGE_DRAW_MS = 220;
// Pause between the last line arriving and the build counting as finished.
const BUILD_SETTLE_MS = 200;

const NODE_RUNNING_DURATION_MS = 250;

type AnimationPhase = 'building' | 'idle' | 'input' | 'nodes' | 'output' | 'done';

const props = withDefaults(
	defineProps<{
		example: WorkflowPreviewExample;
		hovered?: boolean;
		reservedHeight?: number;
	}>(),
	{ hovered: false, reservedHeight: undefined },
);

const emit = defineEmits<{ built: [] }>();

const i18n = useI18n();
const reducedMotion = usePreferredReducedMotion();

const previewRef = ref<HTMLElement | null>(null);
const { width: previewWidth } = useElementSize(previewRef);

const inputVisualization = computed(() => props.example.inputVisualization);
const outputVisualizations = computed(() => props.example.outputVisualizations ?? []);

const phase = ref<AnimationPhase>('building');
const revealed = ref(false);
const hovered = computed(() => props.hovered);
const runId = ref(0);
const nodeStates = reactive<Record<string, NodeAnimationState>>({});
const executing = computed(() => phase.value !== 'building' && phase.value !== 'idle');
const outputsActive = computed(() => phase.value === 'output' || phase.value === 'done');

function translate(key: string) {
	return i18n.baseText(key as BaseTextKey);
}

const executionSteps = computed(() => {
	const incomingNodes = new Map<string, Set<string>>();
	for (const node of props.example.nodes) {
		incomingNodes.set(node.id, new Set());
	}
	for (const connection of props.example.connections) {
		incomingNodes.get(connection.target)?.add(connection.source);
	}

	const visitedNodes = new Set<string>();
	const steps: string[][] = [];

	while (visitedNodes.size < props.example.nodes.length) {
		const readyNodes = props.example.nodes
			.filter((node) => !visitedNodes.has(node.id))
			.filter((node) => {
				const dependencies = incomingNodes.get(node.id);
				return !dependencies || [...dependencies].every((nodeId) => visitedNodes.has(nodeId));
			})
			.map((node) => node.id);

		if (readyNodes.length === 0) break;
		steps.push(readyNodes);
		for (const nodeId of readyNodes) visitedNodes.add(nodeId);
	}

	return steps;
});

const stepIndexByNodeId = computed(() => {
	const indexes = new Map<string, number>();
	executionSteps.value.forEach((nodeIds, stepIndex) => {
		for (const nodeId of nodeIds) indexes.set(nodeId, stepIndex);
	});
	return indexes;
});

const lastLayerIndex = computed(() => Math.max(0, executionSteps.value.length - 1));

const nodesRevealedAtMs = computed(() => lastLayerIndex.value * LAYER_INTERVAL_MS + NODE_FADE_MS);

const edgesStartAtMs = computed(() => nodesRevealedAtMs.value + EDGES_START_GAP_MS);

const buildDurationMs = computed(() => {
	const edgeLayerCount = props.example.connections.length > 0 ? lastLayerIndex.value : 0;
	return edgesStartAtMs.value + edgeLayerCount * EDGE_DRAW_MS + BUILD_SETTLE_MS;
});

function getNodeRevealDelayMs(nodeId: string) {
	return (stepIndexByNodeId.value.get(nodeId) ?? 0) * LAYER_INTERVAL_MS;
}

function getNodeRevealStyle(nodeId: string) {
	return { '--reveal-delay': `${getNodeRevealDelayMs(nodeId)}ms` };
}

function getEdgeRevealStyle(connection: WorkflowPreviewConnection) {
	const sourceLayerIndex = stepIndexByNodeId.value.get(connection.source) ?? 0;
	return {
		'--reveal-delay': `${edgesStartAtMs.value + sourceLayerIndex * EDGE_DRAW_MS}ms`,
	};
}

const layout = computed(() => computePreviewLayout(props.example));
const triggerNodeIds = computed(() => layout.value.triggerNodeIds);
const graphBounds = computed(() => layout.value.graphBounds);
const inputCardBox = computed(() => layout.value.inputCardBox);
const outputCardBoxes = computed(() => layout.value.outputCardBoxes);
const stageBounds = computed(() => layout.value.stageBounds);

const previewNodes = computed((): PreviewWorkflowNode[] =>
	props.example.nodes.map((node) => ({
		id: node.id,
		label: translate(node.labelKey),
		...getPreviewIcon(node.icon),
		position: { x: node.position.x, y: node.position.y + NODE_LABEL_OFFSET },
	})),
);

const graphViewBox = computed(() => {
	const { minX, minY, width, height } = graphBounds.value;
	return `${minX} ${minY} ${width} ${height}`;
});

function getCardIcon(iconKey: string) {
	const icon = getPreviewFileIcon(iconKey);
	return { src: icon?.src, lightInvert: icon?.lightInvert ?? false };
}

const renderScale = computed(() => getRenderScale(stageBounds.value.width, previewWidth.value));

const stageHeight = computed(() => stageBounds.value.height * renderScale.value);

const stageWrapperStyle = computed(() => ({
	width: `${stageBounds.value.width * renderScale.value}px`,
	height: `${Math.max(stageHeight.value, props.reservedHeight ?? 0)}px`,
}));

const stageStyle = computed(() => ({
	width: `${stageBounds.value.width}px`,
	height: `${stageBounds.value.height}px`,
	top: `${Math.max(0, ((props.reservedHeight ?? 0) - stageHeight.value) / 2)}px`,
	transform: `scale(${renderScale.value})`,
	'--preview-edge-draw-duration': `${EDGE_DRAW_MS}ms`,
	'--preview-node-fade-duration': `${NODE_FADE_MS}ms`,
}));

const graphStyle = computed(() => ({
	left: `${-stageBounds.value.left}px`,
	top: `${-stageBounds.value.top}px`,
	width: `${graphBounds.value.width}px`,
	height: `${graphBounds.value.height}px`,
}));

function getCardSlotStyle(box: CardBox) {
	return {
		left: `${box.left - stageBounds.value.left}px`,
		top: `${box.top - stageBounds.value.top}px`,
		width: `${CARD_NATIVE_WIDTH}px`,
		transform: `scale(${CARD_SCALE})`,
	};
}

const inputSlotStyle = computed(() =>
	inputCardBox.value ? getCardSlotStyle(inputCardBox.value) : {},
);
const outputSlotStyles = computed(() => outputCardBoxes.value.map(getCardSlotStyle));

function getEdgePath(connection: WorkflowPreviewConnection): string {
	const sourceNode = props.example.nodes.find((node) => node.id === connection.source);
	const targetNode = props.example.nodes.find((node) => node.id === connection.target);
	if (!sourceNode || !targetNode) return '';

	const sourceX = sourceNode.position.x + NODE_HALF_SIZE;
	const sourceY = sourceNode.position.y;
	const targetX = targetNode.position.x - NODE_HALF_SIZE;
	const targetY = targetNode.position.y;
	const curveOffset = Math.min(EDGE_CURVE_OFFSET, Math.abs(targetX - sourceX) * 0.4);

	return `M ${sourceX} ${sourceY} C ${sourceX + curveOffset} ${sourceY}, ${targetX - curveOffset} ${targetY}, ${targetX} ${targetY}`;
}

function getNodeOutlinePath(node: WorkflowPreviewExample['nodes'][number]): string {
	const left = node.position.x - NODE_HALF_SIZE;
	const top = node.position.y - NODE_HALF_SIZE;
	const right = left + NODE_SIZE;
	const bottom = top + NODE_SIZE;
	const leftRadius = triggerNodeIds.value.has(node.id) ? TRIGGER_CORNER_RADIUS : NODE_CORNER_RADIUS;
	const rightRadius = NODE_CORNER_RADIUS;

	return [
		`M ${left + leftRadius} ${top}`,
		`H ${right - rightRadius}`,
		`A ${rightRadius} ${rightRadius} 0 0 1 ${right} ${top + rightRadius}`,
		`V ${bottom - rightRadius}`,
		`A ${rightRadius} ${rightRadius} 0 0 1 ${right - rightRadius} ${bottom}`,
		`H ${left + leftRadius}`,
		`A ${leftRadius} ${leftRadius} 0 0 1 ${left} ${bottom - leftRadius}`,
		`V ${top + leftRadius}`,
		`A ${leftRadius} ${leftRadius} 0 0 1 ${left + leftRadius} ${top}`,
		'Z',
	].join(' ');
}

function isEdgeSuccess(connection: WorkflowPreviewConnection) {
	return nodeStates[connection.source] === 'success';
}

function getNodeState(nodeId: string): NodeAnimationState {
	return nodeStates[nodeId] ?? 'idle';
}

const ICON_CYCLE_INITIAL_DELAY_MS = 500;
const ICON_CYCLE_INTERVAL_MS = 1400;

const iconCycle = computed(() => props.example.iconCycle);
const iconCycleIndex = ref(0);
const iconCycleActive = ref(false);
let iconCycleStartTimer: ReturnType<typeof setTimeout> | null = null;
let iconCycleInterval: ReturnType<typeof setInterval> | null = null;

const iconCycleNodeIds = computed(() => new Set(iconCycle.value?.nodeIds ?? []));
const iconCycleCurrentIcon = computed(() => {
	const key = iconCycle.value?.icons[iconCycleIndex.value];
	return key ? getPreviewFileIcon(key) : undefined;
});

function advanceIconCycle() {
	const count = iconCycle.value?.icons.length ?? 0;
	if (count > 0) iconCycleIndex.value = (iconCycleIndex.value + 1) % count;
}

function startIconCycle() {
	if (!iconCycle.value || iconCycle.value.icons.length < 2 || iconCycleActive.value) return;
	iconCycleActive.value = true;
	iconCycleIndex.value = 0;
	iconCycleStartTimer = setTimeout(() => {
		advanceIconCycle();
		iconCycleInterval = setInterval(advanceIconCycle, ICON_CYCLE_INTERVAL_MS);
	}, ICON_CYCLE_INITIAL_DELAY_MS);
}

function stopIconCycle() {
	iconCycleActive.value = false;
	iconCycleIndex.value = 0;
	if (iconCycleStartTimer) clearTimeout(iconCycleStartTimer);
	if (iconCycleInterval) clearInterval(iconCycleInterval);
	iconCycleStartTimer = null;
	iconCycleInterval = null;
}

function getNodeIconOverride(nodeId: string) {
	return iconCycleActive.value && iconCycleNodeIds.value.has(nodeId)
		? iconCycleCurrentIcon.value
		: undefined;
}

function getCardIconOverride(iconKey: string) {
	return iconCycleActive.value && iconCycle.value?.icons.includes(iconKey)
		? iconCycleCurrentIcon.value?.src
		: undefined;
}

let animationTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = false;
let completedOutputs = 0;

async function delay(ms: number) {
	return await new Promise<void>((resolve) => {
		animationTimer = setTimeout(resolve, ms);
	});
}

function clearTimer() {
	if (animationTimer) clearTimeout(animationTimer);
	animationTimer = null;
}

function setAllNodeStates(state: NodeAnimationState) {
	for (const node of props.example.nodes) {
		nodeStates[node.id] = state;
	}
}

async function runBuildAnimation() {
	await delay(START_DELAY_MS);
	if (stopped) return;
	revealed.value = true;

	await delay(buildDurationMs.value);
	if (stopped) return;

	phase.value = 'idle';
	emit('built');
	if (hovered.value) startExecution();
}

function startExecution() {
	runId.value++;
	completedOutputs = 0;

	if (reducedMotion.value === 'reduce') {
		setAllNodeStates('success');
		phase.value = 'done';
		return;
	}

	if (inputVisualization.value) {
		phase.value = 'input';
	} else {
		void runNodeAnimation();
	}
}

function resetExecution() {
	clearTimer();
	stopIconCycle();
	setAllNodeStates('idle');
	phase.value = 'idle';
}

async function runNodeAnimation() {
	phase.value = 'nodes';
	for (const step of executionSteps.value) {
		for (const nodeId of step) nodeStates[nodeId] = 'running';
		await delay(NODE_RUNNING_DURATION_MS);
		if (stopped || phase.value !== 'nodes') return;
		for (const nodeId of step) nodeStates[nodeId] = 'success';
	}
	phase.value = outputVisualizations.value.length > 0 ? 'output' : 'done';
}

function handleInputComplete() {
	if (phase.value !== 'input') return;
	void runNodeAnimation();
}

function handleOutputComplete() {
	completedOutputs++;
	if (phase.value === 'output' && completedOutputs >= outputVisualizations.value.length) {
		phase.value = 'done';
	}
}

watch(hovered, (isHovered) => {
	if (isHovered) {
		if (phase.value === 'idle') startExecution();
	} else if (phase.value !== 'building') {
		resetExecution();
	}
});

watch(phase, (newPhase) => {
	if (newPhase === 'done') startIconCycle();
});

onMounted(() => {
	setAllNodeStates('idle');

	if (reducedMotion.value === 'reduce') {
		revealed.value = true;
		phase.value = 'idle';
		emit('built');
		return;
	}

	void runBuildAnimation();
});

onUnmounted(() => {
	stopped = true;
	clearTimer();
	stopIconCycle();
});
</script>

<template>
	<section
		ref="previewRef"
		:class="$style.preview"
		:data-example-id="props.example.id"
		:data-phase="phase"
		data-test-id="workflow-preview-example"
	>
		<div :class="$style.stageWrapper" :style="stageWrapperStyle">
			<div
				:class="[
					$style.stage,
					revealed && $style.revealed,
					phase !== 'building' && $style.built,
					hovered && $style.hovered,
				]"
				:style="stageStyle"
				data-test-id="workflow-preview-stage"
			>
				<div :class="$style.graph" :style="graphStyle" data-test-id="workflow-preview-graph">
					<svg :class="$style.edges" :viewBox="graphViewBox" aria-hidden="true">
						<path
							v-for="connection in props.example.connections"
							:key="`${connection.source}-${connection.target}`"
							pathLength="1"
							:d="getEdgePath(connection)"
							:style="getEdgeRevealStyle(connection)"
							:class="[$style.edge, isEdgeSuccess(connection) && $style.edgeSuccess]"
							:data-active="isEdgeSuccess(connection)"
							:data-test-id="`workflow-preview-connection-${connection.source}-${connection.target}`"
						/>
						<path
							v-for="node in props.example.nodes"
							:key="node.id"
							:d="getNodeOutlinePath(node)"
							:style="getNodeRevealStyle(node.id)"
							:class="[$style.nodeReveal, $style.nodeOutline]"
							:data-test-id="`workflow-preview-outline-${node.id}`"
						/>
					</svg>

					<div :class="$style.nodes">
						<WorkflowPreviewNode
							v-for="node in previewNodes"
							:key="node.id"
							:node="node"
							:state="getNodeState(node.id)"
							:trigger="triggerNodeIds.has(node.id)"
							:icon-override="getNodeIconOverride(node.id)"
							:offset-x="graphBounds.minX"
							:offset-y="graphBounds.minY"
							:class="$style.nodeReveal"
							:style="getNodeRevealStyle(node.id)"
							:data-state="getNodeState(node.id)"
							:data-test-id="`workflow-preview-node-${node.id}`"
						>
							<template #label>
								<span :class="$style.nodeLabel">
									<span :class="$style.nodeLabelText">{{ node.label }}</span>
									<span :class="$style.nodeLabelPlaceholder" aria-hidden="true" />
								</span>
							</template>
						</WorkflowPreviewNode>
					</div>
				</div>

				<div
					v-if="inputVisualization"
					:class="[$style.cardSlot, !executing && $style.cardSlotHidden]"
					:style="inputSlotStyle"
					data-test-id="workflow-preview-input"
				>
					<SalesforceCardVisualization
						:key="runId"
						:active="executing"
						slide-from="left"
						:icon="getCardIcon(inputVisualization.icon).src"
						:icon-override="getCardIconOverride(inputVisualization.icon)"
						:light-invert="getCardIcon(inputVisualization.icon).lightInvert"
						:title="translate(inputVisualization.titleKey)"
						:subtitle="translate(inputVisualization.subtitleKey)"
						@complete="handleInputComplete"
					/>
				</div>

				<div
					v-for="(output, index) in outputVisualizations"
					:key="`${output.targetNodeId}-${index}`"
					:class="[$style.cardSlot, !executing && $style.cardSlotHidden]"
					:style="outputSlotStyles[index]"
					:data-test-id="`workflow-preview-output-${output.targetNodeId}`"
				>
					<InvoiceSpreadsheetVisualization
						v-if="output.type === 'invoice-spreadsheet'"
						:key="runId"
						:active="outputsActive"
						@complete="handleOutputComplete"
					/>
					<SlackMessageVisualization
						v-else-if="output.type === 'slack-message'"
						:key="runId"
						:active="outputsActive"
						:sender="translate(output.senderKey)"
						:message="translate(output.messageKey)"
						@complete="handleOutputComplete"
					/>
					<SalesforceCardVisualization
						v-else
						:key="runId"
						:active="outputsActive"
						:icon="getCardIcon(output.icon).src"
						:icon-override="getCardIconOverride(output.icon)"
						:light-invert="getCardIcon(output.icon).lightInvert"
						:title="translate(output.titleKey)"
						:subtitle="translate(output.subtitleKey)"
						@complete="handleOutputComplete"
					/>
				</div>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.preview {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;
	width: 100%;
}

.stageWrapper {
	position: relative;
}

.stage {
	position: absolute;
	top: 0;
	left: 0;
	transform-origin: top left;
	--preview-line-color: light-dark(oklch(0.84 0 0), oklch(0.42 0 0));

	--node--color--background: transparent;
	--node--border-color: transparent;

	filter: grayscale(1);
	transition: filter var(--duration--base) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.hovered {
	--node--color--background: initial;
	--node--border-color: initial;

	filter: none;
}

.graph {
	position: absolute;
}

.edges,
.nodes {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

.edges {
	overflow: visible;
}

.edge {
	fill: none;
	stroke: var(--preview-line-color);
	stroke-width: 2;
	stroke-linecap: square;
	stroke-dasharray: 1;
	stroke-dashoffset: 1;
	opacity: 0;
	transition:
		stroke-dashoffset var(--preview-edge-draw-duration) linear var(--reveal-delay, 0ms),
		opacity calc(var(--preview-edge-draw-duration) / 2) var(--easing--ease-out)
			var(--reveal-delay, 0ms);

	@include motion.reduced-motion;
}

.revealed .edge {
	stroke-dashoffset: 0;
	opacity: 1;
}

.edgeSuccess {
	stroke: var(--color--success);
}

.nodeReveal {
	opacity: 0;
	transition: opacity var(--preview-node-fade-duration) var(--easing--ease-out-quint)
		var(--reveal-delay, 0ms);

	@include motion.reduced-motion;
}

.revealed .nodeReveal {
	opacity: 1;
}

.nodeOutline {
	fill: none;
	stroke: var(--preview-line-color);
	stroke-width: 2;
	stroke-linecap: round;
	stroke-dasharray: 6 5;
}

.built .nodeOutline {
	transition: opacity 0.2s ease;
}

.hovered .nodeOutline {
	opacity: 0;
}

.nodeLabel {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: var(--spacing--2xs);
	max-width: 192px;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	color: var(--color--text--base);
}

.nodeLabelText {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	text-align: center;
	opacity: 0;
	transition: opacity var(--duration--base) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.nodeLabelPlaceholder {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 64px;
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--preview-line-color);
	transform: translate(-50%, -50%);
	transition: opacity var(--duration--base) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.hovered .nodeLabelText {
	opacity: 1;
}

.hovered .nodeLabelPlaceholder {
	opacity: 0;
}

.cardSlot {
	position: absolute;
	transform-origin: top left;
	pointer-events: none;
	transition: opacity var(--duration--base) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.cardSlotHidden {
	opacity: 0;
}
</style>
