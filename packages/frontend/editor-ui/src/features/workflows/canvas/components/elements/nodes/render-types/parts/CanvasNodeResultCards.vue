<script lang="ts" setup>
import { N8nIcon, N8nResultCard } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useResultCardIcons } from '@/app/composables/useResultCardIcons';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCanvasNode } from '../../../../../composables/useCanvasNode';
import {
	connectorFor,
	useCanvasResultCardPlacement,
	type ResultCardSize,
} from '../../../../../composables/useCanvasResultCardPlacement';

/**
 * The cards the node declared in its final output, floated beside the node
 * that finished the execution — the "peek" the workflow preview shows beside
 * its last node, with real data. Part of the node element, so it moves and
 * scales with the node, and is joined to it by a connector. The grip at the
 * top lets the stack be dragged anywhere around the node (above it, below it,
 * to the left) so the workflow can keep growing around the card; the offset is
 * remembered per workflow and node. Interaction inside the stack is swallowed
 * so reading the card neither drags the node nor opens it.
 */
const GAP = 28;
const NUDGE = 16;

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const { id: nodeId, resultCards } = useCanvasNode();
const { iconsByCard } = useResultCardIcons(resultCards);

const workflowId = computed(() => workflowsStore.workflowId);
const { offset, isMoved, dragging, transform, startDrag, reset, nudge } =
	useCanvasResultCardPlacement({ workflowId, nodeId, gap: GAP });

const container = ref<HTMLElement | null>(null);
const cardSize = ref<ResultCardSize>({ width: 0, height: 0 });
const nodeSize = ref<ResultCardSize>({ width: 0, height: 0 });
let observer: ResizeObserver | undefined;

function measure() {
	const el = container.value;
	if (!el) return;
	cardSize.value = { width: el.offsetWidth, height: el.offsetHeight };
	const host = el.parentElement;
	nodeSize.value = host
		? { width: host.offsetWidth, height: host.offsetHeight }
		: { width: 0, height: 0 };
}

function observe() {
	observer?.disconnect();
	observer = undefined;
	const el = container.value;
	if (!el || typeof ResizeObserver === 'undefined') {
		measure();
		return;
	}
	observer = new ResizeObserver(measure);
	observer.observe(el);
	if (el.parentElement) observer.observe(el.parentElement);
	measure();
}

onMounted(observe);
watch(container, observe);
onBeforeUnmount(() => observer?.disconnect());

const connector = computed(() => connectorFor(offset.value, GAP, nodeSize.value, cardSize.value));

function onHandleKeydown(event: KeyboardEvent) {
	const step = event.shiftKey ? NUDGE * 4 : NUDGE;
	const moves: Record<string, [number, number]> = {
		ArrowLeft: [-step, 0],
		ArrowRight: [step, 0],
		ArrowUp: [0, -step],
		ArrowDown: [0, step],
	};
	const move = moves[event.key];
	if (move) {
		event.preventDefault();
		nudge(move[0], move[1]);
	} else if (event.key === 'Escape' || event.key === 'Backspace') {
		event.preventDefault();
		reset();
	}
}

function swallow(event: Event) {
	event.stopPropagation();
}
</script>

<template>
	<div
		v-if="resultCards.length"
		ref="container"
		:class="[$style.cards, 'nodrag', 'nowheel', 'nopan', { [$style.dragging]: dragging }]"
		:style="{ transform }"
		:data-moved="isMoved || undefined"
		data-test-id="canvas-node-result-cards"
		@pointerdown="swallow"
		@mousedown="swallow"
		@click="swallow"
		@dblclick="swallow"
		@contextmenu="swallow"
	>
		<svg
			v-if="connector"
			:class="$style.connector"
			aria-hidden="true"
			data-test-id="canvas-node-result-cards-connector"
		>
			<path :d="connector.path" />
			<circle :cx="connector.from.x" :cy="connector.from.y" r="3" />
			<circle :cx="connector.to.x" :cy="connector.to.y" r="3" />
		</svg>

		<div :class="$style.handleRow">
			<div
				:class="$style.handle"
				role="button"
				tabindex="0"
				:aria-label="i18n.baseText('canvas.resultCards.move')"
				:title="i18n.baseText('canvas.resultCards.moveHint')"
				data-test-id="canvas-node-result-cards-handle"
				@pointerdown="startDrag"
				@keydown="onHandleKeydown"
				@dblclick.stop="reset"
			>
				<N8nIcon icon="grip-vertical" :size="12" />
				<span :class="$style.handleLabel">{{ i18n.baseText('canvas.resultCards.label') }}</span>
			</div>
			<button
				v-if="isMoved"
				type="button"
				:class="$style.reset"
				:aria-label="i18n.baseText('canvas.resultCards.reset')"
				:title="i18n.baseText('canvas.resultCards.reset')"
				data-test-id="canvas-node-result-cards-reset"
				@click="reset"
			>
				<N8nIcon icon="undo-2" :size="12" />
			</button>
		</div>

		<N8nResultCard
			v-for="(card, index) in resultCards"
			:key="index"
			:card="card"
			:icons="iconsByCard[index]"
			:class="$style.card"
		/>
	</div>
</template>

<style lang="scss" module>
.cards {
	--canvas-node--result-cards--width: 320px;
	--canvas-node--result-cards--line: var(--color--success);

	position: absolute;
	left: 100%;
	top: 50%;
	width: var(--canvas-node--result-cards--width);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	pointer-events: auto;
	cursor: default;
	// the offset is applied as a transform so the node's own layout never shifts
	will-change: transform;

	&.dragging {
		cursor: grabbing;
		user-select: none;

		.card {
			pointer-events: none;
		}
	}
}

.connector {
	position: absolute;
	left: 0;
	top: 0;
	width: 1px;
	height: 1px;
	overflow: visible;
	pointer-events: none;
	z-index: -1;

	path {
		fill: none;
		stroke: var(--canvas-node--result-cards--line);
		stroke-width: 2;
		stroke-linecap: round;
		opacity: 0.8;
	}

	circle {
		fill: var(--canvas-node--result-cards--line);
		opacity: 0.9;
	}
}

.handleRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--3xs);
	min-height: 20px;
	opacity: 0.55;
	transition: opacity 150ms cubic-bezier(0.22, 1, 0.36, 1);

	.cards:hover &,
	.cards:focus-within &,
	.cards.dragging & {
		opacity: 1;
	}
}

.handle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 20px;
	padding: 0 var(--spacing--3xs) 0 var(--spacing--4xs);
	border-radius: 10px;
	background: var(--color--background);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	line-height: 1;
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.02em;
	text-transform: uppercase;
	box-shadow: 0 0 0 1px var(--color--foreground);
	cursor: grab;
	user-select: none;
	touch-action: none;

	&:active {
		cursor: grabbing;
	}

	&:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 2px var(--color--background),
			0 0 0 4px var(--color--primary);
	}
}

.handleLabel {
	white-space: nowrap;
}

.reset {
	display: inline-grid;
	place-items: center;
	width: 20px;
	height: 20px;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: var(--color--background);
	color: var(--color--text--tint-1);
	box-shadow: 0 0 0 1px var(--color--foreground);
	cursor: pointer;

	&:hover {
		color: var(--color--text);
	}

	&:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 2px var(--color--background),
			0 0 0 4px var(--color--primary);
	}
}

.card {
	// Default card max-width is wider than the slot; fill the slot instead.
	max-width: none;
	box-shadow: 0 8px 24px oklch(0% 0 0 / 0.14);
}
</style>
