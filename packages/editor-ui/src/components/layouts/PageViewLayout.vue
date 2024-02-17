<template>
	<div :class="$style.wrapper">
		<slot name="header" />
		<aside v-if="$slots.aside" :class="$style.aside">
			<slot name="aside" />
		</aside>
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
	box-sizing: border-box;
	align-content: start;
	padding: var(--spacing-2xl) var(--spacing-2xl) 0;
}

.aside {
	display: grid;
	grid-template-areas: 'left right';
	height: 100%;
	width: 100%;
	justify-content: space-between;
	margin-right: var(--spacing-l);
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1 1 100%;
	height: 100%;
}
</style>
