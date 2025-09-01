<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';

const props = defineProps<{
	params: ICellEditorParams;
}>();

const pickerRef = ref<HTMLElement | null>(null);
const dateValue = ref<Date | null>(null);

const inputWidth = ref(props.params.column.actualWidth - 4); // -4 for the border

onMounted(async () => {
	const initial = props.params.value as unknown;
	if (initial === null || initial === undefined) {
		dateValue.value = null;
	} else if (initial instanceof Date) {
		dateValue.value = initial;
	} else if (typeof initial === 'string' || typeof initial === 'number') {
		const parsed = new Date(initial);
		if (!Number.isNaN(parsed.getTime())) {
			dateValue.value = parsed;
		} else {
			dateValue.value = null;
		}
	}

	await nextTick();
	try {
		// Focus to open the calendar popover
		// Element Plus exposes a focus() method on the picker instance
		// Using any to avoid tying to internal types
		(pickerRef.value as unknown as { focus?: () => void })?.focus?.();
	} catch {}
});

function onChange() {
	// Commit immediately when a date is picked
	props.params.stopEditing();
}

function onClear() {
	dateValue.value = null;
	props.params.stopEditing();
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		e.stopPropagation();
		props.params.stopEditing(true);
	} else if (e.key === 'Enter') {
		e.stopPropagation();
		props.params.stopEditing();
	}
}

defineExpose({
	getValue: () => dateValue.value,
	isPopup: () => true,
});
// TODO: the clock icon is overlapping with the value; clicking ok is inserting a value that is not selected
</script>

<template>
	<div class="datastore-datepicker-wrapper" @keydown.stop="onKeydown">
		<el-date-picker
			ref="pickerRef"
			v-model="dateValue"
			type="datetime"
			:style="{ width: `${inputWidth}px` }"
			:clearable="true"
			:editable="false"
			:teleported="false"
			:placeholder="''"
			@change="onChange"
			@clear="onClear"
		/>
	</div>
</template>

<style lang="scss">
.datastore-datepicker-wrapper {
	border-radius: var(--border-radius-base);

	.el-input__prefix,
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
