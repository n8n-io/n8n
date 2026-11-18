<script setup lang="ts">
import { defineAsyncComponent, watch } from 'vue';
import { useRoute } from 'vue-router';

import { usePagePeekStore } from '../pagePeek.store';

/**
 * Shows the side panel of the peeked page above the current view.
 * The panel and the page editor load at the first peek. A change of route closes the panel.
 */
const PagePeekPanel = defineAsyncComponent(async () => await import('./PagePeekPanel.vue'));

const peekStore = usePagePeekStore();
const route = useRoute();

watch(
	() => route.fullPath,
	() => peekStore.close(),
);
</script>

<template>
	<Teleport to="body">
		<Transition
			:enter-from-class="$style.offScreen"
			:leave-to-class="$style.offScreen"
			:enter-active-class="$style.sliding"
			:leave-active-class="$style.sliding"
		>
			<PagePeekPanel
				v-if="peekStore.pageId"
				:key="peekStore.pageId"
				:page-id="peekStore.pageId"
				@close="peekStore.close"
			/>
		</Transition>
	</Teleport>
</template>

<style lang="scss" module>
.sliding {
	transition:
		transform var(--duration--base) var(--easing--ease-out),
		opacity var(--duration--base) var(--easing--ease-out);
}

.offScreen {
	transform: translateX(100%);
	opacity: 0;
}
</style>
