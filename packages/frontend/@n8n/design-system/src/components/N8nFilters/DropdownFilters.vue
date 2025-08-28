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
import { ref, computed, useTemplateRef, nextTick } from 'vue';
import type { FilterOption, FilterAction } from './Filters.vue';
import InlineTextEdit from '../N8nInlineTextEdit/InlineTextEdit.vue';

interface ActiveFilter {
	filterName: string;
	values: string[];
	type: 'single' | 'multi';
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
const searchQueries = ref<Record<string, string>>({});
const customInputs = ref<Record<string, string>>({});

const filterOptions = computed(() => props.filters);
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

function addCustomValue(filterName: string, type: 'single' | 'multi') {
	const customValue = customInputs.value[filterName]?.trim();
	if (!customValue) return;

	selectFilterValue(filterName, customValue, type);
	customInputs.value[filterName] = '';
}

function handleCustomInputKeyup(
	filterName: string,
	type: 'single' | 'multi',
	event: KeyboardEvent,
) {
	if (event.key === 'Enter') {
		addCustomValue(filterName, type);
	}
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
									<DropdownMenuSubContent class="filter-dropdown">
										<!-- Search Bar -->
										<div v-if="filterOption.options.length > 10">
											<N8nInput
												:modelValue="searchQueries[filterOption.label] || ''"
												@update:modelValue="
													(value: string) => updateSearchQuery(filterOption.label, value)
												"
												type="text"
												size="small"
												placeholder="Search..."
												:clearable="true"
											>
												<template #prefix>
													<N8nIcon icon="search" size="small" />
												</template>
											</N8nInput>
										</div>

										<!-- Custom Value Input -->
										<div v-if="filterOption.allowCustomValues">
											<N8nInput
												v-model="customInputs[filterOption.label]"
												type="text"
												size="small"
												:placeholder="`Add custom ${filterOption.label.toLowerCase()}...`"
												@keyup="
													(event: KeyboardEvent) =>
														handleCustomInputKeyup(filterOption.label, filterOption.type, event)
												"
											>
											</N8nInput>
										</div>

										<!-- Scrollable Options Area -->
										<N8nScrollArea
											maxHeight="500px"
											type="hover"
											:enableVerticalScroll="true"
											:enableHorizontalScroll="false"
										>
											<template
												v-for="option in getFilteredOptions(
													filterOption.label,
													filterOption.options,
												)"
												:key="option"
											>
												<DropdownMenuItem
													class="filter-item"
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
	background-color: var(--color-background-xlight);
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
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

	&:hover {
		background-color: var(--color-background-base);
	}
}

.filter-checkbox {
	flex-shrink: 0;
	margin-bottom: 0;
}

.filter-option-text {
	flex: 1;
	cursor: pointer;
	display: flex;
	align-items: center;
}

// Prevent dropdown from closing when interacting with checkboxes
:deep(.filter-checkbox .el-checkbox) {
	pointer-events: auto;
}

:deep(.filter-checkbox .el-checkbox__input) {
	pointer-events: auto;
}

.custom-input-container {
	padding: var(--spacing-4xs);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
	margin-bottom: var(--spacing-4xs);
}

:deep(.custom-value-input) {
	.el-input__inner {
		font-size: var(--font-size-2xs);
		height: 28px;
	}

	.el-input__suffix {
		align-items: center;
	}
}
</style>
