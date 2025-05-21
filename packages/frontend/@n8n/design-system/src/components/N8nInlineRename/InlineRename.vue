<script lang="ts" setup>
import { useElementSize } from '@vueuse/core';
import { EditableArea, EditableInput, EditablePreview, EditableRoot } from 'reka-ui';
import { ref, useTemplateRef } from 'vue';

type Props = {
	modelValue: string;
	readOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	readOnly: false,
});

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

const newValue = ref(props.modelValue);
const temp = ref(props.modelValue);

const preview = useTemplateRef('preview');
const { width } = useElementSize(preview);

function onSubmit() {
	emit('update:model-value', newValue.value);
}

function onInput(value: string) {
	newValue.value = value;
}

function onChange(e: string) {
	temp.value = e.replace(/\s/g, '.'); // force input to expand on space chars];
}
</script>

<template>
	<EditableRoot
		:model-value="newValue"
		submit-mode="both"
		:class="$style.inlineRenameRoot"
		:readonly="readOnly"
		select-on-focus
		auto-resize
		@submit="onSubmit"
		@update:model-value="onInput"
	>
		<EditableArea :style="{ width: `${width}px` }" :class="$style.inlineRenameArea">
			<span ref="preview" :class="$style.hidden">
				{{ temp }}
			</span>
			<EditablePreview :class="$style.inlineRenamePreview" />
			<EditableInput
				:style="{ width: `${width}px`, zIndex: 1 }"
				@input="(e) => onChange(e.target.value)"
			/>
		</EditableArea>
	</EditableRoot>
</template>

<style lang="scss" module>
.inlineRenameArea {
	cursor: text;
	width: fit-content;
	position: relative;
	z-index: 1;
}

.inlineRenameArea[data-focused] {
	z-index: 1;

	&::after {
		content: '';
		position: absolute;
		top: calc(var(--spacing-4xs) * -1);
		left: calc(var(--spacing-4xs) * -1);
		width: calc(100% + var(--spacing-2xs));
		height: calc(100% + var(--spacing-2xs));
		border-radius: var(--border-radius-small);
		background-color: var(--color-foreground-xlight);
		border: 1px solid var(--color-secondary);
		z-index: 0;
	}
}

.inlineRenamePreview {
	width: fit-content;
}

.hidden {
	position: absolute;
	top: 0;
	visibility: hidden;
	white-space: nowrap;
}
</style>
