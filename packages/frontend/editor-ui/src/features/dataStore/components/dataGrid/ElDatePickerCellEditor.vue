<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import { DateTime } from 'luxon';

const props = defineProps<{
	params: ICellEditorParams;
}>();

const pickerRef = ref<HTMLElement | null>(null);
const dateValue = ref<Date | null>(null);
const initialValue = ref<Date | null>(null);

const inputWidth = ref(props.params.column.getActualWidth() - 4); // -4 for the border

onMounted(async () => {
	const initial = props.params.value as unknown;
	if (initial === null || initial === undefined) {
		dateValue.value = null;
	} else if (initial instanceof Date) {
		const dt = DateTime.fromJSDate(initial);
		// the date editor shows local time but we want the UTC so we need to offset the value here
		dateValue.value = dt.minus({ minutes: dt.offset }).toJSDate();
	}
	initialValue.value = dateValue.value;

	await nextTick();
	try {
		// Focus to open the calendar popover
		// Element Plus exposes a focus() method on the picker instance
		// Using any to avoid tying to internal types
		(pickerRef.value as unknown as { focus?: () => void })?.focus?.();
	} catch {}
});

function onChange() {
	props.params.stopEditing();
}

function onClear() {
	dateValue.value = null;
	props.params.stopEditing();
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		e.stopPropagation();
		dateValue.value = initialValue.value;
		props.params.stopEditing();
	} else if (e.key === 'Enter') {
		e.stopPropagation();
		props.params.stopEditing();
	}
}

defineExpose({
	getValue: () => {
		if (dateValue.value === null) return null;
		const dt = DateTime.fromJSDate(dateValue.value);
		// the editor returns local time but we initially offset the value to UTC so we need to add the offset back here
		return dt.plus({ minutes: dt.offset }).toJSDate();
	},
	isPopup: () => true,
});
</script>

<template>
	<div class="datastore-datepicker-wrapper">
		<el-date-picker
			ref="pickerRef"
			v-model="dateValue"
			type="datetime"
			:style="{ width: `${inputWidth}px` }"
			:clearable="true"
			:editable="false"
			:teleported="false"
			:placeholder="''"
			size="small"
			@change="onChange"
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
</style>
