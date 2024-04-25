<template>
	<div
		v-if="items"
		:class="{
			[$style.container]: true,
			['tab-bar-container']: true,
			[$style.menuCollapsed]: mainSidebarCollapsed,
		}"
	>
		<n8n-radio-buttons :model-value="activeTab" :options="items" @update:model-value="onSelect" />
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { ITabBarItem } from '@/Interface';
import { MAIN_HEADER_TABS } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';

export default defineComponent({
	name: 'TabBar',
	props: {
		items: {
			type: Array as PropType<ITabBarItem[]>,
			required: true,
		},
		activeTab: {
			type: String,
			default: MAIN_HEADER_TABS.WORKFLOW,
		},
	},
	data() {
		return {
			MAIN_HEADER_TABS,
		};
	},
	computed: {
		...mapStores(useUIStore),
		mainSidebarCollapsed(): boolean {
			return this.uiStore.sidebarMenuCollapsed;
		},
	},
	methods: {
		onSelect(tab: string, event: MouseEvent): void {
			this.$emit('select', tab, event);
		},
	},
});
</script>

<style module lang="scss">
.container {
	position: absolute;
	top: 47px;
	left: 50%;
	transform: translateX(-50%);
	min-height: 30px;
	display: flex;
	padding: var(--spacing-5xs);
	background-color: var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	transition: all 150ms ease-in-out;
}

@media screen and (max-width: 430px) {
	.container {
		flex-direction: column;
	}
}
</style>
