<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

const layoutRef = useTemplateRef('layout');

const emit = defineEmits<{
	mounted: [Element];
}>();

onMounted(() => {
	if (layoutRef.value) emit('mounted', layoutRef.value);
});
</script>

<template>
	<div ref="layout" class="app-grid" :class="$style.appGrid">
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
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	overflow: auto;
	grid-area: content;
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
