<script lang="ts" setup>
import {
	DropdownMenuContent,
	DropdownMenuPortal,
	DropdownMenuRoot,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	FocusScope,
} from 'reka-ui';
import { ref, computed } from 'vue';

import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import DatePickerV2 from './DatePickerV2.vue';
import MultiSelect from './MultiSelect.vue';
import SingleSelect from './SingleSelect.vue';
import StringFilter from './StringFilter.vue';

interface ActiveFilter {
	filterName: string;
	values: FilterItem[];
	type: 'single' | 'multi' | 'date' | 'string';
}

interface FilterOption {
	label: string;
	options: FilterItem[];
	type: 'single' | 'multi' | 'date' | 'string';
	allowCustomValues?: boolean;
	minValue?: string; // For date filters: ISO date string
	maxValue?: string; // For date filters: ISO date string
}

interface FilterItem {
	name: string;
	id: string;
	value: string;
	condition?: {
		id: string;
		label: string;
	};
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
	const filterToUpdate = activeFilters.value.find((f) => f.filterName === filterName);

	if (!filterToUpdate) {
		activeFilters.value.push({
			filterName,
			values: value ? [value] : [],
			type: 'single',
		});
		return;
	}

	if (!value || filterToUpdate.values[0]?.id === value.id) {
		activeFilters.value = activeFilters.value.filter((f) => f.filterName !== filterName);
		return;
	}

	activeFilters.value = activeFilters.value.map((f) =>
		f.filterName === filterName ? { ...f, values: [value] } : f,
	);
}

function handleMultiSelectChange(filterName: string, values: FilterItem[]) {
	const filterToUpdate = activeFilters.value.find((f) => f.filterName === filterName);

	if (!filterToUpdate) {
		activeFilters.value.push({
			filterName,
			values,
			type: 'multi',
		});
		return;
	}

	if (values.length === 0) {
		activeFilters.value = activeFilters.value.filter((f) => f.filterName !== filterName);
		return;
	}

	activeFilters.value = activeFilters.value.map((f) =>
		f.filterName === filterName ? { ...f, values } : f,
	);
}

function handleDateChange(filterName: string, value: FilterItem | null) {
	const filterToUpdate = activeFilters.value.find((f) => f.filterName === filterName);

	if (!filterToUpdate) {
		if (value) {
			activeFilters.value.push({
				filterName,
				values: [value],
				type: 'date',
			});
		}
		return;
	}

	if (!value || filterToUpdate.values[0]?.id === value.id) {
		activeFilters.value = activeFilters.value.filter((f) => f.filterName !== filterName);
		return;
	}

	activeFilters.value = activeFilters.value.map((f) =>
		f.filterName === filterName ? { ...f, values: [value] } : f,
	);
}

function handleStringChange(filterName: string, value: FilterItem | null) {
	const filterToUpdate = activeFilters.value.find((f) => f.filterName === filterName);

	if (!filterToUpdate) {
		if (value) {
			activeFilters.value.push({
				filterName,
				values: [value],
				type: 'string',
			});
		}
		return;
	}

	if (!value || filterToUpdate.values[0]?.id === value.id) {
		activeFilters.value = activeFilters.value.filter((f) => f.filterName !== filterName);
		return;
	}

	activeFilters.value = activeFilters.value.map((f) =>
		f.filterName === filterName ? { ...f, values: [value] } : f,
	);
}

function removeFilter(filterName: string) {
	activeFilters.value = activeFilters.value.filter((f) => f.filterName !== filterName);
}

// TODO
// - Small variant

const datePickerRefs = new Map<string, any>();

function setDatePickerRef(label: string) {
	return (el: any) => {
		if (el) {
			datePickerRefs.set(label, el);
		} else {
			datePickerRefs.delete(label);
		}
	};
}

function handleDatePickerFocus(filterOption: FilterOption) {
	if (filterOption.type === 'date') {
		setTimeout(() => {
			const datePicker = datePickerRefs.get(filterOption.label);
			datePicker?.focusInto();
		}, 50);
	}
}
</script>

<template>
	<div class="placeholder">
		<div class="filters">
			<!-- Active Filters -->
			<div v-if="hasActiveFilters" class="filtersActiveList">
				<template v-for="filter in activeFilters" :key="filter.filterName">
					<button @click="() => removeFilter(filter.filterName)" class="filterChip active">
						<N8nText color="text-light" size="small">
							{{ filter.filterName }}
							{{
								filter.values[0]?.condition
									? ` ${filter.values[0].condition.label.toLowerCase()}`
									: ''
							}}:
						</N8nText>
						<N8nText bold size="small">
							{{ filter.values.map(({ name }) => name).join(', ') }}
						</N8nText>
						<N8nIcon color="text-light" icon="x" />
					</button>
				</template>
			</div>
			<!-- Filters Dropdown -->
			<DropdownMenuRoot>
				<DropdownMenuTrigger class="filterDropdownButton">
					<N8nTooltip content="Filter">
						<N8nIconButton
							type="tertiary"
							icon="list-filter"
							size="small"
							text
							:class="{ active: hasActiveFilters }"
						/>
					</N8nTooltip>
				</DropdownMenuTrigger>
				<DropdownMenuPortal>
					<DropdownMenuContent class="filterDropdown">
						<div class="filterDropdownContent">
							<template v-for="filterOption in filterOptions" :key="filterOption.label">
								<DropdownMenuSub>
									<DropdownMenuSubTrigger class="filterDropdownItem">
										<N8nText size="small" color="text-dark">
											{{ filterOption.label }}
										</N8nText></DropdownMenuSubTrigger
									>
									<DropdownMenuPortal>
										<DropdownMenuSubContent
											:side-offset="4"
											class="filterDropdown"
											@entry-focus="() => handleDatePickerFocus(filterOption)"
										>
											<SingleSelect
												v-if="filterOption.type === 'single'"
												:items="filterOption.options"
												:initial-item="
													activeFilters.find((f) => f.filterName === filterOption.label)?.values[0]
												"
												@update:model-value="
													(value: FilterItem | null) =>
														handleSingleSelectChange(filterOption.label, value)
												"
												:placeholder="`Select ${filterOption.label.toLowerCase()}...`"
											/>
											<MultiSelect
												v-else-if="filterOption.type === 'multi'"
												:items="filterOption.options"
												:initial-selected="
													activeFilters.find((f) => f.filterName === filterOption.label)?.values ||
													[]
												"
												@update:model-value="
													(values) => handleMultiSelectChange(filterOption.label, values)
												"
												:placeholder="`Select ${filterOption.label.toLowerCase()}...`"
											/>
											<FocusScope as-child loop v-else-if="filterOption.type === 'date'">
												<DatePickerV2
													:ref="setDatePickerRef(filterOption.label)"
													:initial-value="
														activeFilters.find((f) => f.filterName === filterOption.label)
															?.values[0]
													"
													:min-value="filterOption.minValue"
													:max-value="filterOption.maxValue"
													@update:model-value="
														(value: FilterItem | null) =>
															handleDateChange(filterOption.label, value)
													"
													:placeholder="`Select ${filterOption.label.toLowerCase()}...`"
												/>
											</FocusScope>
											<StringFilter
												v-else-if="filterOption.type === 'string'"
												:initial-value="
													activeFilters.find((f) => f.filterName === filterOption.label)?.values[0]
												"
												@update:model-value="
													(value: FilterItem | null) =>
														handleStringChange(filterOption.label, value)
												"
												:placeholder="`Enter ${filterOption.label.toLowerCase()}...`"
											/>
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>
							</template>
						</div>
					</DropdownMenuContent>
				</DropdownMenuPortal>
			</DropdownMenuRoot>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use './Filters.scss';

.placeholder {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	width: 100vw;
	padding: 30px;
}
</style>
