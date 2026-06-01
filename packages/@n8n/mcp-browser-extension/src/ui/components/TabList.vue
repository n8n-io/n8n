<script setup lang="ts">
import { computed } from 'vue';
import { N8nCheckbox } from '@n8n/design-system';
import TabItem from './TabItem.vue';

const props = withDefaults(
	defineProps<{
		tabs: chrome.tabs.Tab[];
		selectable?: boolean;
		selectedTabIds?: Set<number>;
		allSelected?: boolean;
		headerText?: string;
	}>(),
	{
		selectable: false,
		selectedTabIds: () => new Set<number>(),
		allSelected: false,
		headerText: '',
	},
);

const emit = defineEmits<{
	toggleTab: [tabId: number];
	toggleAll: [];
}>();

const someSelected = computed(() => props.selectedTabIds.size > 0);

function isSelected(tab: chrome.tabs.Tab): boolean {
	return tab.id !== undefined && props.selectedTabIds.has(tab.id);
}
</script>

<template>
	<div class="tab-list-container">
		<div class="tab-list-header">
			<label v-if="selectable" class="select-all" @click.prevent="emit('toggleAll')">
				<N8nCheckbox :model-value="allSelected" :indeterminate="someSelected && !allSelected" />
				<span>Select All ({{ tabs.length }} tabs)</span>
			</label>
			<template v-else>{{ headerText }}</template>
		</div>
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
	</div>
</template>

<style scoped lang="scss">
.tab-list-container {
	margin-bottom: var(--spacing--sm);
}

.tab-list-header {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	margin-bottom: var(--spacing--3xs);
}

.tab-list {
	list-style: none;
	padding: 0;
	margin: 0;
	max-height: 300px;
	overflow-y: auto;
}

.select-all {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}
</style>
