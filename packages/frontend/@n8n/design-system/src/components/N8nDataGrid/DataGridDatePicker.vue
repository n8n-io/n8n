<script setup lang="ts">
import { ElDatePicker } from 'element-plus';
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';

import { parseLooseDate } from './cellValues';

const props = defineProps<{
	initialValue: Date | null;
	teleported: boolean;
	variant: 'editor' | 'filter';
	width?: number;
}>();

const emit = defineEmits<{
	commit: [];
	cancel: [];
	change: [];
}>();

const pickerRef = useTemplateRef<{ focus: () => void }>('pickerRef');
const wrapperRef = useTemplateRef<HTMLElement>('wrapperRef');
const dateValue = ref<Date | null>(props.initialValue);
let initialValue = props.initialValue;

const model = computed({
	get: () => dateValue.value ?? undefined,
	set: (value) => {
		dateValue.value = value ?? null;
	},
});

const getTypedDate = () => parseLooseDate(wrapperRef.value?.querySelector('input')?.value ?? '');

const onKeydown = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		event.stopPropagation();
		dateValue.value = initialValue;
		emit('cancel');
		return;
	}
	if (event.key !== 'Enter') return;

	const typed =
		event.target instanceof HTMLInputElement ? parseLooseDate(event.target.value) : null;
	if (typed) {
		event.preventDefault();
		event.stopPropagation();
		dateValue.value = typed;
		emit('commit');
	}
};

onMounted(async () => {
	await nextTick();
	pickerRef.value?.focus();
});

defineExpose({
	getDate: (): Date | null => getTypedDate() ?? dateValue.value,
	setDate: (date: Date | null) => {
		dateValue.value = date;
		initialValue = date;
	},
});
</script>

<template>
	<div ref="wrapperRef" :class="[$style.wrapper, $style[variant]]">
		<ElDatePicker
			ref="pickerRef"
			v-model="model"
			type="datetime"
			:style="width ? { width: `${width}px` } : undefined"
			:clearable="true"
			:editable="true"
			:teleported="teleported"
			placement="bottom"
			:popper-class="`ag-custom-component-popup ${$style.popper}`"
			placeholder="YYYY-MM-DD (HH:mm:ss)"
			size="small"
			@change="emit('change')"
			@keydown="onKeydown"
		/>
	</div>
</template>

<style module lang="scss">
.wrapper {
	border-radius: var(--radius);

	:global(.el-input__prefix) {
		display: none;
	}

	:global(.el-input__suffix) {
		display: flex;
		flex-direction: column;
		justify-content: center;
		color: var(--color--foreground--shade-1);
	}

	:global(.el-input__inner) {
		border: none !important;
		padding-left: var(--ag-input-padding-start);
	}

	&:where(:focus-within, :active) {
		box-shadow: none;
	}
}

.editor:where(:focus-within, :active) {
	border: var(--grid--cell--border-color--editing);
}

.filter {
	border: var(--ag-picker-button-border);

	&:where(:focus-within, :active) {
		border: var(--ag-picker-button-focus-border);
	}
}

.popper {
	:global(.el-date-picker__time-header .el-date-picker__editor-wrap:first-child) {
		display: none;
	}
}
</style>
