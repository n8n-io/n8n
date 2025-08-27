<script lang="ts" setup>
import N8nTooltip from '../N8nTooltip';
import { N8nButton, N8nIcon, N8nIconButton } from '..';
import N8nPopoverReka from '../N8nPopoverReka/N8nPopoverReka.vue';
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
const filtersOpen = ref(false);

function toggleFilters() {
	filtersOpen.value = !filtersOpen.value;
}

const filterOptions: FilterOption[] = [
	{
		label: 'Status',
		options: ['active', 'deactivated', 'archived'],
		type: 'single',
	},
	{
		label: 'Tag',
		options: ['tag 1', 'tag 2', 'tag 3'],
		type: 'multi',
	},
	{
		label: 'Owner',
		options: ['user 1', 'user 2', 'user 3'],
		type: 'single',
	},
];

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

function clearAllFilters() {
	activeFilters.value = [];
}
</script>

<template>
	<div class="filters-wrapper">
		<div class="toolbar">
			<N8nTooltip content="Search">
				<N8nIconButton type="tertiary" icon="search" text />
			</N8nTooltip>
			<N8nTooltip content="Sort">
				<N8nIconButton type="tertiary" icon="arrow-up-down" text />
			</N8nTooltip>

			<!-- Filters Popover -->
			<N8nPopoverReka
				:open="filtersOpen"
				@update:open="toggleFilters"
				width="280px"
				max-height="400px"
			>
				<template #trigger>
					<N8nTooltip content="Filter">
						<N8nIconButton
							type="tertiary"
							icon="list-filter"
							text
							:class="{ active: hasActiveFilters }"
							@click="toggleFilters"
						/>
					</N8nTooltip>
				</template>
				<template #content>
					<div class="filters-popover">
						<h3 class="filters-title">Filters</h3>

						<div class="filter-sections">
							<div
								v-for="filterOption in filterOptions"
								:key="filterOption.label"
								class="filter-section"
							>
								<h4 class="filter-section-title">{{ filterOption.label }}</h4>

								<div v-if="filterOption.type === 'single'" class="filter-options">
									<div
										v-for="option in filterOption.options"
										:key="option"
										class="filter-option single"
										:class="{ selected: isValueSelected(filterOption.label, option) }"
										@click="selectFilterValue(filterOption.label, option, 'single')"
									>
										<N8nIcon
											v-if="isValueSelected(filterOption.label, option)"
											icon="check"
											size="small"
											class="check-icon"
										/>
										<span>{{ option }}</span>
									</div>
								</div>

								<div v-else class="filter-options">
									<label
										v-for="option in filterOption.options"
										:key="option"
										class="filter-option multi"
										:class="{ selected: isValueSelected(filterOption.label, option) }"
									>
										<input
											type="checkbox"
											:checked="isValueSelected(filterOption.label, option)"
											@change="selectFilterValue(filterOption.label, option, 'multi')"
											class="checkbox"
										/>
										<N8nIcon
											v-if="isValueSelected(filterOption.label, option)"
											icon="check"
											size="small"
											class="check-icon"
										/>
										<span>{{ option }}</span>
									</label>
								</div>
							</div>
						</div>

						<div v-if="hasActiveFilters" class="clear-all-section">
							<N8nButton
								type="secondary"
								size="small"
								@click="clearAllFilters"
								class="clear-all-btn"
							>
								<N8nIcon icon="trash-2" size="small" />
								Clear all filters
							</N8nButton>
						</div>
					</div>
				</template>
			</N8nPopoverReka>

			<N8nTooltip content="Add folder">
				<N8nIconButton type="tertiary" icon="folder-plus" text />
			</N8nTooltip>
			<N8nButton size="small">Create workflow</N8nButton>
			<N8nTooltip content="More actions">
				<N8nIconButton type="tertiary" icon="ellipsis" text />
			</N8nTooltip>
		</div>

		<!-- Active Filters Display -->
		<div v-if="hasActiveFilters" class="active-filters">
			<div class="active-filters-header">
				<span class="active-filters-label">Active Filters:</span>
				<N8nButton type="tertiary" size="mini" @click="clearAllFilters"> Clear all </N8nButton>
			</div>
			<div class="filter-tags">
				<div v-for="filter in activeFilters" :key="filter.filterName" class="filter-tag">
					<span class="filter-name">{{ filter.filterName }}:</span>
					<span class="filter-values">{{ filter.values.join(', ') }}</span>
					<N8nIconButton
						type="tertiary"
						icon="x"
						size="mini"
						@click="removeFilter(filter.filterName)"
						class="remove-filter"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.filters-wrapper {
	width: 100%;
}

.toolbar {
	padding: var(--spacing-m);
	background-color: var(--color-background-light);
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing-s);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
}

.active {
	background-color: var(--color-primary-tint-2);
	color: var(--color-primary);
}

.active-filters {
	padding: var(--spacing-s) var(--spacing-m);
	background-color: var(--color-background-xlight);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
}

.active-filters-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing-2xs);
}

.active-filters-label {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-light);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.filter-tags {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-2xs);
}

.filter-tag {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	background-color: var(--color-background-base);
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	padding: var(--spacing-4xs) var(--spacing-2xs);
	font-size: var(--font-size-2xs);
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

.filters-popover {
	padding: var(--spacing-m);
}

.filters-title {
	margin: 0 0 var(--spacing-s) 0;
	font-size: var(--font-size-l);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-dark);
}

.filter-sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.filter-section {
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
	padding-bottom: var(--spacing-s);

	&:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}
}

.filter-section-title {
	margin: 0 0 var(--spacing-xs) 0;
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.filter-options {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-3xs);
}

.filter-option {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	padding: var(--spacing-2xs) var(--spacing-xs);
	border-radius: var(--border-radius-small);
	font-size: var(--font-size-s);
	cursor: pointer;
	transition: background-color 0.2s ease;

	&:hover {
		background-color: var(--color-background-base);
	}

	&.selected {
		background-color: var(--color-primary-tint-3);
		color: var(--color-primary);
	}

	&.single {
		padding-left: var(--spacing-l);
		position: relative;

		.check-icon {
			position: absolute;
			left: var(--spacing-xs);
		}
	}

	&.multi {
		.checkbox {
			opacity: 0;
			position: absolute;
		}

		.check-icon {
			color: var(--color-primary);
		}
	}
}

.clear-all-section {
	margin-top: var(--spacing-s);
	padding-top: var(--spacing-s);
	border-top: var(--border-width-base) var(--border-style-base) var(--color-foreground-light);
}

.clear-all-btn {
	width: 100%;
	justify-content: center;
	gap: var(--spacing-2xs);
}
</style>
