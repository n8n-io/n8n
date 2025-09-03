<script lang="ts" setup>
import {
	DropdownMenuContent,
	DropdownMenuPortal,
	DropdownMenuRoot,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from 'reka-ui';
import { ref, computed } from 'vue';

import N8nIcon from '../N8nIcon';
import SingleSelect from './SingleSelect.vue';
import type { IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import MultiSelect from './MultiSelect.vue';

interface ActiveFilter {
	filterName: string;
	values: FilterItem[];
	type: 'single' | 'multi';
}

interface FilterOption {
	label: string;
	options: FilterItem[];
	type: 'single' | 'multi';
	allowCustomValues?: boolean;
}

interface FilterItem {
	name: string;
	id: string;
	value: string;
}

interface FilterAction {
	label: string;
	icon: IconName;
	tooltip?: string;
}

interface Props {
	filters?: FilterOption[];
	primaryActionText?: string;
	actions?: FilterAction[];
	noTertiaryActions: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	filters: () => [],
	actions: () => [],
});

const activeFilters = ref<ActiveFilter[]>([]);

const filterOptions = computed(() => props.filters);
const hasActiveFilters = computed(() => activeFilters.value.length > 0);

function handleSingleSelectChange(filterName: string, value: FilterItem | null) {}

function handleMultiSelectChange(filterName: string, value: FilterItem) {
	const filterToUpdate = activeFilters.value.find((f) => f.filterName === filterName);

	console.log('filterToUpdate', filterToUpdate);

	if (!filterToUpdate) {
		activeFilters.value.push({
			filterName,
			values: [value],
			type: 'multi',
		});
		return;
	}

	// Toggle off the value if it's already selected
	if (filterToUpdate.values.some((v) => v.id === value.id)) {
		filterToUpdate.values = filterToUpdate.values.filter((v) => v.id !== value.id);

		if (filterToUpdate.values.length === 0) {
			activeFilters.value = activeFilters.value.filter((f) => f.filterName !== filterName);
		}

		return;
	}

	activeFilters.value = activeFilters.value.map((f) =>
		f.filterName === filterName ? { ...f, values: [...f.values, value] } : f,
	);
}

function getSelectedSingleValue() {}

function getSelectedMultiValues() {}

// function removeFilter(filterName: string) {}
</script>

<template>
	<div class="toolbar">
		<div class="filters">
			<!-- Active Filters -->
			<div v-if="hasActiveFilters" class="active-filters">
				<template v-for="filter in activeFilters" :key="filter.filterName">
					<button class="filter-tag active">
						<N8nText size="small">{{ filter.filterName }} is</N8nText>
						<N8nText bold size="small">{{
							filter.values.map(({ name }) => name).join(', ')
						}}</N8nText>
						<N8nIcon icon="x" />
					</button>
				</template>
			</div>
			<!-- Filters Dropdown -->
			<DropdownMenuRoot>
				<DropdownMenuTrigger class="filter-button">
					<N8nTooltip content="Filter">
						<N8nIconButton
							type="tertiary"
							icon="list-filter"
							text
							:class="{ active: hasActiveFilters }"
						/>
					</N8nTooltip>
				</DropdownMenuTrigger>
				<DropdownMenuPortal>
					<DropdownMenuContent class="filter-dropdown">
						<template v-for="filterOption in filterOptions" :key="filterOption.label">
							<DropdownMenuSub>
								<DropdownMenuSubTrigger class="filter-item">
									<N8nText size="small" color="text-dark">
										{{ filterOption.label }}
									</N8nText></DropdownMenuSubTrigger
								>
								<DropdownMenuPortal>
									<DropdownMenuSubContent :side-offset="4" class="filter-dropdown">
										<SingleSelect
											v-if="filterOption.type === 'single'"
											:items="filterOption.options"
											:model-value="getSelectedSingleValue(filterOption.label)"
											@update:model-value="
												(value: FilterItem | null) =>
													handleSingleSelectChange(filterOption.label, value)
											"
											:placeholder="`Select ${filterOption.label.toLowerCase()}...`"
										/>
										<MultiSelect
											v-else
											:items="filterOption.options"
											:model-value="getSelectedMultiValues(filterOption.label)"
											@update:model-value="
												(values) => handleMultiSelectChange(filterOption.label, values)
											"
											:placeholder="`Select ${filterOption.label.toLowerCase()}...`"
										/>
									</DropdownMenuSubContent>
								</DropdownMenuPortal>
							</DropdownMenuSub>
						</template>
					</DropdownMenuContent>
				</DropdownMenuPortal>
			</DropdownMenuRoot>
		</div>
	</div>
</template>

<style scoped lang="scss">
.toolbar {
	display: flex;
	justify-content: end;
	align-items: center;
	gap: var(--spacing-xs);
	width: 100%;
}

.filters {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}

.active-filters {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	flex-wrap: wrap;
	max-width: 100%;
}

.active {
	background-color: var(--color-callout-secondary-background);
	border: var(--border-base);
	border-color: var(--color-callout-secondary-border);
	color: var(--color-callout-secondary-font);
}

.filter-tag {
	outline: none;
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	padding: var(--spacing-3xs) var(--spacing-3xs);
	height: 30px;
	font-size: var(--font-size-2xs);
	color: var(--color-callout-secondary-font);
}

.filter-button {
	padding: 0;
	background-color: transparent;
	border: none;
	outline: none;
}

:deep(.filter-dropdown) {
	z-index: 1000;
	min-width: 160px;
	box-shadow: var(--box-shadow-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
}

.filter-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-3xs) var(--spacing-2xs);
	border-radius: var(--border-radius-small);
	color: var(--color-text-base);
	cursor: pointer;
	transition: background-color 0.2s ease;

	&:hover,
	&:focus-visible,
	&:focus {
		background-color: var(--color-background-base);
	}
}
</style>
