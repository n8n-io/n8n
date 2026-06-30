<script lang="ts" setup>
import { computed, reactive, ref, onMounted, onUnmounted, watch } from 'vue';
import { useElementSize } from '@vueuse/core';
import type {
	PreviewWorkflow,
	PreviewWorkflowConnection,
} from '@/experiments/instanceAiWorkflowPreviewSuggestions/workflows/types';
import WorkflowPreviewNode from '@/experiments/instanceAiWorkflowPreviewSuggestions/components/WorkflowPreviewNode.vue';

const NODE_HALF_WIDTH = 48;
const EDGE_CURVE_OFFSET = 60;
const PADDING = 80;
const CANVAS_HEIGHT = 420;
const NODE_LABEL_OFFSET = 13;
const NODE_RUNNING_DURATION_MS = 500;
// The chat-input typewriter types the example's prompt first; the workflow only
// starts animating after this delay, so one part of the screen moves at a time.
const ANIMATION_START_DELAY_MS = 1100;

// Reference workflow extents (the widest + tallest of the cycled examples,
// node-position span + 2 * PADDING). The preview scales against THESE fixed
// dimensions — not each workflow's own bounds — so nodes stay the exact same
// size as the canvas cycles between examples; each workflow is then centred
// within the panel.
const REFERENCE_WIDTH = 1120;
const REFERENCE_HEIGHT = 460;
const CANVAS_INNER_PADDING = 60;
const MAX_SCALE = 1;

export type NodeAnimationState = 'idle' | 'running' | 'success';

const ICON_DARK = '#383838';
const NEUTRAL_FILLS = new Set([
	'none',
	'white',
	'#fff',
	'#ffffff',
	'#fefefe',
	'currentcolor',
	'transparent',
]);

// Some brand icons in the shared preview data are monochrome SVGs whose only
// fills are white / `none` / currentColor — invisible inside an <img> on the
// light node background (e.g. X, Notion). Recolour just those to a dark fill so
// they render. Icons that already carry a real colour are returned untouched.
function normalizeIconSrc(src: string): string {
	const prefix = 'data:image/svg+xml,';
	if (!src.startsWith(prefix)) return src;
	let svg: string;
	try {
		svg = decodeURIComponent(src.slice(prefix.length));
	} catch {
		return src;
	}
	const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1].toLowerCase().trim());
	const hasRealColor = fills.some((f) => !NEUTRAL_FILLS.has(f));
	if (hasRealColor) return src;
	const recoloured = svg.replace(
		/fill="(white|#fff|#ffffff|#fefefe|none|currentColor|transparent)"/gi,
		`fill="${ICON_DARK}"`,
	);
	return prefix + encodeURIComponent(recoloured);
}

const props = withDefaults(
	defineProps<{
		workflow: PreviewWorkflow;
		animating?: boolean;
	}>(),
	{ animating: true },
);

const canvasRef = ref<HTMLElement | null>(null);
const { width: canvasRenderedWidth, height: canvasRenderedHeight } = useElementSize(canvasRef);

const nodeStates = reactive<Record<string, NodeAnimationState>>({});

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

const triggerNodeIds = computed(() => {
	const targets = new Set(props.workflow.connections.map((c) => c.target));
	return new Set(props.workflow.nodes.filter((n) => !targets.has(n.id)).map((n) => n.id));
});

const displayNodes = computed(() =>
	props.workflow.nodes.map((node) => {
		const icon = node.icon;
		if (icon.type !== 'file' || !icon.src) return node;
		const src = normalizeIconSrc(icon.src);
		return src === icon.src ? node : { ...node, icon: { ...icon, src } };
	}),
);

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

async function runAnimation() {
	stopped = false;
	resetStates();
	await sleep(ANIMATION_START_DELAY_MS);
	if (stopped) return;
	for (const step of executionSteps.value) {
		if (stopped) return;
		for (const id of step) nodeStates[id] = 'running';
		await sleep(NODE_RUNNING_DURATION_MS);
		if (stopped) return;
		for (const id of step) nodeStates[id] = 'success';
	}
}

function stopAnimation() {
	stopped = true;
	if (animationTimer) {
		clearTimeout(animationTimer);
		animationTimer = null;
	}
}

watch(
	() => props.animating,
	(val) => {
		if (val) {
			void runAnimation();
		} else {
			stopAnimation();
			resetStates();
		}
	},
);

onMounted(() => {
	resetStates();
	if (props.animating) void runAnimation();
});

onUnmounted(stopAnimation);

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

const effectiveCanvasWidth = computed(() =>
	canvasRenderedWidth.value > 0 ? canvasRenderedWidth.value : CANVAS_WIDTH,
);

const effectiveCanvasHeight = computed(() =>
	canvasRenderedHeight.value > 0 ? canvasRenderedHeight.value : CANVAS_HEIGHT,
);

// Only position/scale once the canvas has actually been measured. The element
// remounts every cycle (`:key="activeIndex"`), so scaling against the 1600px
// fallback before ResizeObserver fires would flash an oversized workflow.
const isMeasured = computed(() => canvasRenderedWidth.value > 0 && canvasRenderedHeight.value > 0);

const scale = computed(() => {
	const availableWidth = effectiveCanvasWidth.value - 2 * CANVAS_INNER_PADDING;
	const availableHeight = effectiveCanvasHeight.value - 2 * CANVAS_INNER_PADDING;
	const scaleX = availableWidth / REFERENCE_WIDTH;
	const scaleY = availableHeight / REFERENCE_HEIGHT;
	return Math.max(0.2, Math.min(scaleX, scaleY, MAX_SCALE));
});

const canvasMarginLeft = computed(
	() => (effectiveCanvasWidth.value - bounds.value.width * scale.value) / 2,
);
const canvasMarginTop = computed(
	() => (effectiveCanvasHeight.value - bounds.value.height * scale.value) / 2,
);

const containerStyle = computed(() => ({
	width: `${bounds.value.width}px`,
	height: `${bounds.value.height}px`,
	transform: `scale(${scale.value})`,
	transformOrigin: 'top left',
	left: `${canvasMarginLeft.value}px`,
	top: `${canvasMarginTop.value}px`,
}));

const viewBox = computed(
	() => `${bounds.value.minX} ${bounds.value.minY} ${bounds.value.width} ${bounds.value.height}`,
);

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
	<div ref="canvasRef" :class="$style.canvas" data-test-id="instance-ai-preview-canvas">
		<div v-show="isMeasured" :class="$style.viewport" :style="containerStyle">
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
					v-for="node in displayNodes"
					:key="node.id"
					:node="node"
					:state="nodeStates[node.id] ?? 'idle'"
					:trigger="triggerNodeIds.has(node.id)"
					:offset-x="bounds.minX"
					:offset-y="bounds.minY"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.canvas {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
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
</style>
