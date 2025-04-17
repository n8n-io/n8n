<script lang="ts" setup>
withDefaults(
	defineProps<{
		handleClasses?: string;
	}>(),
	{
		handleClasses: undefined,
	},
);
</script>

<template>
	<div :class="[$style.diamond, handleClasses]" />
</template>

<style lang="scss" module>
.diamond {
	width: var(--handle--indicator--width);
	height: var(--handle--indicator--height);
	background: var(--node-type-supplemental-color);
	transform: rotate(45deg) scale(0.8);

	&:hover {
		background: var(--color-primary);
	}
}
</style>
