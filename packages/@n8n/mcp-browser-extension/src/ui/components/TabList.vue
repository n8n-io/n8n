<script setup lang="ts">
import TabItem from './TabItem.vue';

const props = withDefaults(
	defineProps<{
		tabs: chrome.tabs.Tab[];
		selectable?: boolean;
		selectedTabIds?: Set<number>;
	}>(),
	{
		selectable: false,
		selectedTabIds: () => new Set<number>(),
	},
);

const emit = defineEmits<{
	toggleTab: [tabId: number];
}>();

function isSelected(tab: chrome.tabs.Tab): boolean {
	return tab.id !== undefined && props.selectedTabIds.has(tab.id);
}
</script>

<template>
	<ul class="tab-list">
		<TabItem
			v-for="tab in tabs"
			:key="tab.id"
			:tab="tab"
			:selectable="selectable"
			:selected="isSelected(tab)"
			@toggle="emit('toggleTab', $event)"
		/>
	</ul>
</template>

<style scoped lang="scss">
.tab-list {
	list-style: none;
	padding: 0;
	margin: 0;
	overflow-y: auto;
	min-height: 60px;
}
</style>
