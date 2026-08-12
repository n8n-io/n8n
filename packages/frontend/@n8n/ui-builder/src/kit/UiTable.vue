<script setup lang="ts">
import { N8nDatatable } from '@n8n/design-system';
import type { DatatableColumn, DatatableRow } from '@n8n/design-system';
import { computed } from 'vue';

defineOptions({ name: 'UiTable' });

const props = withDefaults(defineProps<{ rows?: unknown; columns?: string }>(), {
	rows: () => [],
	columns: '',
});

// Columns are a comma-separated list of keys rather than a nested structure, so
// the PoC's inspector never has to edit a collection. Anything else is read as
// no columns: an expression resolving to an array should not throw mid-render.
const columns = computed<DatatableColumn[]>(() => {
	const source = typeof props.columns === 'string' ? props.columns : '';

	return source
		.split(',')
		.map((key) => key.trim())
		.filter(Boolean)
		.map((key) => ({ id: key, path: key, label: key }));
});

// Every row, no pager. The datatable pages at ten by default and does not read
// its own `pagination` prop, so this is what actually turns paging off; an app
// wanting pages should get them from the workflow, which is where the data is.
const ALL_ROWS = -1;

// The datatable keys rows by `id`. App data will not always carry one, so fall
// back to the row's position.
const rows = computed<DatatableRow[]>(() => {
	if (!Array.isArray(props.rows)) return [];

	return props.rows.map((row, index) => {
		const record = (row ?? {}) as Record<string, unknown>;
		return { ...record, id: (record.id as string | number) ?? index };
	});
});
</script>

<template>
	<div class="ui-table">
		<N8nDatatable :columns="columns" :rows="rows" :rows-per-page="ALL_ROWS" :pagination="false" />

		<!--
			The header stays, since it still says what the table is of. Only the body
			is replaced, and with no rows there is no body, so the message lands
			exactly where the first row would have.
		-->
		<p v-if="rows.length === 0" class="ui-table-empty">No rows</p>
	</div>
</template>

<style scoped>
.ui-table-empty {
	margin: 0;
	padding: 16px 8px;
	text-align: center;
	color: var(--color--text--tint-1, #7d7d87);
	font-size: 12px;
}

/*
 * The table underneath always draws its paging controls, including a page-size
 * selector, and does not read the flag that asks it not to. Every row is
 * already on screen, so the whole row of controls is noise in an app.
 */
.ui-table :deep(.pagination) {
	display: none;
}
</style>
