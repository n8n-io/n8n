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
import { ref, computed, useTemplateRef, nextTick } from 'vue';

import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import SingleSelect from './SingleSelect.vue';
import type { IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton';
import InlineTextEdit from '../N8nInlineTextEdit/InlineTextEdit.vue';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import MultiSelect from './MultiSelect.vue';

interface ActiveFilter {
	filterName: string;
	values: string[];
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

function handleSingleSelectChange(filterName: string, value: FilterItem | null) {
	if (value) {
		const existingFilterIndex = activeFilters.value.findIndex(
			(filter) => filter.filterName === filterName,
		);

		if (existingFilterIndex >= 0) {
			activeFilters.value[existingFilterIndex].values = [value.value];
		} else {
			activeFilters.value.push({
				filterName,
				values: [value.value],
				type: 'single',
			});
		}
	} else {
		removeFilter(filterName);
	}
}

function handleMultiSelectChange(filterName: string, values: FilterItem[]) {
	if (values.length === 0) {
		removeFilter(filterName);
	} else {
		const existingFilterIndex = activeFilters.value.findIndex(
			(filter) => filter.filterName === filterName,
		);

		if (existingFilterIndex >= 0) {
			activeFilters.value[existingFilterIndex].values = values.map((v) => v.value);
		} else {
			activeFilters.value.push({
				filterName,
				values: values.map((v) => v.value),
				type: 'multi',
			});
		}
	}
}

function getSelectedSingleValue(filterName: string): FilterItem | null {
	const filter = activeFilters.value.find((f) => f.filterName === filterName);
	if (filter && filter.values.length > 0) {
		const value = filter.values[0];
		return { name: value, id: value, value };
	}
	return null;
}

function getSelectedMultiValues(filterName: string): FilterItem[] {
	const filter = activeFilters.value.find((f) => f.filterName === filterName);
	if (filter) {
		return filter.values.map((value) => ({ name: value, id: value, value }));
	}
	return [];
}

function removeFilter(filterName: string) {
	const index = activeFilters.value.findIndex((f) => f.filterName === filterName);
	if (index >= 0) {
		activeFilters.value.splice(index, 1);
	}
}

// function clearAllFilters() {
// 	activeFilters.value = [];
// }

const resourceSearch = ref<{ text: string; state: 'visible' | 'hidden' }>({
	text: '',
	state: 'hidden',
});
const searchInputRef = useTemplateRef('searchInputRef');

async function toggleSearchInput() {
	if (resourceSearch.value.state === 'hidden') {
		resourceSearch.value.state = 'visible';

		await nextTick();
		const inputRef = Array.isArray(searchInputRef.value)
			? searchInputRef.value[0]
			: searchInputRef.value;
		if (inputRef?.forceFocus) {
			inputRef.forceFocus();
		}
	} else {
		resourceSearch.value.state = 'hidden';
		resourceSearch.value.text = '';
	}
}

function handleBlur() {
	if (resourceSearch.value.text.trim() === '') {
		resourceSearch.value.state = 'hidden';
	}
}
</script>

<template>
	<div class="toolbar">
		<div class="filters">
			<!-- Active Filters -->
			<div v-if="hasActiveFilters" class="active-filters">
				<template v-for="filter in activeFilters" :key="filter.filterName">
					<button class="filter-tag active" @click="removeFilter(filter.filterName)">
						<N8nText size="small">{{ filter.filterName }} is</N8nText>
						<N8nText bold size="small">{{ filter.values.join(', ') }}</N8nText>
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
												(values: FilterItem[]) =>
													handleMultiSelectChange(filterOption.label, values)
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

		<template v-for="action in props.actions" :key="action.label">
			<N8nTooltip :content="action.tooltip || action.label">
				<N8nIconButton type="tertiary" :icon="action.icon" text @click="toggleSearchInput" />
			</N8nTooltip>
			<N8nText v-if="action.tooltip === 'Search' && resourceSearch.state === 'visible'">
				<InlineTextEdit
					ref="searchInputRef"
					:placeholder="`Search...`"
					:max-width="100"
					:min-width="100"
					:model-value="resourceSearch.text"
					@update:state="
						({ state, value }) => {
							if (state === 'submit' && value.trim() === '') {
								handleBlur();
							}
						}
					"
					@update:model-value="(value: string) => (resourceSearch.text = value)"
				/>
			</N8nText>
		</template>
		<N8nTooltip v-if="!noTertiaryActions" content="More actions">
			<N8nIconButton type="tertiary" icon="ellipsis" text />
		</N8nTooltip>
		<N8nButton v-if="primaryActionText" size="small">{{ props.primaryActionText }}</N8nButton>
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
	padding: var(--spacing-4xs);

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
