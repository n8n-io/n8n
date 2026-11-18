<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import { Handle, Panel, Position, useVueFlow, VueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import CanvasConstellation from '../CanvasConstellation.vue';
import { createConstellation } from '../graph';

const props = defineProps<{ workflow: unknown }>();
const graph = computed(() => createConstellation(props.workflow));
const { viewport, dimensions, getNodes, fitView, zoomTo, onNodesInitialized } =
	useVueFlow('constellation-demo');
const nodes = computed(() =>
	graph.value.stars.map((star, index) => ({
		id: String(index),
		type: 'workflow',
		position: { x: star.x, y: star.y },
		data: { name: star.name, type: 'demo-node', index },
		draggable: false,
	})),
);
const edges = computed(() =>
	graph.value.connections.map((edge, index) => ({
		id: String(index),
		source: String(edge.from),
		target: String(edge.to),
		type: 'smoothstep',
		style: { stroke: '#727b8e', strokeWidth: 2 },
	})),
);
onNodesInitialized(() => {
	void fitView({ padding: 0.2, maxZoom: 0.8 });
});
watch(
	() => props.workflow,
	async () => {
		await nextTick();
		await fitView({ padding: 0.2, maxZoom: 0.8 });
	},
);
function zoom(factor: number) {
	void zoomTo(Math.max(0.08, Math.min(1.5, viewport.value.zoom * factor)));
}
</script>

<template>
	<VueFlow
		id="constellation-demo"
		:nodes="nodes"
		:edges="edges"
		:min-zoom="0.08"
		:max-zoom="1.5"
		:nodes-connectable="false"
		:elements-selectable="false"
		:delete-key-code="null"
		class="zoom-demo"
		data-testid="constellation-demo-canvas"
	>
		<template #node-workflow="{ data }">
			<div class="zoom-demo-node">
				<Handle type="target" :position="Position.Left" />
				<span
					class="zoom-demo-icon"
					:style="{ color: ['#f6b773', '#7bb8ff', '#b6d89c', '#bd9bea'][data.index % 4] }"
					>{{
						['ϟ', '↗', '⑂', '◇', '⑂', '▤', '▤', '⋈', '✉', '◉', '≡', '⌘', '◈'][data.index % 13]
					}}</span
				>
				<span class="zoom-demo-name">{{ data.name }}</span>
				<Handle type="source" :position="Position.Right" />
			</div>
		</template>
		<CanvasConstellation
			:nodes="getNodes"
			:edges="edges"
			:viewport="viewport"
			:dimensions="dimensions"
		/>
		<Panel position="bottom-left" class="zoom-demo-controls">
			<button
				type="button"
				aria-label="Zoom out"
				data-testid="constellation-zoom-out"
				@click="zoom(0.75)"
			>
				−
			</button>
			<output data-testid="constellation-zoom-level">{{ Math.round(viewport.zoom * 100) }}%</output>
			<button
				type="button"
				aria-label="Zoom in"
				data-testid="constellation-zoom-in"
				@click="zoom(1 / 0.75)"
			>
				+
			</button>
			<button type="button" @click="fitView({ padding: 0.2, maxZoom: 0.8 })">Fit workflow</button>
		</Panel>
		<Panel position="bottom-right" class="zoom-demo-hint">{{
			viewport.zoom < 0.45
				? 'Zoom in to return to your workflow'
				: 'Zoom out to discover your constellation'
		}}</Panel>
	</VueFlow>
</template>

<style scoped>
.zoom-demo {
	height: clamp(380px, 49vh, 600px);
}
.zoom-demo-node {
	/* Match a regular workflow node body. The label stays outside its geometry. */
	width: var(--spacing--2xl);
	height: var(--spacing--2xl);
	background: #242730;
	border: 1px solid #656d80;
	border-radius: var(--radius--xs);
	display: grid;
	place-items: center;
}
.zoom-demo-icon {
	font-size: var(--font-size--2xl);
}
.zoom-demo-name {
	position: absolute;
	top: calc(100% + var(--spacing--2xs));
	left: 50%;
	transform: translateX(-50%);
	white-space: nowrap;
	font-size: var(--font-size--2xs);
	color: #d4d7df;
}
.zoom-demo-controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	background: #1b2232;
	padding: var(--spacing--2xs);
	border: 1px solid #3b4860;
	border-radius: var(--radius--xs);
	color: #d4dff2;
	font-size: var(--font-size--2xs);
}
.zoom-demo-controls button {
	background: transparent;
	border: 0;
	color: inherit;
	cursor: pointer;
	padding: var(--spacing--2xs);
}
.zoom-demo-controls output {
	min-width: 4ch;
	text-align: center;
	font-variant-numeric: tabular-nums;
}
.zoom-demo-hint {
	color: #a4b3ce;
	font-size: var(--font-size--2xs);
	padding: var(--spacing--xs);
	pointer-events: none;
}
@media (max-width: 700px) {
	.zoom-demo-hint {
		display: none;
	}
}
</style>
