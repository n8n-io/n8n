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
	<div :class="$style.wrapper">
		<div :class="[$style.dot, handleClasses]" />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	padding: 4px;
	margin: -4px;
}

.dot {
	width: var(--handle--indicator--width);
	height: var(--handle--indicator--height);
	border-radius: 50%;
	background: light-dark(var(--color--neutral-white), var(--color--neutral-850));
	border: 1px solid light-dark(var(--color--neutral-300), var(--color--neutral-500));
	transition:
		transform 0.2s ease,
		background 0.2s ease,
		border-width 0.1s ease;

	.wrapper:hover & {
		/* background: var(--color--primary); */
		border: 1.5px solid light-dark(var(--color--neutral-300), var(--color--neutral-300));
		background: light-dark(var(--color--neutral-100), var(--color--neutral-700));
		transform: scale(1.5);
	}
}
</style>
