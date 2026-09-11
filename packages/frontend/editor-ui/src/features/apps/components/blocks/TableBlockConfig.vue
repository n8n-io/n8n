<script setup lang="ts">
import {
	N8nCheckbox,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nInputNumber,
	N8nOption,
	N8nSelect,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	FilterConditionSchema,
	type DataTableFilterConditionType,
	type TableBlock,
} from '@n8n/api-types';
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';

type TableBlockData = TableBlock['data'];

const props = defineProps<{
	modelValue: Partial<TableBlockData>;
	projectId: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: TableBlockData];
}>();

const i18n = useI18n();
const dataTableStore = useDataTableStore();

const CONDITIONS = FilterConditionSchema.options.map((option) => option.value);

onMounted(async () => {
	await dataTableStore.fetchDataTables(props.projectId, 1, 100);
});

const dataTableId = ref(props.modelValue.source?.dataTableId ?? '');
const selectedColumns = ref<string[]>(props.modelValue.columns ?? []);
const filterType = ref<'and' | 'or'>(props.modelValue.filter?.type ?? 'and');
const filterRows = reactive<
	Array<{ columnName: string; condition: DataTableFilterConditionType; value: string }>
>(
	(props.modelValue.filter?.filters ?? []).map((row) => ({
		columnName: row.columnName,
		condition: row.condition,
		value: String(row.value ?? ''),
	})),
);
const sortColumn = ref(props.modelValue.sortBy?.[0] ?? '');
const sortDirection = ref<'ASC' | 'DESC'>(props.modelValue.sortBy?.[1] ?? 'ASC');
const limit = ref(props.modelValue.limit ?? 50);
const editable = ref(props.modelValue.editable ?? false);
const deletable = ref(props.modelValue.deletable ?? false);

const availableColumns = computed(
	() => dataTableStore.dataTables.find((table) => table.id === dataTableId.value)?.columns ?? [],
);

function emitUpdate() {
	emit('update:modelValue', {
		source: { dataTableId: dataTableId.value },
		...(selectedColumns.value.length > 0 ? { columns: selectedColumns.value } : {}),
		...(filterRows.length > 0
			? {
					filter: {
						type: filterType.value,
						filters: filterRows.map((row) => ({ ...row })),
					},
				}
			: {}),
		...(sortColumn.value
			? { sortBy: [sortColumn.value, sortDirection.value] as [string, 'ASC' | 'DESC'] }
			: {}),
		limit: limit.value,
		...(editable.value ? { editable: true } : {}),
		...(deletable.value ? { deletable: true } : {}),
	});
}

const addFilterRow = () => filterRows.push({ columnName: '', condition: 'eq', value: '' });
const removeFilterRow = (index: number) => filterRows.splice(index, 1);

watch(
	[dataTableId, selectedColumns, filterType, sortColumn, sortDirection, limit, editable, deletable],
	emitUpdate,
);
watch(filterRows, emitUpdate, { deep: true });
</script>

<template>
	<div :class="$style.container" data-test-id="table-block-config">
		<N8nInputLabel
			:label="i18n.baseText('apps.block.table.dataTable.label')"
			input-name="table-data-table"
		>
			<N8nSelect
				v-model="dataTableId"
				size="medium"
				filterable
				data-test-id="table-block-data-table-select"
			>
				<N8nOption
					v-for="table in dataTableStore.dataTables"
					:key="table.id"
					:value="table.id"
					:label="table.name"
				/>
			</N8nSelect>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('apps.block.table.columns.label')"
			input-name="table-columns"
		>
			<N8nSelect
				v-model="selectedColumns"
				size="medium"
				multiple
				filterable
				data-test-id="table-block-columns-select"
			>
				<N8nOption
					v-for="column in availableColumns"
					:key="column.id"
					:value="column.name"
					:label="column.name"
				/>
			</N8nSelect>
		</N8nInputLabel>

		<div :class="$style.filterHeader">
			<N8nInputLabel
				:label="i18n.baseText('apps.block.table.filter.label')"
				input-name="table-filter-type"
			/>
			<N8nSelect
				v-model="filterType"
				size="medium"
				:class="$style.filterTypeSelect"
				data-test-id="table-block-filter-type"
			>
				<N8nOption value="and" label="AND" />
				<N8nOption value="or" label="OR" />
			</N8nSelect>
		</div>
		<div v-for="(row, index) in filterRows" :key="index" :class="$style.filterRow">
			<N8nSelect
				v-model="row.columnName"
				size="medium"
				filterable
				:placeholder="i18n.baseText('apps.block.table.filter.column')"
			>
				<N8nOption
					v-for="column in availableColumns"
					:key="column.id"
					:value="column.name"
					:label="column.name"
				/>
			</N8nSelect>
			<N8nSelect v-model="row.condition" size="medium">
				<N8nOption
					v-for="condition in CONDITIONS"
					:key="condition"
					:value="condition"
					:label="condition"
				/>
			</N8nSelect>
			<N8nInput
				v-model="row.value"
				size="medium"
				:placeholder="i18n.baseText('apps.block.table.filter.value.placeholder')"
				data-test-id="table-block-filter-value"
			/>
			<N8nIconButton
				icon="trash-2"
				size="medium"
				variant="subtle"
				:aria-label="i18n.baseText('generic.delete')"
				@click="removeFilterRow(index)"
			/>
		</div>
		<N8nIconButton
			icon="plus"
			size="medium"
			variant="subtle"
			:aria-label="i18n.baseText('apps.block.table.filter.add')"
			data-test-id="table-block-add-filter"
			@click="addFilterRow"
		/>

		<div :class="$style.sortRow">
			<N8nInputLabel
				:label="i18n.baseText('apps.block.table.sort.label')"
				input-name="table-sort-column"
			>
				<N8nSelect
					v-model="sortColumn"
					size="medium"
					clearable
					filterable
					data-test-id="table-block-sort-column"
				>
					<N8nOption
						v-for="column in availableColumns"
						:key="column.id"
						:value="column.name"
						:label="column.name"
					/>
				</N8nSelect>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('apps.block.table.sort.order.label')"
				input-name="table-sort-direction"
			>
				<N8nSelect v-model="sortDirection" size="medium">
					<N8nOption value="ASC" label="ASC" />
					<N8nOption value="DESC" label="DESC" />
				</N8nSelect>
			</N8nInputLabel>
		</div>

		<N8nInputLabel :label="i18n.baseText('apps.block.table.limit.label')" input-name="table-limit">
			<N8nInputNumber v-model="limit" :min="1" :max="200" data-test-id="table-block-limit" />
		</N8nInputLabel>

		<N8nCheckbox
			v-model="editable"
			:label="i18n.baseText('apps.block.table.editable')"
			data-test-id="table-block-editable"
		/>
		<N8nCheckbox
			v-model="deletable"
			:label="i18n.baseText('apps.block.table.deletable')"
			data-test-id="table-block-deletable"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.filterHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.filterTypeSelect {
	max-width: 100px;
}

.filterRow,
.sortRow {
	display: flex;
	gap: var(--spacing--3xs);
	align-items: center;
}
</style>
