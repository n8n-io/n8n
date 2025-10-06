<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { IDateParams } from 'ag-grid-community';
import { useDatePickerCommon } from '@/features/dataStore/composables/useDatePickerCommon';

import { ElDatePicker } from 'element-plus';
const props = defineProps<{
	params: IDateParams;
}>();

const {
	pickerRef,
	wrapperRef,
	dateValue,
	onKeydown,
	onClear,
	onDateChange,
	focusPicker,
	getDate,
	setDate,
} = useDatePickerCommon({
	onCommit: () => props.params.onDateChanged(),
	onCancel: () => {
		dateValue.value = null;
		props.params.onDateChanged();
	},
	onChange: () => props.params.onDateChanged(),
});

const dateValueComputed = computed({
	get: () => dateValue.value ?? undefined,
	set: (val) => {
		dateValue.value = val ?? null;
	},
});

onMounted(async () => {
	await focusPicker();
});

defineExpose({
	getDate,
	setDate,
});
</script>

<template>
	<div ref="wrapperRef" class="datastore-date-filter-wrapper">
		<ElDatePicker
			ref="pickerRef"
			v-model="dateValueComputed"
			type="datetime"
			:clearable="true"
			:editable="true"
			:teleported="true"
			placement="bottom"
			popper-class="ag-custom-component-popup datastore-date-filter-popper"
			placeholder="YYYY-MM-DD (HH:mm:ss)"
			size="small"
			@change="onDateChange"
			@clear="onClear"
			@keydown="onKeydown"
		/>
	</div>
</template>

<style lang="scss">
.datastore-date-filter-wrapper {
	border: var(--ag-picker-button-border);
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
		border: var(--ag-picker-button-focus-border);
	}
}

.datastore-date-filter-popper {
	.el-date-picker__time-header .el-date-picker__editor-wrap:first-child {
		display: none;
	}
}
</style>
