<script setup lang="ts">
import {
	computed,
	inject,
	nextTick,
	onMounted,
	ref,
	unref,
	useSlots,
	watch,
	type VNode,
} from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { GenerativeUiNodesKey } from '../nodeLookup';
import {
	buildFlowModel,
	flattenFlowSlot,
	flowLayoutIntents,
	resolveFlowViewport,
	type FlowConnectionInput,
	type FlowLayoutIntent,
	type FlowNodeInput,
} from './flowCanvasLayout';
import { useGenerativeUiFlowGraph } from '../flowGraph';
import FlowConnection from './FlowConnection.vue';
import FlowNode from './FlowNode.vue';

const EDGE_CURVE = 40;

const props = defineProps<{
	title?: string | null;
	description?: string | null;
	layout?: FlowLayoutIntent;
}>();

const slots = useSlots();
const injectedNodes = inject(GenerativeUiNodesKey, []);
const connections = useGenerativeUiFlowGraph();

const canvasRef = ref<HTMLElement | null>(null);
const viewportRef = ref<HTMLElement | null>(null);
const nodeElements = new Map<string, HTMLElement>();
const positions = ref<Record<string, { x: number; y: number; width: number; height: number }>>({});
const content = ref({ width: 0, height: 0 });

const canvasWidth = ref(0);
const viewport = computed(() =>
	resolveFlowViewport({ availableWidth: canvasWidth.value, contentWidth: content.value.width }),
);
const isNarrow = computed(() => viewport.value.narrow);
const scale = computed(() => viewport.value.scale);

const intent = computed<FlowLayoutIntent>(() =>
	props.layout && flowLayoutIntents.includes(props.layout) ? props.layout : 'auto',
);

function nodeName(nodeIds: string[]): string | null {
	const available = new Map(unref(injectedNodes).map((node) => [node.id, node.name]));
	const names = nodeIds
		.map((id) => available.get(id))
		.filter((name): name is string => typeof name === 'string' && name.length > 0);
	return names.length > 0 ? names.join(', ') : null;
}

function readNodeInput(vnode: VNode, index: number): FlowNodeInput {
	const raw = (vnode.props ?? {}) as Record<string, unknown>;
	const nodeIds: string[] = [];
	const push = (value: unknown) => {
		if (typeof value === 'string' && value.length > 0 && !nodeIds.includes(value)) {
			nodeIds.push(value);
		}
	};
	push(raw.nodeId);
	if (Array.isArray(raw.nodeIds)) for (const id of raw.nodeIds) push(id);

	const explicitLabel = typeof raw.label === 'string' && raw.label.length > 0 ? raw.label : null;
	const label = explicitLabel ?? nodeName(nodeIds) ?? `Step ${index + 1}`;

	return { key: `flow-node-${index}`, nodeIds, label };
}

function readConnectionInput(vnode: VNode): FlowConnectionInput | null {
	const raw = (vnode.props ?? {}) as Record<string, unknown>;
	if (typeof raw.fromNodeId !== 'string' || typeof raw.toNodeId !== 'string') return null;
	return {
		fromNodeId: raw.fromNodeId,
		toNodeId: raw.toNodeId,
		type: typeof raw.type === 'string' ? raw.type : null,
		outputIndex: typeof raw.outputIndex === 'number' ? raw.outputIndex : null,
		inputIndex: typeof raw.inputIndex === 'number' ? raw.inputIndex : null,
		label: typeof raw.label === 'string' ? raw.label : null,
	};
}

const nodeEntries = computed(() => {
	const flattened = flattenFlowSlot(slots.default?.());
	const entries: Array<{ key: string; vnode: VNode; input: FlowNodeInput }> = [];
	let index = 0;
	for (const vnode of flattened) {
		if (vnode.type !== FlowNode) continue;
		const input = readNodeInput(vnode, index);
		entries.push({ key: input.key, vnode, input });
		index += 1;
	}
	return entries;
});

const explicitConnections = computed(() => {
	const flattened = flattenFlowSlot(slots.default?.());
	const result: FlowConnectionInput[] = [];
	for (const vnode of flattened) {
		if (vnode.type !== FlowConnection) continue;
		const input = readConnectionInput(vnode);
		if (input) result.push(input);
	}
	return result;
});

const model = computed(() =>
	buildFlowModel(
		nodeEntries.value.map((entry) => entry.input),
		connections.value,
		explicitConnections.value,
		intent.value,
	),
);

const placementByKey = computed(
	() => new Map(model.value.layout.placements.map((placement) => [placement.key, placement])),
);

const orderedNodes = computed(() => {
	const placements = placementByKey.value;
	return nodeEntries.value.slice().sort((a, b) => {
		const first = placements.get(a.key);
		const second = placements.get(b.key);
		return (first?.column ?? 0) - (second?.column ?? 0) || (first?.row ?? 0) - (second?.row ?? 0);
	});
});

const gridStyle = computed(() => ({
	gridTemplateColumns: `repeat(${Math.max(1, model.value.layout.columns)}, minmax(var(--flow-canvas--column-width), 1fr))`,
}));

const viewportStyle = computed(() => {
	if (isNarrow.value) return undefined;
	if (scale.value >= 1) return gridStyle.value;
	return { ...gridStyle.value, transform: `scale(${scale.value})` };
});

const frameStyle = computed(() => {
	if (isNarrow.value || scale.value >= 1 || content.value.height === 0) return undefined;
	return { height: `${Math.round(content.value.height * scale.value)}px` };
});

const edgeSurfaceStyle = computed(() => {
	if (content.value.width === 0) return undefined;
	return { width: `${content.value.width}px`, height: `${content.value.height}px` };
});

function cellStyle(key: string) {
	if (isNarrow.value) return undefined;
	const placement = placementByKey.value.get(key);
	if (!placement) return undefined;
	return {
		gridColumn: `${placement.column + 1}`,
		gridRow: `${placement.row + 1}`,
	};
}

function setNodeRef(key: string, element: unknown) {
	if (element instanceof HTMLElement) nodeElements.set(key, element);
	else nodeElements.delete(key);
}

function measure() {
	canvasWidth.value = canvasRef.value?.clientWidth ?? 0;
	const surface = viewportRef.value;
	content.value = surface
		? { width: surface.scrollWidth, height: surface.scrollHeight }
		: { width: 0, height: 0 };

	const next: Record<string, { x: number; y: number; width: number; height: number }> = {};
	for (const [key, element] of nodeElements) {
		next[key] = {
			x: element.offsetLeft,
			y: element.offsetTop,
			width: element.offsetWidth,
			height: element.offsetHeight,
		};
	}
	positions.value = next;
}

const hasGeometry = computed(() =>
	Object.values(positions.value).some((position) => position.width > 0),
);
const connectorsVisible = computed(() => hasGeometry.value && !isNarrow.value);

const edgePaths = computed(() => {
	if (!connectorsVisible.value) return [];
	const measured = positions.value;
	return model.value.edges.flatMap((edge) => {
		const from = measured[edge.fromKey];
		const to = measured[edge.toKey];
		if (!from || !to || from.width === 0 || to.width === 0) return [];

		const startX = from.x + from.width;
		const startY = from.y + from.height / 2;
		const endX = to.x;
		const endY = to.y + to.height / 2;
		const curve = Math.min(EDGE_CURVE, Math.abs(endX - startX) * 0.5);

		return [
			{
				id: `${edge.fromKey}-${edge.toKey}`,
				d: `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`,
			},
		];
	});
});

const connectionList = computed(() => model.value.connectionList);
const hasConnections = computed(() => connectionList.value.length > 0);

watch(model, () => {
	void nextTick(measure);
});

useResizeObserver(canvasRef, () => measure());
useResizeObserver(viewportRef, () => measure());

onMounted(() => {
	void nextTick(measure);
});
</script>

<template>
	<section
		:class="$style.canvas"
		role="group"
		aria-label="Workflow flow"
		data-test-id="flow-canvas"
	>
		<header v-if="title || description" :class="$style.header">
			<h3 v-if="title" :class="$style.title">{{ title }}</h3>
			<p v-if="description" :class="$style.description">{{ description }}</p>
		</header>

		<div ref="canvasRef" :class="$style.frame" :style="frameStyle" data-test-id="flow-canvas-frame">
			<div
				ref="viewportRef"
				:class="[$style.viewport, isNarrow ? $style.viewportNarrow : undefined]"
				:style="viewportStyle"
				data-test-id="flow-canvas-viewport"
			>
				<svg
					v-if="connectorsVisible"
					:class="$style.edges"
					:style="edgeSurfaceStyle"
					aria-hidden="true"
					data-test-id="flow-canvas-edges"
				>
					<path v-for="edge in edgePaths" :key="edge.id" :d="edge.d" :class="$style.edge" />
				</svg>
				<div
					v-for="entry in orderedNodes"
					:key="entry.key"
					:ref="(element) => setNodeRef(entry.key, element)"
					:class="$style.cell"
					:style="cellStyle(entry.key)"
				>
					<component :is="entry.vnode" />
				</div>
			</div>
		</div>

		<ul
			:class="[$style.connectionList, connectorsVisible ? $style.srOnly : undefined]"
			data-test-id="flow-connection-list"
		>
			<li v-if="!hasConnections" :class="$style.connectionEmpty" data-test-id="flow-connection">
				No connections between these steps.
			</li>
			<li
				v-for="(connection, index) in connectionList"
				:key="`${connection.fromKey}-${connection.toKey}-${index}`"
				:class="$style.connection"
				data-test-id="flow-connection"
			>
				<span>{{ connection.fromLabel }} → {{ connection.toLabel }}</span>
				<span v-if="connection.label" :class="$style.connectionLabel">{{ connection.label }}</span>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
.canvas {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.title {
	margin: 0;
	color: var(--generative-accent, var(--text-color));
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
}

.description {
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}

.frame {
	position: relative;
	min-width: 0;
	overflow: hidden;
}

.viewport {
	--flow-canvas--column-width: calc(var(--spacing--5xl) * 1.5);

	position: relative;
	display: grid;
	grid-auto-rows: min-content;
	gap: var(--spacing--lg) var(--spacing--2xl);
	align-items: start;
	min-width: 0;
	transform-origin: top left;
}

.viewportNarrow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	transform: none;
}

.cell {
	min-width: 0;
}

.edges {
	position: absolute;
	top: 0;
	left: 0;
	pointer-events: none;
}

.edge {
	fill: none;
	stroke: var(--border-color--strong);
	stroke-width: var(--focus--border-width);
	stroke-linecap: round;
}

.connectionList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.connection {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
}

.connectionLabel {
	color: var(--text-color--subtler);
	font-weight: var(--font-weight--bold);
}

.connectionEmpty {
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
}

.srOnly {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}
</style>
