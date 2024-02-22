<template>
	<div :class="$style.wrapper">
		<div :class="$style.header">
			<slot name="header" />
		</div>
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
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	max-width: 1280px;
	box-sizing: border-box;
	padding: var(--spacing-2xl) 0 0;
}

.header {
	padding: 0 var(--spacing-2xl);
}

.content {
	display: grid;
	height: 100%;
	padding: var(--spacing-2xl) var(--spacing-2xl) 0;
}
</style>
