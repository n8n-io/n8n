<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	variant: 'main' | 'auxiliary';
}>();

const linePath = computed(() => createConnectorPath(0));
const lineOverdrawPath = computed(() => createConnectorPath(1.8));
const arrowHeadPath = computed(() => createArrowHeadPath(0));
const arrowHeadOverdrawPath = computed(() => createArrowHeadPath(1.1));
const showArrowHead = computed(() => props.variant === 'main');

function createConnectorPath(offset: number) {
	const midX = (props.sourceX + props.targetX) / 2;
	const midY = (props.sourceY + props.targetY) / 2;
	const wobbleY = offset === 0 ? -1.3 : 1.4;

	return [
		`M ${props.sourceX + offset * 0.2} ${props.sourceY + wobbleY}`,
		`C ${midX - 10} ${midY + wobbleY * 1.4}, ${midX + 10} ${midY - wobbleY * 0.8}, ${props.targetX - offset * 0.4} ${props.targetY + wobbleY}`,
	].join(' ');
}

function createArrowHeadPath(offset: number) {
	const dx = props.targetX - props.sourceX;
	const dy = props.targetY - props.sourceY;
	const length = Math.hypot(dx, dy) || 1;
	const unitX = dx / length;
	const unitY = dy / length;
	const normalX = -unitY;
	const normalY = unitX;
	const headLength = 19;
	const headSpread = 10;
	const targetX = props.targetX - offset * 0.3;
	const targetY = props.targetY + offset * 0.4;
	const baseX = targetX - unitX * headLength;
	const baseY = targetY - unitY * headLength;

	const upperX = baseX + normalX * headSpread;
	const upperY = baseY + normalY * headSpread;
	const lowerX = baseX - normalX * headSpread;
	const lowerY = baseY - normalY * headSpread;

	return `M ${upperX} ${upperY} L ${targetX} ${targetY} L ${lowerX} ${lowerY}`;
}
</script>

<template>
	<g :class="['connection', `connection-${variant}`]">
		<path class="connection-line-overdraw" :d="lineOverdrawPath" />
		<path class="connection-line" :d="linePath" />
		<path v-if="showArrowHead" class="connection-arrowhead-overdraw" :d="arrowHeadOverdrawPath" />
		<path v-if="showArrowHead" class="connection-arrowhead" :d="arrowHeadPath" />
	</g>
</template>
