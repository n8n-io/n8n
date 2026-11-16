<script lang="ts" setup>
const { fullWidth = false } = defineProps<{
	fullWidth?: boolean;
}>();
</script>

<template>
	<div :class="[$style.wrapper, fullWidth ? $style.fullWidth : '']">
		<slot name="header" />
		<main :class="$style.content">
			<slot />
		</main>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.wrapper {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	max-width: var(--content-container--width);
	box-sizing: border-box;
	align-content: start;
	padding: var(--spacing--lg) var(--spacing--2xl) 0;

	@include breakpoints.breakpoint('sm-and-down') {
		padding: var(--spacing--sm) var(--spacing--sm) 0;
	}
}

.fullWidth {
	max-width: none;
	padding-inline: var(--spacing--md);
}

.content {
	display: grid;
	height: 100%;
}
</style>
