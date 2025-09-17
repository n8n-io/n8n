<script setup lang="ts">
import { onMounted, ref, nextTick, useTemplateRef } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import { parseLooseDateInput } from '@/features/dataStore/utils/typeUtils';

const props = defineProps<{
	params: ICellEditorParams;
}>();

const pickerRef = useTemplateRef('pickerRef');
const wrapperRef = useTemplateRef('wrapperRef');
const dateValue = ref<Date | null>(null);
const initialValue = ref<Date | null>(null);

const inputWidth = ref(props.params.column.getActualWidth() - 4); // -4 for the border

function commitIfParsedFromInput(target?: EventTarget | null) {
	const input = target instanceof HTMLInputElement ? target : null;
	const value = input?.value ?? '';
	const parsed = parseLooseDateInput(value);
	if (parsed) {
		dateValue.value = parsed;
		props.params.stopEditing();
		return true;
	}
	return false;
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		e.stopPropagation();
		dateValue.value = initialValue.value;
		props.params.stopEditing();
		return;
	}
	if (e.key === 'Enter') {
		const committed = commitIfParsedFromInput(e.target);
		if (committed) {
			e.preventDefault();
			e.stopPropagation();
		}
	}
}

function getInnerInput(): HTMLInputElement | null {
	return (wrapperRef.value?.querySelector('input') ?? null) as HTMLInputElement | null;
}

function onChange() {
	props.params.stopEditing();
}

function onClear() {
	dateValue.value = null;
	props.params.stopEditing();
}

onMounted(async () => {
	const initial = props.params.value as unknown;
	if (initial === null || initial === undefined) {
		dateValue.value = null;
	} else if (initial instanceof Date) {
		// Use the provided Date as-is (local time)
		dateValue.value = initial;
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

defineExpose({
	getValue: () => {
		// Prefer what's typed in the input
		// Element plus will not update the v-model if the input is invalid (loose)
		const input = getInnerInput();
		const typed = input?.value ?? '';
		const parsed = parseLooseDateInput(typed);
		if (parsed) return parsed;

		// Fallback to the v-model value
		return dateValue.value;
	},
	isPopup: () => true,
});
</script>

<template>
	<div ref="wrapperRef" class="datastore-datepicker-wrapper">
		<el-date-picker
			id="datastore-datepicker"
			ref="pickerRef"
			v-model="dateValue"
			type="datetime"
			:style="{ width: `${inputWidth}px` }"
			:clearable="true"
			:editable="true"
			:teleported="false"
			popper-class="ag-custom-component-popup datastore-datepicker-popper"
			placeholder="YYYY-MM-DD (HH:mm:ss)"
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

.datastore-datepicker-popper {
	// Hide the date input in the popper
	.el-date-picker__time-header .el-date-picker__editor-wrap:first-child {
		display: none;
	}
}
</style>
