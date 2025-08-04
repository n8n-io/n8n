<script lang="ts" setup>
import { useElementSize } from '@vueuse/core';
import { EditableArea, EditableInput, EditablePreview, EditableRoot } from 'reka-ui';
import { computed, ref, useTemplateRef, watchEffect } from 'vue';

type Props = {
	modelValue: string;
	readOnly?: boolean;
	maxLength?: number;
	maxWidth?: number;
	minWidth?: number;
	placeholder?: string;
	disabled?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	readOnly: false,
	maxLength: 100,
	maxWidth: 200,
	minWidth: 64,
	placeholder: 'Enter text...',
});

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

const editableRoot = useTemplateRef('editableRoot');
const measureSpan = useTemplateRef('measureSpan');

// Internal editing value
const editingValue = ref(props.modelValue);

// Content for width calculation
const displayContent = computed(() => editingValue.value || props.placeholder);

// Sync when modelValue prop changes
watchEffect(() => {
	editingValue.value = props.modelValue;
});

// Resize logic
const { width: measuredWidth } = useElementSize(measureSpan);
const inputWidth = computed(() =>
	Math.max(props.minWidth, Math.min(measuredWidth.value + 1, props.maxWidth)),
);

const computedInlineStyles = computed(() => ({
	width: `${inputWidth.value}px`,
	maxWidth: `${props.maxWidth}px`,
	zIndex: 1,
}));

function forceFocus() {
	if (editableRoot.value && !props.readOnly && !props.disabled) {
		editableRoot.value.edit();
	}
}

function forceCancel() {
	if (editableRoot.value) {
		editingValue.value = props.modelValue;
		editableRoot.value.cancel();
	}
}

function onSubmit() {
	const trimmed = editingValue.value.trim();
	if (!trimmed) {
		editingValue.value = props.modelValue;
		return;
	}
	if (trimmed !== props.modelValue) {
		emit('update:model-value', trimmed);
	}
}

function onInput(value: string) {
	editingValue.value = value;
}

function onStateChange(state: string) {
	if (state === 'cancel') {
		editingValue.value = props.modelValue;
	}
}

defineExpose({ forceFocus, forceCancel });
</script>

<template>
	<EditableRoot
		ref="editableRoot"
		:placeholder="placeholder"
		:model-value="editingValue"
		submit-mode="both"
		:class="$style.inlineRenameRoot"
		:title="props.modelValue"
		:disabled="disabled"
		:max-length="maxLength"
		:readonly="readOnly"
		select-on-focus
		auto-resize
		@click="forceFocus"
		@submit="onSubmit"
		@update:model-value="onInput"
		@update:state="onStateChange"
	>
		<EditableArea
			:style="computedInlineStyles"
			:class="$style.inlineRenameArea"
			data-test-id="inline-editable-area"
		>
			<span ref="measureSpan" :class="$style.measureSpan">
				{{ displayContent }}
			</span>
			<EditablePreview
				data-test-id="inline-edit-preview"
				:class="$style.inlineRenamePreview"
				:style="computedInlineStyles"
			/>
			<EditableInput
				ref="input"
				:class="$style.inlineRenameInput"
				data-test-id="inline-edit-input"
				:style="computedInlineStyles"
				@input="onInput($event.target.value)"
			/>
		</EditableArea>
	</EditableRoot>
</template>

<style lang="scss" module>
.inlineRenameArea {
	cursor: pointer;
	width: fit-content;
	position: relative;

	&::after {
		content: '';
		position: absolute;
		top: calc(var(--spacing-4xs) * -1);
		left: calc(var(--spacing-3xs) * -1);
		width: calc(100% + var(--spacing-xs));
		height: calc(100% + var(--spacing-2xs));
		border-radius: var(--border-radius-base);
		background-color: var(--color-foreground-xlight);
		opacity: 0;
		z-index: 0;
		transition: all 0.1s ease-in-out;
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
}

.measureSpan {
	position: absolute;
	top: 0;
	visibility: hidden;
	white-space: pre;
	font-family: inherit;
	font-size: inherit;
	font-weight: inherit;
	letter-spacing: inherit;
}
</style>
