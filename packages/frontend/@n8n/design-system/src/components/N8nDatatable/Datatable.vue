<script lang="ts" setup generic="Item extends DatatableRow">
import { computed } from 'vue';

import type { DatatableProps } from './Datatable.types';
import type { DatatableColumn, DatatableRow, DatatableRowDataType } from '../../types';
import { getValueByPath } from '../../utils';
import { N8nPagination, PAGINATION_ALL_ITEMS_PER_PAGE } from '../N8nPagination';
import N8nTableBase from '../TableBase';

const rowsPerPageOptions = [1, 10, 25, 50, 100];

defineOptions({ name: 'N8nDatatable' });
const props = withDefaults(defineProps<DatatableProps<Item>>(), {
	currentPage: 1,
	pagination: true,
	rowsPerPage: 10,
});

const emit = defineEmits<{
	'update:currentPage': [value: number];
	'update:rowsPerPage': [value: number];
}>();

const totalRows = computed(() => {
	return props.rows.length;
});

const visibleRows = computed(() => {
	if (!props.pagination || props.rowsPerPage === PAGINATION_ALL_ITEMS_PER_PAGE) return props.rows;

	const start = (props.currentPage - 1) * props.rowsPerPage;
	const end = start + props.rowsPerPage;

	return props.rows.slice(start, end);
});

function onUpdateCurrentPage(value: number) {
	emit('update:currentPage', value);
}

function onRowsPerPageChange(value: number) {
	emit('update:rowsPerPage', value);
}

function getTdValue(row: Item, column: DatatableColumn) {
	return getValueByPath<DatatableRowDataType>(row, column.path);
}

function getThStyle(column: DatatableColumn) {
	return {
		...(column.width ? { width: column.width } : {}),
	};
}
</script>

<template>
	<div class="datatable datatableWrapper" v-bind="$attrs">
		<N8nTableBase>
			<thead>
				<tr>
					<th
						v-for="column in columns"
						:key="column.id"
						:class="column.classes"
						:style="getThStyle(column)"
					>
						{{ column.label }}
					</th>
				</tr>
			</thead>
			<tbody>
				<template v-for="row in visibleRows">
					<slot name="row" :columns="columns" :row="row" :get-td-value="getTdValue">
						<tr :key="row.id">
							<td v-for="column in columns" :key="column.id" :class="column.classes">
								<component :is="column.render" v-if="column.render" :row="row" :column="column" />
								<span v-else>{{ getTdValue(row, column) }}</span>
							</td>
						</tr>
					</slot>
				</template>
			</tbody>
		</N8nTableBase>

		<slot name="postdata" />

		<N8nPagination
			v-if="pagination"
			class="pagination"
			:page="currentPage"
			:items-per-page="rowsPerPage"
			:total="totalRows"
			:page-sizes="rowsPerPageOptions"
			show-all
			@update:page="onUpdateCurrentPage"
			@update:items-per-page="onRowsPerPageChange"
		/>
	</div>
</template>

<style lang="scss" scoped>
.datatableWrapper {
	display: block;
	width: 100%;
}

.pagination {
	display: flex;
	justify-content: flex-end;
	margin-top: var(--spacing--sm);
}
</style>
