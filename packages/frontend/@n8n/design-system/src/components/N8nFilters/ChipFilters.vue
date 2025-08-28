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
	DropdownMenuTrigger,
} from 'reka-ui';
import { ref, computed } from 'vue';
import type { FilterOption, FilterAction } from './Filters.vue';

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

function selectFilterValue(filterName: string, value: string, type: 'single' | 'multi') {
	const existingFilterIndex = activeFilters.value.findIndex(
		(filter) => filter.filterName === filterName,
	);

	if (type === 'single') {
		if (existingFilterIndex >= 0) {
			// If the same value is selected again, clear the filter
			if (activeFilters.value[existingFilterIndex].values.includes(value)) {
				activeFilters.value.splice(existingFilterIndex, 1);
			} else {
				activeFilters.value[existingFilterIndex].values = [value];
			}
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

function getActiveFilter(filterName: string): ActiveFilter | undefined {
	return activeFilters.value.find((f) => f.filterName === filterName);
}
</script>

<template>
	<div class="toolbar">
		<!-- Individual Filter Type Tags -->
		<div class="filters">
			<template v-for="filterOption in filterOptions" :key="filterOption.label">
				<DropdownMenuRoot>
					<DropdownMenuTrigger class="filter-button">
						<button
							class="filter-tag filter-type-tag"
							:class="{ active: getActiveFilter(filterOption.label) }"
						>
							<template v-if="getActiveFilter(filterOption.label)">
								<N8nText size="small" color="text-light">{{ filterOption.label }}:</N8nText>
								<N8nText bold size="small" color="text-base">
									{{ getActiveFilter(filterOption.label)!.values.join(', ') }}
								</N8nText>
							</template>
							<template v-else>
								<N8nText size="small" color="text-base">{{ filterOption.label }}</N8nText>
							</template>
							<N8nIcon color="text-base" icon="chevron-down" size="small" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuPortal>
						<DropdownMenuContent align="end" class="filter-sub-content filter-sub-content-enhanced">
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
										(event) => handleCustomInputKeyup(filterOption.label, filterOption.type, event)
									"
								>
									<template #suffix>
										<N8nIconButton
											@click="addCustomValue(filterOption.label, filterOption.type)"
											icon="plus"
											size="xmini"
											type="tertiary"
											text
											:disabled="!customInputs[filterOption.label]?.trim()"
										/>
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
									v-for="option in getFilteredOptions(filterOption.label, filterOption.options)"
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

										<!-- Spacer for single-select unselected items -->
										<div v-else class="check-icon-spacer"></div>

										<!-- Clickable text area -->
										<span
											@click="selectFilterValue(filterOption.label, option, filterOption.type)"
											class="filter-option-text"
										>
											<N8nText size="small" color="text-dark">
												{{ option }}
											</N8nText>
										</span>

										<N8nIconButton
											v-if="isValueSelected(filterOption.label, option)"
											@click="selectFilterValue(filterOption.label, option, filterOption.type)"
											icon="x"
											size="xmini"
											type="tertiary"
											text
										/>
									</DropdownMenuItem>
								</template>
							</N8nScrollArea>
						</DropdownMenuContent>
					</DropdownMenuPortal>
				</DropdownMenuRoot>
			</template>
		</div>
		<template v-for="action in props.actions" :key="action.label">
			<N8nTooltip :content="action.tooltip || action.label">
				<N8nIconButton type="tertiary" :icon="action.icon" text />
			</N8nTooltip>
		</template>
		<N8nTooltip v-if="!noTertiaryActions" content="More actions">
			<N8nIconButton type="tertiary" icon="ellipsis" text />
		</N8nTooltip>
		<N8nButton v-if="primaryActionText" size="small">{{ props.primaryActionText }}</N8nButton>
	</div>
</template>

<style scoped lang="scss">
.filter-button {
	padding: 0;
	background-color: transparent;
	border: none;
	outline: none;
}

.toolbar {
	display: flex;
	justify-content: end;
	align-items: center;
	gap: var(--spacing-s);
	width: 100%;
}

.filter-tag {
	outline: none;
	border: none;
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
	background-color: var(--color-background-base);

	border-radius: var(--border-radius-base);
	padding: var(--spacing-4xs);
	height: 30px;
	font-size: var(--font-size-2xs);

	&:hover {
		background-color: var(--color-background-xlight);
		cursor: pointer;
	}
}

.filter-type-tag {
	background-color: var(--color-background-xlight);
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
	padding: var(--spacing-4xs);

	&:hover {
		background-color: var(--color-background-light);
		border-color: var(--color-foreground-base);
	}

	&.active {
		background-color: var(--color-callout-secondary-background);
		border-color: var(--color-callout-secondary-border);
	}
}

.filters {
	display: flex;
	gap: var(--spacing-2xs);
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

	&:hover {
		background-color: var(--color-background-base);
	}
}

:deep(.filter-sub-content) {
	padding: var(--spacing-4xs);
	min-width: 160px;
	box-shadow: var(--box-shadow-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-xlight);
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
	z-index: 8000;
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
