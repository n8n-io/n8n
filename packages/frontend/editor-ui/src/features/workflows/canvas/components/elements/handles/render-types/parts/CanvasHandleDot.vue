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
	background: var(--color--foreground--shade-2);

	&:hover {
		background: var(--color--primary);
	}
}
</style>
