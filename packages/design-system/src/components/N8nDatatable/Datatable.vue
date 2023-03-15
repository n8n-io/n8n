<script lang="ts">
import { computed, defineComponent, PropType, ref, useCssModule } from 'vue';
import {
	DatatableColumn,
	DatatableRow,
	DatatableRowDataType,
} from '@/components/N8nDatatable/mixins';
import { getValueByPath } from '../../utils';
import { useI18n } from '../../composables';
import N8nSelect from '../N8nSelect';
import N8nOption from '../N8nOption';
import N8nPagination from '../N8nPagination';

export default defineComponent({
	name: 'n8n-datatable',
	components: {
		N8nSelect,
		N8nOption,
		N8nPagination,
	},
	props: {
		columns: {
			type: Array as PropType<DatatableColumn[]>,
			required: true,
		},
		rows: {
			type: Array as PropType<DatatableRow[]>,
			required: true,
		},
		pagination: {
			type: Boolean,
			default: true,
		},
		rowsPerPage: {
			type: Number,
			default: 10,
		},
	},
	setup(props) {
		const { t } = useI18n();
		const rowsPerPageOptions = ref([10, 25, 50, 100]);

		const style = useCssModule();
		const currentPage = ref(1);
		const currentRowsPerPage = ref(props.rowsPerPage);

		const totalPages = computed(() => {
			return Math.ceil(props.rows.length / currentRowsPerPage.value);
		});

		const totalRows = computed(() => {
			return props.rows.length;
		});

		const visibleRows = computed(() => {
			const start = (currentPage.value - 1) * currentRowsPerPage.value;
			const end = start + currentRowsPerPage.value;

			return props.rows.slice(start, end);
		});

		const classes = computed(() => {
			return {
				datatable: true,
				[style.datatableWrapper]: true,
			};
		});
		function getTrClass() {
			return {
				[style.datatableRow]: true,
			};
		}

		function onRowsPerPageChange(value: number) {
			currentRowsPerPage.value = value;

			const maxPage = Math.ceil(totalRows.value / currentRowsPerPage.value);
			if (maxPage < currentPage.value) {
				currentPage.value = maxPage;
			}
		}

		function getTdValue(row: DatatableRow, column: DatatableColumn) {
			return getValueByPath<DatatableRowDataType>(row, column.path);
		}

		return {
			t,
			classes,
			currentPage,
			totalPages,
			totalRows,
			visibleRows,
			currentRowsPerPage,
			rowsPerPageOptions,
			getTdValue,
			getTrClass,
			onRowsPerPageChange,
		};
	},
});
</script>

<template>
	<div :class="classes" v-on="$listeners">
		<table :class="$style.datatable">
			<thead :class="$style.datatableHeader">
				<tr>
					<th v-for="column in columns" :key="column.id">
						{{ column.label }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="row in visibleRows" :key="row.id" :class="getTrClass(row)">
					<td v-for="column in columns" :key="column.id">
						<component v-if="column.render" :is="column.render" :row="row" :column="column" />
						<span v-else>{{ getTdValue(row, column) }}</span>
					</td>
				</tr>
			</tbody>
		</table>

		<div :class="$style.pagination">
			<n8n-pagination
				v-if="totalPages > 1"
				background
				:current-page.sync="currentPage"
				:pager-count="5"
				:page-size="currentRowsPerPage"
				layout="prev, pager, next"
				:total="totalRows"
			/>

			<div :class="$style.pageSizeSelector">
				<n8n-select
					size="mini"
					:value="currentRowsPerPage"
					@input="onRowsPerPageChange"
					popper-append-to-body
				>
					<template #prepend>{{ t('datatable.pageSize') }}</template>
					<n8n-option v-for="size in rowsPerPageOptions" :key="size" :label="size" :value="size" />
					<n8n-option :label="`All`" :value="totalRows"> </n8n-option>
				</n8n-select>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.datatableWrapper {
	display: block;
	width: 100%;
}

.datatable {
	width: 100%;
}

.datatableHeader {
	background: var(--color-background-base);

	th {
		text-align: left;
		padding: var(--spacing-s) var(--spacing-2xs);
	}
}

.datatableRow {
	td {
		color: var(--color-text-base);
		padding: var(--spacing-s) var(--spacing-2xs);
	}

	&:nth-of-type(even) {
		background: var(--color-background-xlight);
	}

	&:nth-of-type(odd) {
		background: var(--color-background-light);
	}
}

.pagination {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	bottom: 0;
	overflow: auto;
	margin-top: var(--spacing-s);
}

.pageSizeSelector {
	text-transform: capitalize;
	max-width: 150px;
	flex: 0 1 auto;
}
</style>
