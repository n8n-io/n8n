<script setup lang="ts">
import { computed } from 'vue';
const props = withDefaults(
	defineProps<{
		radius: number;
		progress: number;
		strokeWidth?: number;
	}>(),
	{
		strokeWidth: 4,
	},
);

// for SVG viewbox and stroke array
const diameter = computed(() => 2 * (props.radius + props.strokeWidth));
const circumference = computed(() => 2 * Math.PI * props.radius);

const strokeDashoffset = computed(
	() => circumference.value - (props.progress / 100) * circumference.value,
);

const cx = computed(() => props.radius + props.strokeWidth);
const cy = computed(() => props.radius + props.strokeWidth);
const style = computed(() => ({
	strokeDasharray: `${circumference.value}`,
	strokeDashoffset: `${strokeDashoffset.value}`,
}));
</script>

<template>
	<div class="progress-circle">
		<svg class="progress-ring" :width="diameter" :height="diameter">
			<circle
				:class="$style.progressRingCircle"
				:stroke-width="strokeWidth"
				stroke="#DCDFE6"
				fill="transparent"
				:r="radius"
				v-bind="{ cx, cy }"
			/>
			<circle
				:class="$style.progressRingCircle"
				stroke="#5C4EC2"
				:stroke-width="strokeWidth"
				fill="transparent"
				:r="radius"
				v-bind="{ cx, cy, style }"
			/>
		</svg>
	</div>
</template>

<style module>
.progressRingCircle {
	transition: stroke-dashoffset 0.35s linear;
	transform: rotate(-90deg);
	transform-origin: 50% 50%;
}
</style>
