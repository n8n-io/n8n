<script lang="ts" setup>
const { fullWidth = false, pageScroll = false } = defineProps<{
	fullWidth?: boolean;
	/** Scroll the whole page in the parent scroll area and pin the header to its top */
	pageScroll?: boolean;
}>();
</script>

<template>
	<div
		:class="[$style.wrapper, { [$style.fullWidth]: fullWidth, [$style.pageScroll]: pageScroll }]"
	>
		<div v-if="pageScroll && $slots.header" :class="$style.stickyHeader">
			<slot name="header" />
		</div>
		<slot v-else name="header" />
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

.pageScroll {
	// Grow with the content, so the sticky header can stay pinned through the whole page.
	align-self: flex-start;
	height: auto;
	min-height: 100%;
	// The sticky header owns the top spacing, so it keeps it while pinned.
	padding-top: 0;

	@include breakpoints.breakpoint('sm-and-down') {
		padding-top: 0;
	}

	.content {
		flex: 1;
		align-content: start;
		height: auto;
	}
}

.stickyHeader {
	position: sticky;
	top: 0;
	// Keep the header above list rows that create their own stacking context.
	z-index: 1;
	padding-top: var(--spacing--lg);
	background-color: var(--background--surface);

	@include breakpoints.breakpoint('sm-and-down') {
		padding-top: var(--spacing--sm);
	}
}
</style>
