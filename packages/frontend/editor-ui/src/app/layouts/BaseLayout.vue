<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

const { inset = false } = defineProps<{
	/** Render the content as a raised panel next to the sidebar */
	inset?: boolean;
}>();

const layoutRef = useTemplateRef('layout');

const emit = defineEmits<{
	mounted: [Element];
}>();

onMounted(() => {
	if (layoutRef.value) emit('mounted', layoutRef.value);
});
</script>

<template>
	<div ref="layout" class="app-grid" :class="[$style.appGrid, { [$style.inset]: inset }]">
		<div v-if="!!$slots.banners" id="banners" :class="$style.banners">
			<slot name="banners" />
		</div>
		<header v-if="!!$slots.header" id="header" :class="$style.header">
			<slot name="header" />
		</header>
		<aside v-if="!!$slots.sidebar" id="sidebar" :class="$style.sidebar">
			<slot name="sidebar" />
		</aside>
		<main id="content" :class="$style.content">
			<div :class="$style.contentWrapper">
				<slot />
			</div>
			<div v-if="!!$slots.footer" :class="$style.contentFooter">
				<slot name="footer" />
			</div>
		</main>
		<aside v-if="!!$slots.aside" id="aside" :class="$style.aside">
			<slot name="aside" />
		</aside>
		<slot name="overlays" />
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/mixins';

// App grid is the main app layout including modals and other absolute positioned elements
.appGrid {
	position: relative;
	display: grid;
	height: 100%;
	width: 100%;
	grid-area: layout;
	grid-template-areas:
		'banners banners banners'
		'sidebar header aside'
		'sidebar content aside';
	grid-template-columns: auto 1fr auto;
	grid-template-rows: auto auto 1fr;
}

.banners {
	grid-area: banners;
	min-width: 0;
	min-height: 0;
}

.header {
	grid-area: header;
	min-width: 0;
	min-height: 0;
}

.sidebar {
	grid-area: sidebar;
}

.aside {
	grid-area: aside;
	min-width: 0;
	min-height: 0;
	position: relative;
	overflow: hidden;
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	overflow: auto;
	grid-area: content;
	isolation: isolate;

	// Lift the stacking context while the workflow preview iframe NDV is
	// fullscreen so its `z-index` can paint above the sidebar.
	&:has([data-test-id='workflow-preview-iframe'][data-ndv-open]) {
		isolation: auto;
	}
}

.contentWrapper {
	display: flex;
	grid-area: content;
	position: relative;
	overflow: auto;
	height: 100%;
	width: 100%;
	justify-content: center;

	main {
		width: 100%;
		height: 100%;
	}
}

.inset {
	// The sidebar and the gutter share one background, so the panel reads as the foreground.
	--sidebar--border-color: transparent;

	background-color: var(--menu--color--background);

	.content {
		// An outer layout sizes every nested `main` to 100%, which would push the margins out of view.
		width: auto;
		height: auto;
		min-width: 0;
		min-height: 0;
		margin: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs) 0;
		border: var(--border-width, 1px) solid var(--border-color--subtle);
		border-radius: var(--radius--sm);
		background-color: var(--background--surface);
		box-shadow: var(--shadow--2xs);
		overflow: hidden;
	}

	// A thin thumb on a clear track, so the scrollbar blends into the panel.
	// Always reserve the scrollbar space, so the page width stays the same on short
	// pages and while a page loads.
	.contentWrapper {
		@include mixins.scroll-bar;

		scrollbar-gutter: stable;
	}
}

.contentFooter {
	height: auto;
	z-index: 10;
	width: 100%;
	display: none;

	// Only show footer if there's content
	&:has(*) {
		display: block;
	}
}
</style>
