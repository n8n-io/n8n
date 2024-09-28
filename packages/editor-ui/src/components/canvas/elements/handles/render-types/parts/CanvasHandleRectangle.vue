<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

const props = withDefaults(
	defineProps<{
		handleClasses?: string;
		sourceEdgeHovered: boolean;
	}>(),
	{
		handleClasses: undefined,
	},
);

const $style = useCssModule();

const classes = computed(() => [
	$style.rectangle,
	props.handleClasses,
	...(props.sourceEdgeHovered ? [$style['rectangle--hovered']] : []),
]);
</script>

<template>
	<div :class="classes" />
</template>

<style lang="scss" module>
.rectangle {
	width: var(--handle--indicator--width);
	height: var(--handle--indicator--height);
	background: var(--color-foreground-xdark);
	transition: background 0.3s ease;

	&:hover {
		background: var(--color-primary);
	}
}

.rectangle--hovered {
	background: var(--color-primary);
}
</style>
