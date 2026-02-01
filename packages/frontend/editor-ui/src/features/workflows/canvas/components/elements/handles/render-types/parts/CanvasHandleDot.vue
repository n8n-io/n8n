<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		handleClasses?: string;
	}>(),
	{
		handleClasses: undefined,
	},
);

const isOutputHandle = computed(() => props.handleClasses === 'source');
</script>

<template>
	<div :class="[$style.wrapper, { [$style.output]: isOutputHandle }]">
		<div :class="[$style.dot, handleClasses]" />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	padding: 4px;
	margin: -4px;
	z-index: 2;

	&.output {
		cursor: crosshair;
	}
}

.dot {
	width: var(--handle--indicator--width);
	height: var(--handle--indicator--height);
	border-radius: 50%;
	background: light-dark(var(--color--neutral-white), var(--color--neutral-850));
	border: 1px solid
		light-dark(
			oklch(var(--handle--border--lightness--light, 0.68) 0 0),
			oklch(var(--handle--border--lightness--dark, 0.5) 0 0)
		);
	transition:
		transform 0.2s ease,
		background 0.2s ease,
		border-width 0.1s ease;

	.wrapper.output:hover & {
		border: 1.5px solid light-dark(var(--color--neutral-300), var(--color--neutral-300));
		background: light-dark(var(--color--neutral-100), var(--color--neutral-700));
		transform: scale(1.5);
	}
}
</style>
