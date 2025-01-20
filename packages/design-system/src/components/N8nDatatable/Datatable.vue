<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { DatatableColumn, DatatableRow, DatatableRowDataType } from '../../types';
import { getValueByPath } from '../../utils';
import N8nOption from '../N8nOption';
import N8nPagination from '../N8nPagination';
import N8nSelect from '../N8nSelect';

const ALL_ROWS = -1;

interface DatatableProps {
	columns: DatatableColumn[];
	rows: DatatableRow[];
	currentPage?: number;
	pagination?: boolean;
	rowsPerPage?: number;
}

defineOptions({ name: 'N8nDatatable' });
const props = withDefaults(defineProps<DatatableProps>(), {
	currentPage: 1,
	pagination: true,
	rowsPerPage: 10,
});

const emit = defineEmits<{
	'update:currentPage': [value: number];
	'update:rowsPerPage': [value: number];
}>();

const { t } = useI18n();
const rowsPerPageOptions = ref([1, 10, 25, 50, 100]);

const totalPages = computed(() => {
	return Math.ceil(props.rows.length / props.rowsPerPage);
});

const totalRows = computed(() => {
	return props.rows.length;
});

const visibleRows = computed(() => {
	if (props.rowsPerPage === ALL_ROWS) return props.rows;

	const start = (props.currentPage - 1) * props.rowsPerPage;
	const end = start + props.rowsPerPage;

	return props.rows.slice(start, end);
});

function onUpdateCurrentPage(value: number) {
	emit('update:currentPage', value);
}

function onRowsPerPageChange(value: number) {
	emit('update:rowsPerPage', value);

	if (value === ALL_ROWS) {
		onUpdateCurrentPage(1);
		return;
	}

	const maxPage = Math.ceil(totalRows.value / value);
	if (maxPage < props.currentPage) {
		onUpdateCurrentPage(maxPage);
	}
}

function getTdValue(row: DatatableRow, column: DatatableColumn) {
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
		<table>
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
		</table>

		<div class="pagination">
			<N8nPagination
				v-if="totalPages > 1"
				background
				:pager-count="5"
				:page-size="rowsPerPage"
				layout="prev, pager, next"
				:total="totalRows"
				:current-page="currentPage"
				@update:current-page="onUpdateCurrentPage"
			/>

			<div class="pageSizeSelector">
				<N8nSelect
					size="mini"
					:model-value="rowsPerPage"
					teleported
					@update:model-value="onRowsPerPageChange"
				>
					<template #prepend>{{ t('datatable.pageSize') }}</template>
					<N8nOption
						v-for="size in rowsPerPageOptions"
						:key="size"
						:label="`${size}`"
						:value="size"
					/>
					<N8nOption :label="`All`" :value="ALL_ROWS"> </N8nOption>
				</N8nSelect>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
:deep(table) {
	border: 1px solid var(--color-foreground-base);
	border-collapse: separate;
	overflow: hidden;
	border-spacing: 0;
	border-radius: 10px;
	text-align: left;
	width: 100%;
	background-color: var(--color-background-xlight);
	table-layout: fixed;

	th {
		font-size: var(--font-size-2xs);
		font-weight: var(--font-weight-regular);
		padding: 10px 8px;
	}

	td {
		font-size: var(--font-size-s);
		padding: 3px 8px;
		height: 47px;
		width: auto;
		&:first-child {
			padding-left: 16px;
		}
		&:last-child {
			padding-right: 16px;
		}
	}

	th,
	td {
		vertical-align: middle;
		border-bottom: 1px solid var(--color-foreground-base);
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;

		&:last-child {
			border-right: none;
		}
	}

	tbody {
		tr {
			&:hover {
				background-color: var(--color-background-light);
			}

			&:last-child {
				th,
				td {
					border-bottom: none;
				}
			}
		}
	}
}

.datatableWrapper {
	display: block;
	width: 100%;
}

.pagination {
	width: 100%;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	bottom: 0;
	overflow: visible;
	margin-top: var(--spacing-s);
}

.pageSizeSelector {
	text-transform: capitalize;
	max-width: 150px;
	flex: 0 1 auto;
}
</style>
