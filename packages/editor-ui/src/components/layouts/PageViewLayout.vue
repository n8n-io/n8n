<template>
	<div :class="$style.wrapper">
		<slot name="header" />
		<main :class="$style.content">
			<slot />
		</main>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';

export default defineComponent({
	name: 'PageViewLayout',
	data() {
		return {
			loading: false,
		};
	},
	computed: {
		...mapStores(useUIStore),
	},
});
</script>

<style lang="scss" module>
.wrapper {
	display: grid;
	height: 100%;
	width: 100%;
	max-width: 1280px;
	grid-template-rows: auto 1fr;
	box-sizing: border-box;
	align-content: start;
	padding: var(--spacing-l) var(--spacing-2xl) 0;
}

.content {
	display: grid;
	height: 100%;
}
</style>
