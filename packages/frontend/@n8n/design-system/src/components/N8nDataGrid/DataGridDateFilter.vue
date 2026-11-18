<script setup lang="ts">
import type { IDateParams } from 'ag-grid-community';
import { useTemplateRef } from 'vue';

import DataGridDatePicker from './DataGridDatePicker.vue';

const props = defineProps<{
	params: IDateParams;
}>();

const picker = useTemplateRef('picker');

const notifyChange = () => props.params.onDateChanged();

const onCancel = () => {
	picker.value?.setDate(null);
	notifyChange();
};

defineExpose({
	getDate: () => picker.value?.getDate() ?? null,
	setDate: (date: Date | null) => picker.value?.setDate(date),
});
</script>

<template>
	<DataGridDatePicker
		ref="picker"
		variant="filter"
		:teleported="true"
		:initial-value="null"
		data-test-id="data-grid-date-filter"
		@commit="notifyChange"
		@cancel="onCancel"
		@change="notifyChange"
	/>
</template>
