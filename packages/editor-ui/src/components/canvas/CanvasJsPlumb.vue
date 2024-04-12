<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import type { BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import { ready, newInstance } from '@jsplumb/browser-ui';
import type {
	CanvasConnection,
	CanvasConnectionPort,
	CanvasElement,
	CanvasConnectionPort,
	CanvasPlugin,
} from '@/types';
import { canvasPan, canvasZoom } from '@/components/canvas/plugins';

const props = withDefaults(
	defineProps<{
		elements: CanvasElement[];
		connections: CanvasConnection[];
		plugins: CanvasPlugin[];
	}>(),
	{
		elements: () => [],
		connections: () => [],
		plugins: () => [canvasPan, canvasZoom],
	},
);

const instance = ref<BrowserJsPlumbInstance | undefined>();

const canvasRef = ref<HTMLDivElement | undefined>();
const elementRefs = ref<HTMLElement[]>([]);
const elementRefsById = computed(() =>
	elementRefs.value.reduce<Record<string, HTMLElement>>((acc, elementRef) => {
		acc[elementRef.id] = elementRef as HTMLElement;
		return acc;
	}, {}),
);

onMounted(() => {
	ready(() => {
		if (!canvasRef.value) {
			return;
		}

		instance.value = newInstance({
			container: canvasRef.value,
		});

		render();
	});
});

function render() {
	instance.value?.setSuspendDrawing(true);

	renderElements();
	renderConnections();

	registerPlugins();

	instance.value?.setSuspendDrawing(false, true);
}

function renderElements() {
	props.elements.forEach((element) => {
		const elementRef = getElementById(element.id);
		if (!elementRef) {
			return;
		}

		setElementPosition(element.id, element.position);

		element.inputs.forEach((input) => {
			addElementInputEndpoint(element.id, input);
		});

		element.outputs.forEach((output) => {
			addElementOutputEndpoint(element.id, output);
		});
	});
}

function renderConnections() {
	props.connections.forEach((connection) => {
		addConnection(connection);
	});
}

function registerPlugins() {
	props.plugins.forEach((plugin) => {
		if (!instance.value) {
			return;
		}

		plugin({
			instance: instance.value,
		});
	});
}

function getElementById(id: string) {
	return elementRefsById.value[`element-${id}`];
}

function getInputEndpoint(endpoint: CanvasConnectionPort) {
	return instance.value?.getEndpoint(`${endpoint.id}/inputs/${endpoint.type}/${endpoint.index}`);
}

function getOutputEndpoint(endpoint: CanvasConnectionPort) {
	return instance.value?.getEndpoint(`${endpoint.id}/outputs/${endpoint.type}/${endpoint.index}`);
}

function setElementPosition(id: string, position: [number, number]) {
	const elementRef = getElementById(id);
	if (!elementRef) {
		return;
	}

	elementRef.style.left = `${position[0]}px`;
	elementRef.style.top = `${position[1]}px`;
}

function addElementInputEndpoint(id: string, endpoint: CanvasConnectionPort) {
	const elementRef = getElementById(id);
	if (!elementRef) {
		return;
	}

	instance.value?.addEndpoint(elementRef, {
		uuid: `${id}/inputs/${endpoint.type}/${endpoint.index}`,
		endpoint: 'Dot',
		target: true,
		maxConnections: -1,
		anchor: 'Left', // @TODO Adjust anchor based on endpoint name
	});
}

function addElementOutputEndpoint(id: string, endpoint: CanvasConnectionPort) {
	const elementRef = getElementById(id);
	if (!elementRef) {
		return;
	}

	instance.value?.addEndpoint(elementRef, {
		uuid: `${id}/outputs/${endpoint.type}/${endpoint.index}`,
		endpoint: 'Rectangle',
		source: true,
		maxConnections: -1,
		anchor: 'Right', // @TODO Adjust anchor based on endpoint name
	});
}

function addConnection(connection: CanvasConnection) {
	console.log(connection);
	const sourceElementRef = getElementById(connection.source.id);
	const targetElementRef = getElementById(connection.target.id);
	if (!sourceElementRef || !targetElementRef) {
		return;
	}

	const sourceEndpoint = getOutputEndpoint(connection.source);
	const targetEndpoint = getInputEndpoint(connection.target);

	instance.value?.connect({
		source: sourceEndpoint,
		target: targetEndpoint,
		anchor: 'Continuous',
		connector: 'Bezier',
		overlays: [
			{ type: 'Label', options: { label: 'X Items', location: 0.5 } },
			{ type: 'Arrow', options: { location: 1 } },
		],
	});
}
</script>

<template>
	<div class="canvas-wrapper">
		<div class="canvas-anchor">
			<div ref="canvasRef" class="canvas">
				<template v-for="element in props.elements" :key="element.id">
					<div
						v-if="element.type === 'node'"
						:id="`element-${element.id}`"
						ref="elementRefs"
						class="element box"
					/>
				</template>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.canvas-wrapper {
	width: 100%;
	height: 100%;
	position: relative;
	display: block;
}

.canvas-anchor {
	position: fixed;
}

.canvas {
	position: relative;
	width: 100%;
	height: 100%;
	transform-origin: 0 0;
	z-index: -1;
}

.element {
	position: absolute;
}

.box {
	width: 100px;
	height: 100px;
	background: gray;
}
</style>
