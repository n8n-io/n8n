<script lang="ts" setup>
withDefaults(
	defineProps<{
		handleClasses?: string;
		sourceEdgeHovered: boolean;
	}>(),
	{
		handleClasses: undefined,
	},
);
</script>

<template>
	<div
		:class="{
			[$style.rectangle]: true,
			handleClasses,
			[$style['rectangle--hovered']]: sourceEdgeHovered,
		}"
	/>
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
