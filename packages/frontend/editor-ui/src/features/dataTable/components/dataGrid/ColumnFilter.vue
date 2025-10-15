<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { IFilterParams } from 'ag-grid-community';
import { N8nSelect, N8nOption, N8nInput, N8nButton } from '@n8n/design-system';
import ElDatePickerFilter from '@/features/dataTable/components/dataGrid/ElDatePickerFilter.vue';
import type {
	FilterModel,
	FilterOperation,
} from '@/features/dataTable/types/dataTableFilters.types';
import { useI18n } from '@n8n/i18n';

type ColumnFilterModel = FilterModel[string] | null;

const props = defineProps<{ params: IFilterParams }>();

const i18n = useI18n();

const currentModel = ref<ColumnFilterModel>(null);
const isActive = ref(false);

const filterType = computed(() => {
	return props.params.colDef.cellDataType;
});

type GridFilterOption = { displayKey: string; displayName: string };
type FilterOption = { key: string; label: string };

const availableOptions = computed<FilterOption[]>(() => {
	const opts = props.params.colDef.filterParams?.filterOptions as GridFilterOption[];
	if (!opts || opts.length === 0) {
		return [];
	}
	return opts.map((o) => {
		return {
			key: o.displayKey,
			label: o.displayName,
		};
	});
});

const selectedType = ref<string>(availableOptions.value[0]?.key ?? 'contains');
const numberOfInputs = computed(() => inferInputsForKey(selectedType.value));

const inputValue = ref<string>('');
const inputValueTo = ref<string>('');
const inputPath = ref<string>('');

// Date picker refs and params
const singleDatePicker = ref<InstanceType<typeof ElDatePickerFilter>>();
const startDatePicker = ref<InstanceType<typeof ElDatePickerFilter>>();
const endDatePicker = ref<InstanceType<typeof ElDatePickerFilter>>();

const onSingleDateChange = () => {
	const d = singleDatePicker.value?.getDate?.();
	inputValue.value = d ? new Date(d).toISOString() : '';
};

const onStartDateChange = () => {
	const d = startDatePicker.value?.getDate?.();
	inputValue.value = d ? new Date(d).toISOString() : '';
};

const onEndDateChange = () => {
	const d = endDatePicker.value?.getDate?.();
	inputValueTo.value = d ? new Date(d).toISOString() : '';
};

// AG Grid calls into these methods through the component instance
function getModel(): ColumnFilterModel {
	return currentModel.value;
}

function updateModel() {
	const model = buildModel();
	currentModel.value = model;
	isActive.value = Boolean(model);
	props.params.filterChangedCallback();
}

function isFilterActive(): boolean {
	return isActive.value;
}

function inferInputsForKey(key: FilterOperation): 0 | 1 | 2 {
	if (key === 'between' || key === 'inRange') return 2;
	if (
		key === 'null' ||
		key === 'notNull' ||
		key === 'isEmpty' ||
		key === 'notEmpty' ||
		key === 'true' ||
		key === 'false'
	)
		return 0;
	return 1;
}

// Expose the interface methods to AG Grid
defineExpose({
	getModel,
	setModel: () => {},
	isFilterActive,
	doesFilterPass: () => true,
	afterGuiAttached: () => {},
});

function buildModel(): ColumnFilterModel {
	const kind = filterType.value;
	const type = selectedType.value;
	const selected = availableOptions.value.find((o) => o.key === type);
	if (!selected || selected.key === 'empty') return null;
	if (
		inputValue.value === '' &&
		inputValueTo.value === '' &&
		numberOfInputs.value > 0 &&
		inputPath.value === ''
	) {
		return null;
	}

	if (kind === 'json') {
		if (inputValue.value === '' && numberOfInputs.value > 0) return null;
		return {
			filterType: 'json',
			type,
			filter: numberOfInputs.value > 0 ? inputValue.value : undefined,
			path: inputPath.value,
		} as ColumnFilterModel;
	}

	if (numberOfInputs.value === 0) {
		return { filterType: kind, type } as ColumnFilterModel;
	}

	if (kind === 'text' || kind === 'boolean') {
		return {
			filterType: 'text',
			type,
			filter: inputValue.value,
			path: inputPath.value,
		} as ColumnFilterModel;
	}

	if (kind === 'number') {
		if (numberOfInputs.value === 1) {
			if (inputValue.value === '') return null;
			const n = Number(inputValue.value);
			if (Number.isNaN(n)) return null;
			return { filterType: 'number', type, filter: n } as ColumnFilterModel;
		}
		if (numberOfInputs.value === 2) {
			if (inputValue.value === '' || inputValueTo.value === '') return null;
			const from = Number(inputValue.value);
			const to = Number(inputValueTo.value);
			if (Number.isNaN(from) || Number.isNaN(to)) return null;
			return { filterType: 'number', type, filter: from, filterTo: to } as ColumnFilterModel;
		}
	}

	if (kind === 'date') {
		if (numberOfInputs.value === 1) {
			if (inputValue.value === '') return null;
			return { filterType: 'date', type, dateFrom: inputValue.value } as ColumnFilterModel;
		}
		if (numberOfInputs.value === 2) {
			if (inputValue.value === '' || inputValueTo.value === '') return null;
			return {
				filterType: 'date',
				type,
				dateFrom: inputValue.value,
				dateTo: inputValueTo.value,
			} as ColumnFilterModel;
		}
	}

	return null;
}

function onReset() {
	inputValue.value = '';
	inputValueTo.value = '';
	selectedType.value = availableOptions.value[0]?.key;
	singleDatePicker.value?.setDate?.(null);
	startDatePicker.value?.setDate?.(null);
	endDatePicker.value?.setDate?.(null);
}

watch([selectedType, inputValue, inputValueTo, filterType, inputPath], updateModel);
</script>

<template>
	<div class="ag-custom-filter ag-custom-component-popup">
		<N8nInput
			v-if="filterType === 'json'"
			v-model="inputPath"
			size="small"
			:placeholder="i18n.baseText('dataTable.filters.path')"
		/>
		<N8nSelect
			v-model="selectedType"
			size="small"
			:popper-append-to-body="false"
			popper-class="ag-custom-component-popup"
		>
			<N8nOption
				v-for="opt in availableOptions"
				:key="opt.key"
				:label="opt.label"
				:value="opt.key"
			/>
		</N8nSelect>

		<div v-if="numberOfInputs === 1" class="ag-filter-inputs">
			<ElDatePickerFilter
				v-if="filterType === 'date'"
				ref="singleDatePicker"
				:on-change="onSingleDateChange"
			/>
			<N8nInput
				v-else
				v-model="inputValue"
				:type="filterType === 'number' ? 'number' : 'text'"
				size="small"
				:placeholder="i18n.baseText('dataTable.filters.placeholder')"
			/>
		</div>

		<div v-if="numberOfInputs === 2" class="ag-filter-inputs">
			<template v-if="filterType === 'number'">
				<N8nInput
					v-model="inputValue"
					type="number"
					size="small"
					:placeholder="i18n.baseText('generic.from')"
				/>
				<N8nInput
					v-model="inputValueTo"
					type="number"
					size="small"
					:placeholder="i18n.baseText('generic.to')"
				/>
			</template>
			<template v-else>
				<ElDatePickerFilter ref="startDatePicker" :on-change="onStartDateChange" />
				<ElDatePickerFilter ref="endDatePicker" :on-change="onEndDateChange" />
			</template>
		</div>

		<div class="ag-filter-buttons">
			<N8nButton text size="small" @click="onReset">{{ i18n.baseText('generic.reset') }}</N8nButton>
		</div>
	</div>
</template>

<style lang="scss">
.ag-custom-filter {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	width: 200px;

	.ag-filter-inputs {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing--2xs);
	}
	.ag-filter-buttons {
		display: flex;
		justify-content: flex-end;
	}
}
</style>
