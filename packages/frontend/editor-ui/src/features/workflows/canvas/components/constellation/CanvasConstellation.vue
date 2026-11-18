<script setup lang="ts">
import { computed, useId } from 'vue';
import { backgroundStars } from './graph';
import {
	getConstellationProgress,
	projectCanvasStars,
	type ConstellationCanvasNode,
	type ConstellationCanvasEdge,
	type ConstellationViewport,
} from './zoom';

const props = defineProps<{
	nodes: ConstellationCanvasNode[];
	edges: ConstellationCanvasEdge[];
	viewport: ConstellationViewport;
	dimensions: { width: number; height: number };
}>();
const id = useId();
const progress = computed(() => getConstellationProgress(props.viewport.zoom));
const stars = computed(() => projectCanvasStars(props.nodes, props.viewport));
const connections = computed(() => {
	const byId = new Map(stars.value.map((star) => [star.id, star]));
	return props.edges.flatMap((edge) => {
		const from = byId.get(edge.source);
		const to = byId.get(edge.target);
		return from && to
			? [
					{
						id: edge.id,
						from,
						to,
						auxiliary: !!edge.sourceHandle && !edge.sourceHandle.includes('main'),
					},
				]
			: [];
	});
});
</script>

<template>
	<svg
		v-if="progress > 0 && stars.length"
		class="canvas-constellation"
		data-testid="canvas-constellation"
		:data-progress="progress"
		:viewBox="`0 0 ${dimensions.width || 1} ${dimensions.height || 1}`"
		:style="{ opacity: progress }"
		aria-hidden="true"
	>
		<defs>
			<radialGradient :id="`${id}-sky`">
				<stop offset="0" stop-color="#192440" />
				<stop offset="1" stop-color="#050b17" />
			</radialGradient>
			<radialGradient :id="`${id}-star`">
				<stop offset="0" stop-color="#d2e3ff" stop-opacity="0.55" />
				<stop offset="0.2" stop-color="#afcdff" stop-opacity="0.2" />
				<stop offset="1" stop-color="#8bb2ff" stop-opacity="0" />
			</radialGradient>
		</defs>
		<rect width="100%" height="100%" :fill="`url(#${id}-sky)`" />
		<g fill="#c6d8f6">
			<circle
				v-for="(star, index) in backgroundStars"
				:key="index"
				:cx="(star.x / 1600) * dimensions.width"
				:cy="(star.y / 1000) * dimensions.height"
				:r="star.r * 0.7"
				:opacity="0.12 + (index % 5) * 0.08"
				:class="{ twinkle: index % 7 === 0 }"
				:style="{ animationDelay: `${-(index % 7)}s` }"
			/>
		</g>
		<g fill="none" stroke="#91b6ef" stroke-width="1" stroke-opacity="0.65">
			<line
				v-for="edge in connections"
				:key="edge.id"
				:x1="edge.from.x"
				:y1="edge.from.y"
				:x2="edge.to.x"
				:y2="edge.to.y"
				:stroke-dasharray="edge.auxiliary ? '3 6' : undefined"
			/>
		</g>
		<g
			v-for="star in stars"
			:key="star.id"
			:data-star-id="star.id"
			:transform="`translate(${star.x} ${star.y})`"
		>
			<circle r="27" :fill="`url(#${id}-star)`" />
			<path d="M-9 0H9 M0 -9V9" stroke="#dce9ff" stroke-width="0.6" opacity="0.6" />
			<circle r="2.4" fill="#f4f7ff" />
		</g>
	</svg>
</template>

<style scoped lang="scss">
@use '../../../../../../../@n8n/design-system/src/css/mixins/motion' as motion;

.canvas-constellation {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	z-index: 4;
	pointer-events: none;
}
.twinkle {
	// The slow pulse belongs to the decorative sky, not the zoom interaction.
	--animation--opacity-pulse--duration: 7s;
	@include motion.opacity-pulse;
}
@keyframes opacityPulse {
	0%,
	100% {
		opacity: 0.15;
	}
	50% {
		opacity: 0.5;
	}
}
</style>
