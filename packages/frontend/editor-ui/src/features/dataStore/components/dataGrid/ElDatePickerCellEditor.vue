<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import { useDatePickerCommon } from '@/features/dataStore/composables/useDatePickerCommon';

import { ElDatePicker } from 'element-plus';
const props = defineProps<{
	params: ICellEditorParams;
}>();

const inputWidth = ref(props.params.column.getActualWidth() - 4); // -4 for the border

const {
	pickerRef,
	wrapperRef,
	dateValue,
	onKeydown,
	onClear,
	onDateChange,
	focusPicker,
	getDate,
	initializeValue,
} = useDatePickerCommon({
	onCommit: () => props.params.stopEditing(),
	onCancel: () => props.params.stopEditing(),
	onChange: () => props.params.stopEditing(),
});

const dateValueComputed = computed({
	get: () => dateValue.value ?? undefined,
	set: (val) => {
		dateValue.value = val ?? null;
	},
});

onMounted(async () => {
	initializeValue(props.params.value as unknown);
	await focusPicker();
});

defineExpose({
	getValue: getDate,
	isPopup: () => true,
});
</script>

<template>
	<div ref="wrapperRef" class="datastore-datepicker-wrapper">
		<ElDatePicker
			id="datastore-datepicker"
			ref="pickerRef"
			v-model="dateValueComputed"
			type="datetime"
			:style="{ width: `${inputWidth}px` }"
			:clearable="true"
			:editable="true"
			:teleported="false"
			popper-class="ag-custom-component-popup datastore-datepicker-popper"
			placeholder="YYYY-MM-DD (HH:mm:ss)"
			size="small"
			@change="onDateChange"
			@clear="onClear"
			@keydown="onKeydown"
		/>
	</div>
</template>

<style lang="scss">
.datastore-datepicker-wrapper {
	border-radius: var(--border-radius-base);

	.el-input__prefix {
		display: none;
	}

	.el-input__suffix {
		display: flex;
		flex-direction: column;
		justify-content: center;
		color: var(--color-foreground-dark);
	}

	.el-input__inner {
		border: none !important;
		padding-left: var(--ag-input-padding-start);
	}

	&:where(:focus-within, :active) {
		box-shadow: none;
		border: var(--grid-cell-editing-border);
	}
}

.datastore-datepicker-popper {
	// Hide the date input in the popper
	.el-date-picker__time-header .el-date-picker__editor-wrap:first-child {
		display: none;
	}
}
</style>
