<template>
	<div :class="[$style.wrapper, !sidebarMenuCollapsed && $style.expandedSidebar]">
		<div :class="$style.container">
			<aside :class="$style.aside" v-if="$slots.aside">
				<slot name="aside" />
			</aside>
			<main :class="$style.content">
				<slot />
			</main>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'PageViewLayout',
	data() {
		return {
			loading: false,
		};
	},
	computed: {
		sidebarMenuCollapsed(): boolean {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
	},
});
</script>

<style lang="scss" module>
.wrapper {
	display: flex;
	height: 100%;
	justify-content: center;
	box-sizing: border-box;
	background: var(--color-gray-light);
	padding: var(--spacing-l) var(--spacing-l) 0;
	@media (min-width: 1200px) {
		padding: var(--spacing-2xl) var(--spacing-2xl) 0;
	}
}

.container {
	max-width: 1280px;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: row;
	height: 100%;
	width: 100%;
}

.aside {
	display: flex;
	flex-shrink: 0;
	flex-direction: column;
	height: 100%;
	width: 160px;
	margin-right: var(--spacing-l);

	@media (min-width: 1200px) {
		margin-right: var(--spacing-2xl);
	}
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1 1 100%;
	height: 100%;
}

@media (max-width: 500px) {
	.container {
		flex-direction: column;
	}
	.aside {
		height: auto;
		margin: 0;
	}
}
</style>
