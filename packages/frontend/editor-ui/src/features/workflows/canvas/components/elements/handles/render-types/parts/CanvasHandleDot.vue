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
	<div :class="[$style.dot, handleClasses]" />
</template>

<style lang="scss" module>
.dot {
	width: var(--handle--indicator--width);
	height: var(--handle--indicator--height);
	border-radius: 50%;
	background: light-dark(var(--color--neutral-white), var(--color--neutral-850));
	border: 1px solid light-dark(var(--color--neutral-300), var(--color--neutral-500));

	&:hover {
		background: var(--color--primary);
	}
}
</style>
