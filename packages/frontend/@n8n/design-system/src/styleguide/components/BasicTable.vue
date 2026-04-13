<script setup lang="ts">
type BasicTableValue = string | number | boolean | null | undefined;

type BasicTableColumn = {
	key: string;
	label: string;
};

type BasicTableRow = Record<string, BasicTableValue>;

interface BasicTableProps {
	columns: BasicTableColumn[];
	rows: BasicTableRow[];
	rowKey?: string;
}

const props = defineProps<BasicTableProps>();

const getRowKey = (row: BasicTableRow, index: number): string | number => {
	if (!props.rowKey) {
		return index;
	}

	const value = row[props.rowKey];

	if (typeof value === 'string' || typeof value === 'number') {
		return value;
	}

	return index;
};

const formatCell = (value: BasicTableValue): string => {
	if (value === null || value === undefined) {
		return '';
	}

	return String(value);
};
</script>

<template>
	<table :class="$style.table">
		<thead>
			<tr>
				<th v-for="column in columns" :key="column.key">{{ column.label }}</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="(row, index) in rows" :key="getRowKey(row, index)">
				<td v-for="column in columns" :key="column.key">
					{{ formatCell(row[column.key]) }}
				</td>
			</tr>
		</tbody>
	</table>
</template>

<style lang="scss" module>
.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--2xs);
	margin-block: var(--spacing--2xl);

	th,
	td {
		padding: var(--spacing--2xs) var(--spacing--xs);
		text-align: left;
		border-bottom: 1px solid var(--color--neutral-300);
	}

	th {
		font-weight: var(--font-weight--bold);
	}
}
</style>
