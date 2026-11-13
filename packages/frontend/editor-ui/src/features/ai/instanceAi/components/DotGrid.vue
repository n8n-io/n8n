<script lang="ts" setup>
defineProps<{
	height: number;
}>();
</script>

<template>
	<div :class="$style.dotGrid" :style="{ height: `${height}px` }" aria-hidden="true" />
</template>

<style lang="css" module>
.dotGrid {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	max-height: clamp(120px, 45dvh, 1280px);
	pointer-events: none;
	background-image: radial-gradient(
		circle,
		currentColor var(--border-width),
		transparent var(--border-width)
	);
	background-size: var(--spacing--sm) var(--spacing--sm);
	opacity: 0.2;
	--word-grid-background-color: #aaa;
	color: var(--word-grid-background-color);

	-webkit-mask-image: linear-gradient(
		to top,
		rgba(0, 0, 0, 0.5) 0%,
		rgba(0, 0, 0, 0.75) 3%,
		rgba(0, 0, 0, 0) 90%
	);
	mask-image: linear-gradient(
		to top,
		rgba(0, 0, 0, 0.5) 0%,
		rgba(0, 0, 0, 0.75) 3%,
		rgba(0, 0, 0, 0) 90%
	);
	-webkit-mask-position: bottom right;
	mask-position: bottom right;
	-webkit-mask-size: cover;
	mask-size: cover;
	-webkit-mask-repeat: no-repeat;
	mask-repeat: no-repeat;

	:global(body[data-theme='dark']) & {
		--word-grid-background-color: #ccc;
	}

	@media (prefers-color-scheme: dark) {
		:global(body:not([data-theme])) & {
			--word-grid-background-color: #ccc;
		}
	}
}
</style>
