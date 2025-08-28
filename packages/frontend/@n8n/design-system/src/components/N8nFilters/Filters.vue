<script lang="ts" setup>
import N8nTooltip from '../N8nTooltip';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nCheckbox,
	N8nInput,
	N8nScrollArea,
} from '..';
import {
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuRoot,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from 'reka-ui';
import { ref, computed } from 'vue';

interface FilterOption {
	label: string;
	options: string[];
	type: 'single' | 'multi';
}

interface ActiveFilter {
	filterName: string;
	values: string[];
	type: 'single' | 'multi';
}

const activeFilters = ref<ActiveFilter[]>([]);
const searchQueries = ref<Record<string, string>>({});

const filterOptions: FilterOption[] = [
	{
		label: 'Status',
		options: ['Active', 'Deactivated', 'Archived'],
		type: 'single',
	},
	{
		label: 'Tag',
		options: [
			...Array(100)
				.keys()
				.map((_, i) => `Tag ${i + 1}`),
		],
		type: 'multi',
	},
	{
		label: 'Owner',
		options: ['User 1', 'User 2', 'User 3'],
		type: 'single',
	},
];

console.log('filterOptions', filterOptions);
const hasActiveFilters = computed(() => activeFilters.value.length > 0);

function selectFilterValue(filterName: string, value: string, type: 'single' | 'multi') {
	const existingFilterIndex = activeFilters.value.findIndex(
		(filter) => filter.filterName === filterName,
	);

	if (type === 'single') {
		if (existingFilterIndex >= 0) {
			activeFilters.value[existingFilterIndex].values = [value];
		} else {
			activeFilters.value.push({
				filterName,
				values: [value],
				type: 'single',
			});
		}
	} else {
		if (existingFilterIndex >= 0) {
			const currentValues = activeFilters.value[existingFilterIndex].values;
			const valueIndex = currentValues.indexOf(value);

			if (valueIndex >= 0) {
				currentValues.splice(valueIndex, 1);
				if (currentValues.length === 0) {
					activeFilters.value.splice(existingFilterIndex, 1);
				}
			} else {
				currentValues.push(value);
			}
		} else {
			activeFilters.value.push({
				filterName,
				values: [value],
				type: 'multi',
			});
		}
	}
}

function isValueSelected(filterName: string, value: string): boolean {
	const filter = activeFilters.value.find((f) => f.filterName === filterName);
	return filter ? filter.values.includes(value) : false;
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

function getFilteredOptions(filterLabel: string, options: string[]) {
	const searchQuery = searchQueries.value[filterLabel] || '';
	if (!searchQuery.trim()) {
		return options;
	}
	return options.filter((option) => option.toLowerCase().includes(searchQuery.toLowerCase()));
}

function updateSearchQuery(filterLabel: string, query: string) {
	searchQueries.value[filterLabel] = query;
}

function handleCheckboxChange(
	filterName: string,
	value: string,
	type: 'single' | 'multi',
	checked: boolean,
) {
	if (type === 'multi') {
		if (checked) {
			// Add the value if checked
			const existingFilterIndex = activeFilters.value.findIndex(
				(filter) => filter.filterName === filterName,
			);
			if (existingFilterIndex >= 0) {
				const currentValues = activeFilters.value[existingFilterIndex].values;
				if (!currentValues.includes(value)) {
					currentValues.push(value);
				}
			} else {
				activeFilters.value.push({
					filterName,
					values: [value],
					type: 'multi',
				});
			}
		} else {
			// Remove the value if unchecked
			const existingFilterIndex = activeFilters.value.findIndex(
				(filter) => filter.filterName === filterName,
			);
			if (existingFilterIndex >= 0) {
				const currentValues = activeFilters.value[existingFilterIndex].values;
				const valueIndex = currentValues.indexOf(value);
				if (valueIndex >= 0) {
					currentValues.splice(valueIndex, 1);
					if (currentValues.length === 0) {
						activeFilters.value.splice(existingFilterIndex, 1);
					}
				}
			}
		}
	}
}
</script>

<template>
	<div class="filters-wrapper">
		<div class="toolbar">
			<!-- Active Filters -->
			<div v-if="hasActiveFilters" class="active-filters">
				<div v-for="filter in activeFilters" :key="filter.filterName" class="filter-tags">
					<button class="filter-tag" @click="removeFilter(filter.filterName)">
						<N8nText size="small" color="text-light">{{ filter.filterName }} is</N8nText>
						<N8nText bold size="small" color="text-base">{{ filter.values.join(', ') }}</N8nText>
						<N8nIcon icon="x" color="text-dark" />
					</button>
				</div>
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
					<DropdownMenuContent class="filter-sub-content">
						<template v-for="filterOption in filterOptions" :key="filterOption.label">
							<DropdownMenuSub>
								<DropdownMenuSubTrigger class="filter-sub-trigger">
									<N8nText size="small" color="text-dark">
										{{ filterOption.label }}
									</N8nText></DropdownMenuSubTrigger
								>
								<DropdownMenuPortal>
									<DropdownMenuSubContent class="filter-sub-content filter-sub-content-enhanced">
										<!-- Search Bar -->
										<div class="filter-search-container" v-if="filterOption.options.length > 10">
											<N8nInput
												:modelValue="searchQueries[filterOption.label] || ''"
												@update:modelValue="
													(value: string) => updateSearchQuery(filterOption.label, value)
												"
												type="text"
												size="small"
												placeholder="Search..."
												:clearable="true"
												class="filter-search-input"
											>
												<template #prefix>
													<N8nIcon icon="search" size="small" />
												</template>
											</N8nInput>
										</div>

										<!-- Scrollable Options Area -->
										<N8nScrollArea
											maxHeight="600px"
											type="hover"
											:enableVerticalScroll="true"
											:enableHorizontalScroll="false"
											class="filter-options-scroll-area"
										>
											<template
												v-for="option in getFilteredOptions(
													filterOption.label,
													filterOption.options,
												)"
												:key="option"
											>
												<DropdownMenuItem
													class="filter-option-item"
													:class="{ selected: isValueSelected(filterOption.label, option) }"
												>
													<!-- Checkbox for multi-select filters -->
													<N8nCheckbox
														v-if="filterOption.type === 'multi'"
														:modelValue="isValueSelected(filterOption.label, option)"
														@update:modelValue="
															(checked: boolean | string | number) =>
																handleCheckboxChange(
																	filterOption.label,
																	option,
																	filterOption.type,
																	Boolean(checked),
																)
														"
														@click.stop
														class="filter-checkbox"
													/>
													<!-- Check icon for single-select filters -->
													<N8nIcon
														v-else-if="isValueSelected(filterOption.label, option)"
														icon="check"
														size="small"
														class="check-icon"
													/>
													<!-- Spacer for single-select unselected items -->
													<div v-else class="check-icon-spacer"></div>

													<!-- Clickable text area -->
													<span
														@click="
															selectFilterValue(filterOption.label, option, filterOption.type)
														"
														class="filter-option-text"
													>
														<N8nText size="small" color="text-dark">
															{{ option }}
														</N8nText>
													</span>
												</DropdownMenuItem>
											</template>
										</N8nScrollArea>
									</DropdownMenuSubContent>
								</DropdownMenuPortal>
							</DropdownMenuSub>
						</template>
					</DropdownMenuContent>
				</DropdownMenuPortal>
			</DropdownMenuRoot>

			<N8nTooltip content="Search">
				<N8nIconButton type="tertiary" icon="search" text />
			</N8nTooltip>
			<N8nTooltip content="Sort">
				<N8nIconButton type="tertiary" icon="arrow-up-down" text />
			</N8nTooltip>
			<N8nTooltip content="Add folder">
				<N8nIconButton type="tertiary" icon="folder-plus" text />
			</N8nTooltip>
			<N8nButton size="small">Create workflow</N8nButton>
			<N8nTooltip content="More actions">
				<N8nIconButton type="tertiary" icon="ellipsis" text />
			</N8nTooltip>
		</div>
	</div>
</template>

<style scoped lang="scss">
.filters-wrapper {
	display: flex;
	align-items: end;
	width: 100vw;
}

.filter-button {
	padding: 0;
	background-color: transparent;
	border: none;
	outline: none;
}

.toolbar {
	padding: var(--spacing-m);
	background-color: var(--color-background-light);
	display: flex;
	justify-content: end;
	align-items: center;
	gap: var(--spacing-s);
	width: 100%;
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
}

.active {
	background-color: var(--color-primary-tint-2);
	color: var(--color-primary);
}

.active-filters {
	display: flex;
	gap: var(--spacing-2xs);
}

.active-filters-label {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-light);
	text-transform: uppercase;
}

.filter-tags {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-2xs);
}

.filter-tag {
	outline: none;
	border: none;
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
	background-color: var(--color-background-base);

	border-radius: var(--border-radius-base);
	padding: var(--spacing-3xs) var(--spacing-3xs);
	height: 30px;
	font-size: var(--font-size-2xs);

	&:hover {
		background-color: var(--color-background-xlight);
		cursor: pointer;
	}
}

.filter-name {
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
}

.filter-values {
	color: var(--color-text-light);
}

.remove-filter {
	margin-left: var(--spacing-4xs);
	opacity: 0.6;

	&:hover {
		opacity: 1;
		background-color: var(--color-danger-tint-2);
		color: var(--color-danger);
	}
}

:deep(.filters-dropdown-content) {
	box-shadow: var(--box-shadow-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-xlight);
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
}

.filters-header {
	margin-bottom: var(--spacing-s);
}

.filters-title {
	margin: 0;
	font-size: var(--font-size-l);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-dark);
}

.filter-sub-trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-3xs) var(--spacing-2xs);
	border-radius: var(--border-radius-small);
	color: var(--color-text-base);
	cursor: pointer;
	transition: background-color 0.2s ease;
	letter-spacing: 0.5px;

	&:hover {
		background-color: var(--color-background-base);
	}
}

:deep(.filter-sub-content) {
	padding: var(--spacing-3xs);
	min-width: 160px;
	box-shadow: var(--box-shadow-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-xlight);
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
}

.filter-search-container {
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
}

:deep(.filter-search-input) {
	.el-input__inner {
		font-size: var(--font-size-2xs);
		height: 28px;
	}

	.el-input__prefix {
		align-items: center;
	}
}

.filter-options-scroll-area {
	padding: var(--spacing-4xs) 0;
}

.filter-option-item {
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
	padding: var(--spacing-3xs) var(--spacing-2xs);
	border-radius: var(--border-radius-small);
	font-size: var(--font-size-s);
	margin-bottom: 2px;
	cursor: pointer;
	transition: background-color 0.2s ease;
	position: relative;

	&:hover,
	&:focus {
		background-color: var(--color-background-base);
	}

	&.selected {
		background-color: var(--color-background-base);

		.check-icon {
			color: var(--color-success);
		}
	}
}

.filter-checkbox {
	flex-shrink: 0;
	margin-right: var(--spacing-4xs);
	margin-bottom: 0;

	:deep(.el-checkbox__inner) {
		width: 14px;
		height: 14px;
	}

	:deep(.el-checkbox__label) {
		display: none;
	}
}

.filter-option-text {
	flex: 1;
	cursor: pointer;
	display: flex;
	align-items: center;
}

.filter-separator {
	margin: var(--spacing-3xs) 0;
	border-top: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
}

.clear-all-container {
	padding: var(--spacing-3xs) var(--spacing-xs);
}

.clear-all-section {
	margin-top: var(--spacing-3xs);
}

.clear-all-btn {
	width: 100%;
	justify-content: center;
	gap: var(--spacing-2xs);
}

// Prevent dropdown from closing when interacting with checkboxes
:deep(.filter-checkbox .el-checkbox) {
	pointer-events: auto;
}

:deep(.filter-checkbox .el-checkbox__input) {
	pointer-events: auto;
}
</style>
