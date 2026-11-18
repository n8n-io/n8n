<script setup lang="ts">
import type { ICellEditorParams } from 'ag-grid-community';
import { useTemplateRef } from 'vue';

import { toDate } from './cellValues';
import DataGridDatePicker from './DataGridDatePicker.vue';

const props = defineProps<{
	params: ICellEditorParams;
}>();

const BORDER_WIDTH = 4;

const picker = useTemplateRef('picker');

const stopEditing = () => props.params.stopEditing();

defineExpose({
	getValue: () => picker.value?.getDate() ?? null,
	isPopup: () => true,
});
</script>

<template>
	<DataGridDatePicker
		ref="picker"
		variant="editor"
		:teleported="false"
		:initial-value="toDate(props.params.value)"
		:width="props.params.column.getActualWidth() - BORDER_WIDTH"
		data-test-id="data-grid-date-editor"
		@commit="stopEditing"
		@cancel="stopEditing"
		@change="stopEditing"
	/>
</template>
