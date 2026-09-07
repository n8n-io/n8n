<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';
import { N8nOption, N8nSelect } from '@n8n/design-system';

import type { DataTableRow } from '@/features/core/dataTable/dataTable.types';

const props = defineProps<{
	params: ICellRendererParams<DataTableRow> & {
		options: string[];
		isDisabled: () => boolean;
	};
}>();

const updateValue = (value: unknown) => {
	if (typeof value !== 'string' && value !== null) return;
	const column = props.params.column;
	if (!column) return;
	props.params.node.setDataValue(column, value);
};
</script>

<template>
	<N8nSelect
		:model-value="params.value ?? null"
		:disabled="params.isDisabled()"
		clearable
		size="small"
		@update:model-value="updateValue"
	>
		<N8nOption v-for="option in params.options" :key="option" :label="option" :value="option" />
	</N8nSelect>
</template>
