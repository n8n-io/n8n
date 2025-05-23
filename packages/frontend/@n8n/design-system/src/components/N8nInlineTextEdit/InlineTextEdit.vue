<script lang="ts" setup>
import { useElementSize } from '@vueuse/core';
import { EditableArea, EditableInput, EditablePreview, EditableRoot } from 'reka-ui';
import { computed, ref, useTemplateRef, watch } from 'vue';

type Props = {
	modelValue: string;
	readOnly?: boolean;
	maxLength?: number;
	maxWidth?: number;
};

const props = withDefaults(defineProps<Props>(), {
	readOnly: false,
	maxLength: 100,
	maxWidth: 200,
});

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

const editableRoot = useTemplateRef('editableRoot');

function forceFocus() {
	if (editableRoot.value && !props.readOnly) {
		editableRoot.value.edit();
	}
}

defineExpose({ forceFocus });

function onSubmit() {
	if (newValue.value === '') {
		newValue.value = props.modelValue;
		temp.value = props.modelValue;
		return;
	}
	emit('update:model-value', newValue.value);
}

function onInput(value: string) {
	newValue.value = value;
	measureText.value = value || 'A';
}

function onStateChange(state: string) {
	if (state === 'cancel') {
		temp.value = newValue.value;
	}
}

// Resize logic
const newValue = ref(props.modelValue);
const temp = ref(props.modelValue);
const measureText = ref(props.modelValue || 'A');

const measureSpan = useTemplateRef('measureSpan');
const { width: measuredWidth } = useElementSize(measureSpan);

const inputWidth = computed(() => {
	const minWidth = 60; // Minimum width
	return Math.max(minWidth, Math.min(measuredWidth.value, props.maxWidth));
});

watch(
	[newValue, temp],
	([newVal, tempVal]) => {
		// Use the longer of the two values for measurement
		const textToMeasure = tempVal.length > newVal.length ? tempVal : newVal;
		measureText.value = textToMeasure || 'A';
	},
	{ immediate: true },
);

function onChange(e: string) {
	const processedValue = e.replace(/\s/g, '.');
	temp.value = processedValue;
	measureText.value = processedValue || 'A';
}
</script>

<template>
	<EditableRoot
		ref="editableRoot"
		:model-value="newValue"
		submit-mode="both"
		:class="$style.inlineRenameRoot"
		:max-length="maxLength"
		:readonly="readOnly"
		select-on-focus
		auto-resize
		@submit="onSubmit"
		@update:model-value="onInput"
		@update:state="onStateChange"
	>
		<EditableArea
			:style="{ width: `${inputWidth}px`, maxWidth: `${maxWidth}px` }"
			:class="$style.inlineRenameArea"
			@click="forceFocus"
		>
			<span ref="measureSpan" :class="$style.measureSpan">
				{{ temp }}
			</span>
			<EditablePreview
				data-test-id="inline-edit-preview"
				:class="$style.inlineRenamePreview"
				:style="{ maxWidth: `${maxWidth}px` }"
			/>
			<EditableInput
				ref="input"
				data-test-id="inline-edit-input"
				:style="{ width: `${inputWidth}px`, maxWidth: `${maxWidth}px`, zIndex: 1 }"
				@input="(e) => onChange(e.target.value)"
			/>
		</EditableArea>
	</EditableRoot>
</template>

<style lang="scss" module>
.inlineRenameArea {
	cursor: pointer;
	width: fit-content;
	position: relative;
	z-index: 1;
	// add min width

	&::after {
		content: '';
		position: absolute;
		top: calc(var(--spacing-3xs) * -1);
		left: calc(var(--spacing-3xs) * -1);
		width: calc(100% + var(--spacing-xs));
		height: calc(100% + var(--spacing-xs));
		border-radius: var(--border-radius-base);
		background-color: var(--color-foreground-xlight);
		opacity: 0;
		z-index: 0;
		transition: all 0.2s ease-in-out;
	}

	&[data-focused],
	&:hover {
		&::after {
			border: 1px solid var(--color-foreground-base);
			opacity: 1;
		}
	}

	&[data-focused] {
		cursor: text;
		&::after {
			border: 1px solid var(--color-secondary);
		}
	}
}

.inlineRenameArea[data-focused],
.inlineRenameArea:hover {
	z-index: 1;
}

.inlineRenameArea[data-readonly] {
	pointer-events: none;
	&::after {
		content: none;
	}
}

.inlineRenamePreview {
	width: fit-content;
	transform: translateY(1.5px);
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	position: relative;
	z-index: 1;
}

.measureSpan {
	position: absolute;
	top: 0;
	visibility: hidden;
	white-space: nowrap;
	font-family: inherit;
	font-size: inherit;
	font-weight: inherit;
	letter-spacing: inherit;
}
</style>
