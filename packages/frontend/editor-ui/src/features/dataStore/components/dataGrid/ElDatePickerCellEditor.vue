<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';

const props = defineProps<{
	params: ICellEditorParams;
}>();

const pickerRef = ref<HTMLElement | null>(null);
const dateValue = ref<Date | null>(null);
const initialValue = ref<Date | null>(null);

const inputWidth = ref(props.params.column.getActualWidth() - 4); // -4 for the border

const defaultMidnight = new Date();
defaultMidnight.setHours(0, 0, 0, 0);

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

function onChange() {
	props.params.stopEditing();
}

function onClear() {
	dateValue.value = null;
	props.params.stopEditing();
}

// Accepts the following loose formats and constructs a local Date:
// - YYYY-MM-DD -> 00:00:00
// - YYYY-MM-DD HH:mm -> seconds default to 00
// - YYYY-MM-DDTHH:mm -> seconds default to 00
// - YYYY-MM-DD HH:mm:ss (also accepted, though typically handled by the picker)
function parseLooseLocalDate(text: string): Date | null {
	const trimmed = text.trim();
	const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})(?:[ T]([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?)?$/.exec(
		trimmed,
	);
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	const hh = m[4] !== undefined ? Number(m[4]) : 0;
	const mm = m[5] !== undefined ? Number(m[5]) : 0;
	const ss = m[6] !== undefined ? Number(m[6]) : 0;

	if (mo < 1 || mo > 12) return null;
	if (d < 1 || d > 31) return null;
	if (hh < 0 || hh > 23) return null;
	if (mm < 0 || mm > 59) return null;
	if (ss < 0 || ss > 59) return null;

	return new Date(y, mo - 1, d, hh, mm, ss, 0);
}

function commitIfParsedFromInput(target?: EventTarget | null) {
	const input = target as HTMLInputElement | null;
	const value = input?.value ?? '';
	const parsed = parseLooseLocalDate(value);
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

function onBlur(e: FocusEvent) {
	if (commitIfParsedFromInput(e.target)) return;
}

defineExpose({
	getValue: () => {
		if (dateValue.value === null) return null;
		// Return the selected date in the user's local timezone
		return dateValue.value;
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
			:editable="true"
			:teleported="false"
			:default-time="defaultMidnight"
			popper-class="datastore-datepicker-popper"
			placeholder="YYYY-MM-DD (HH:mm:ss)"
			size="small"
			@change="onChange"
			@clear="onClear"
			@keydown="onKeydown"
			@blur="onBlur"
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
	// Hide the date input because in the popper, we only want to show the time picker
	.el-date-picker__time-header .el-date-picker__editor-wrap:first-child {
		display: none;
	}
}
</style>
