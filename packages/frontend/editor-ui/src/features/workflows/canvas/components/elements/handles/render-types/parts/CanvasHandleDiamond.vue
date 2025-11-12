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
	background: light-dark(var(--color--neutral-white), var(--color--neutral-850));
	border: 1px solid light-dark(var(--color--neutral-300), var(--color--neutral-500));
	transform: rotate(45deg) scale(0.8);

	&:hover {
		background: var(--color--primary);
	}
}
</style>
