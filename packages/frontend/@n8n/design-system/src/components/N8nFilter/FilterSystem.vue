<script setup lang="ts">
import { ref, computed, provide } from 'vue';
import {
	DropdownMenuRoot,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
	DropdownMenuSeparator,
	ComboboxRoot,
	ComboboxInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxItem,
} from 'reka-ui';
import { FilterItem } from './FilterItem.vue';
import { useFilterSystem } from './composables/useFilterSystem';
import type { FilterConfig, FilterDefinition } from './types';

// Props
interface Props {
	filters: FilterConfig[];
	modelValue?: FilterDefinition[];
	side?: 'top' | 'right' | 'bottom' | 'left';
	align?: 'start' | 'center' | 'end';
	filterIcon?: any;
	triggerLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
	side: 'bottom',
	align: 'start',
	triggerLabel: 'Filter',
	modelValue: () => [],
});

const emit = defineEmits<{
	'update:modelValue': [filters: FilterDefinition[]];
	'filter-applied': [filters: FilterDefinition[]];
}>();

// State
const isOpen = ref(false);
const selectedFilterType = ref<FilterConfig | null>(null);

// Filter system composable
const { activeFilters, addFilter, removeFilter, updateFilter, clearAllFilters } = useFilterSystem(
	props.modelValue,
	emit,
);

// Computed
const availableFilters = computed(() => {
	// Hide filters that are already active (for single-instance filters)
	const activeFields = new Set(activeFilters.value.map((f) => f.field));
	return props.filters.filter((f) => !f.singleInstance || !activeFields.has(f.field));
});

// Methods
const handleFilterSelect = (filterConfig: FilterConfig | null) => {
	if (!filterConfig) return;

	// Open filter configuration popover/modal
	openFilterConfiguration(filterConfig);
	selectedFilterType.value = null;
};

const openFilterConfiguration = async (config: FilterConfig) => {
	// This would open a secondary popover for configuring the filter
	// For now, we'll add with default values
	const newFilter: FilterDefinition = {
		id: generateId(),
		...config,
		value: getDefaultValue(config.type),
		operator: config.operators?.[0] || 'equals',
	};

	addFilter(newFilter);
};

// Provide filter context for child components
provide('filterSystem', {
	activeFilters,
	removeFilter,
	updateFilter,
});

// Utilities
function generateId(): string {
	return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultValue(type: string): any {
	switch (type) {
		case 'string':
			return '';
		case 'number':
			return 0;
		case 'boolean':
			return false;
		case 'select':
			return null;
		case 'multiselect':
			return [];
		case 'date':
			return new Date();
		case 'daterange':
			return { start: new Date(), end: new Date() };
		default:
			return null;
	}
}
</script>

<!-- FilterSystem.vue - Main filter component -->
<template>
	<div class="filter-system">
		<DropdownMenuRoot v-model:open="isOpen">
			<DropdownMenuTrigger as-child>
				<button class="filter-trigger">
					<Icon :icon="filterIcon" />
					<span>{{ triggerLabel }}</span>
					<Badge v-if="activeFilters.length > 0">
						{{ activeFilters.length }}
					</Badge>
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuPortal>
				<DropdownMenuContent
					:side="side"
					:align="align"
					:side-offset="5"
					class="filter-dropdown-content"
				>
					<!-- Filter type selector -->
					<div class="filter-selector">
						<ComboboxRoot v-model="selectedFilterType" @update:model-value="handleFilterSelect">
							<ComboboxInput placeholder="Add filter..." class="filter-search-input" />
							<ComboboxContent>
								<ComboboxEmpty>No filters found</ComboboxEmpty>
								<ComboboxGroup>
									<ComboboxItem
										v-for="filter in availableFilters"
										:key="filter.field"
										:value="filter"
										class="filter-option"
									>
										<Icon :icon="filter.icon" />
										<span>{{ filter.label }}</span>
									</ComboboxItem>
								</ComboboxGroup>
							</ComboboxContent>
						</ComboboxRoot>
					</div>

					<DropdownMenuSeparator />

					<!-- Active filters list -->
					<div v-if="activeFilters.length > 0">
						<div class="filters-header">
							<span>Active filters</span>
							<button @click="clearAllFilters">Clear all</button>
						</div>

						<TransitionGroup name="filter-list" tag="div">
							<FilterItem
								v-for="filter in activeFilters"
								:key="filter.id"
								:filter="filter"
								@remove="removeFilter"
								@update="updateFilter"
							/>
						</TransitionGroup>
					</div>

					<div v-else>No active filters</div>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenuRoot>
	</div>
</template>
