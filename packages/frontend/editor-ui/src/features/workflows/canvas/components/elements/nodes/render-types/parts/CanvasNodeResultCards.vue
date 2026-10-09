<script lang="ts" setup>
import { N8nResultCard } from '@n8n/design-system';

import { useResultCardIcons } from '@/app/composables/useResultCardIcons';
import { useCanvasNode } from '../../../../../composables/useCanvasNode';

/**
 * The cards the node declared in its final output, floated to the right of
 * the node that finished the execution — the "peek" the workflow preview
 * shows beside its last node, with real data. Part of the node element, so
 * it moves and scales with the node; interaction is swallowed so reading the
 * card neither drags the node nor opens it.
 */
const { resultCards } = useCanvasNode();

const { iconsByCard } = useResultCardIcons(resultCards);

function swallow(event: Event) {
	event.stopPropagation();
}
</script>

<template>
	<div
		v-if="resultCards.length"
		:class="[$style.cards, 'nodrag', 'nowheel', 'nopan']"
		data-test-id="canvas-node-result-cards"
		@pointerdown="swallow"
		@mousedown="swallow"
		@click="swallow"
		@dblclick="swallow"
		@contextmenu="swallow"
	>
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
	--canvas-node--result-cards--gap: 28px;
	--canvas-node--result-cards--width: 320px;

	position: absolute;
	left: calc(100% + var(--canvas-node--result-cards--gap));
	top: 50%;
	transform: translateY(-50%);
	width: var(--canvas-node--result-cards--width);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	pointer-events: auto;
	cursor: default;

	// Connector from the node's right edge to the card, drawn like a settled edge.
	&::before {
		content: '';
		position: absolute;
		top: 50%;
		right: 100%;
		width: var(--canvas-node--result-cards--gap);
		height: 2px;
		margin-top: -1px;
		background: var(--color--success);
		opacity: 0.8;
	}
}

.card {
	// Default card max-width is wider than the slot; fill the slot instead.
	max-width: none;
	box-shadow: 0 8px 24px oklch(0% 0 0 / 0.14);
}
</style>
