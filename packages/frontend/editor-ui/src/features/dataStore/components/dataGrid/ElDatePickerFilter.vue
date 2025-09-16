<script setup lang="ts">
import { onMounted, ref, nextTick, useTemplateRef } from 'vue';
import type { IDateParams } from 'ag-grid-community';

const props = defineProps<{
	params: IDateParams;
}>();

const pickerRef = useTemplateRef('pickerRef');
const dateValue = ref<Date | null>(null);

function onDateChange() {
	props.params.onDateChanged();
}

function onClear() {
	dateValue.value = null;
	props.params.onDateChanged();
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		e.stopPropagation();
		dateValue.value = null;
		props.params.onDateChanged();
		return;
	}
}

onMounted(async () => {
	await nextTick();
	try {
		(pickerRef.value as { focus?: () => void })?.focus?.();
	} catch {}
});

defineExpose({
	getDate: () => {
		return dateValue.value;
	},
	setDate: (date: Date | null) => {
		dateValue.value = date;
	},
});
</script>

<template>
	<div class="datastore-date-filter-wrapper">
		<el-date-picker
			ref="pickerRef"
			v-model="dateValue"
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
