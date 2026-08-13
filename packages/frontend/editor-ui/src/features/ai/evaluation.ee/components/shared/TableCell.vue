<script setup lang="ts" generic="T">
import type { TestTableColumn } from './TestTableBase.vue';
import { useRouter } from 'vue-router';

defineProps<{
	column: TestTableColumn<T>;
	row: T;
}>();

defineEmits<{
	click: [];
}>();

const router = useRouter();

function hasProperty(row: unknown, prop: string): row is Record<string, unknown> {
	return typeof row === 'object' && row !== null && prop in row;
}

const getCellContent = (column: TestTableColumn<T>, row: T) => {
	if (column.formatter) {
		return column.formatter(row);
	}
	return hasProperty(row, column.prop) ? row[column.prop] : undefined;
};
</script>

<template>
	<div v-if="column.route?.(row)">
		<a v-if="column.openInNewTab" :href="router.resolve(column.route(row)!).href" target="_blank">
			{{ getCellContent(column, row) }}
		</a>
		<RouterLink v-else :to="column.route(row)!">
			{{ getCellContent(column, row) }}
		</RouterLink>
	</div>

	<div v-else>
		{{ getCellContent(column, row) }}
	</div>
</template>
