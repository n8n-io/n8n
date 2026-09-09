<script setup lang="ts">
import type { DataTableEnumOption } from '@n8n/api-types';
import type { ICellRendererParams } from 'ag-grid-community';
import { N8nOption, N8nSelect } from '@n8n/design-system';

import type { DataTableRow } from '@/features/core/dataTable/dataTable.types';

const props = defineProps<{
	params: ICellRendererParams<DataTableRow> & {
		options: DataTableEnumOption[];
		isDisabled: () => boolean;
	};
}>();

const selectedId =
	typeof props.params.value === 'object' &&
	props.params.value !== null &&
	'id' in props.params.value
		? props.params.value.id
		: props.params.value;

const updateValue = (value: unknown) => {
	if (typeof value !== 'string' && value !== null) return;
	const column = props.params.column;
	if (!column) return;
	props.params.node.setDataValue(column, value === '' ? null : value);
};
</script>

<template>
	<N8nSelect
		class="cell-renderer-enum-select"
		:model-value="selectedId ?? null"
		:disabled="params.isDisabled()"
		clearable
		size="small"
		@update:model-value="updateValue"
	>
		<N8nOption
			v-for="option in params.options"
			:key="option.id"
			:label="option.text"
			:value="option.id"
		/>
	</N8nSelect>
</template>

<style lang="scss">
.cell-renderer-enum-select {
	--input--color--background: var(--background--surface);
}
</style>
