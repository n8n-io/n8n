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
		<div :class="[$style.diamond, handleClasses]" />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	padding: 4px;
	margin: -4px;
}

.diamond {
	width: var(--handle--indicator--width);
	height: var(--handle--indicator--height);
	background: light-dark(var(--color--neutral-white), var(--color--neutral-850));
	border: 1px solid
		light-dark(
			oklch(var(--handle--border--lightness--light, 0.68) 0 0),
			oklch(var(--handle--border--lightness--dark, 0.5) 0 0)
		);
	transform: rotate(45deg) scale(0.8);
	transition:
		transform 0.2s ease,
		background 0.2s ease,
		border-width 0.1s ease;

	.wrapper:hover & {
		border: 1.5px solid light-dark(var(--color--neutral-300), var(--color--neutral-300));
		background: light-dark(var(--color--neutral-100), var(--color--neutral-700));
		transform: rotate(45deg) scale(1.2);
	}
}
</style>
