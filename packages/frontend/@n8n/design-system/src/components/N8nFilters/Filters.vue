<script lang="ts" setup>
import ChipFilters from './ChipFilters.vue';
import N8nDropdownFilters from './DropdownFilters.vue';
import type { IconName } from '../N8nIcon/icons';

export interface FilterOption {
	label: string;
	options: string[];
	type: 'single' | 'multi';
	allowCustomValues?: boolean;
}

export interface FilterAction {
	label: string;
	icon: IconName;
	tooltip?: string;
}

interface Props {
	type: 'chip' | 'dropdown' | 'story';
	filters?: FilterOption[];
	primaryActionText?: string;
	actions?: FilterAction[];
	noTertiaryActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	filters: () => [],
	actions: () => [
		{ label: 'Search', icon: 'search', tooltip: 'Search' },
		{ label: 'Sort', icon: 'arrow-up-down', tooltip: 'Sort' },
		{ label: 'Add folder', icon: 'folder-plus', tooltip: 'Add folder' },
	],
	noTertiaryActions: false,
});
</script>

<template>
	<N8nDropdownFilters
		v-if="type === 'dropdown'"
		:filters="props.filters"
		:primaryActionText="props.primaryActionText"
		:actions="props.actions"
		:noTertiaryActions="props.noTertiaryActions"
	/>

	<div class="story-wrapper" v-else>
		<N8nDropdownFilters
			:filters="[
				{ label: 'Status', options: ['Active', 'Inactive'], type: 'multi' },
				{
					label: 'Owner',
					options: ['John Doe', 'Jane Doe'],
					type: 'single',
					allowCustomValues: true,
				},
				{
					label: 'Tag',
					options: ['Tag 1', 'Tag 2', 'Tag 3'],
					type: 'multi',
					allowCustomValues: true,
				},
			]"
			primaryActionText="Create workflow"
			:actions="props.actions"
			:noTertiaryActions="props.noTertiaryActions"
		/>
	</div>
</template>

<style>
.story-wrapper {
	display: flex;
	padding: 5rem;
	flex-direction: column;
	gap: 5rem;
}
</style>
