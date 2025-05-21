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

const newValue = ref(props.modelValue);
const preview = useTemplateRef('preview');
const { width } = useElementSize(preview);

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

function onSubmit() {
	emit('update:model-value', newValue.value);
}

function onInput(value: string) {
	newValue.value = value;
}

const temp = ref(props.modelValue);

function onChange(e: string) {
	console.log(width.value);
	console.log(e);
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
		<EditableArea :class="$style.inlineRenameArea">
			<span ref="preview" :class="$style.hidden">
				{{ temp }}
			</span>
			<EditablePreview :class="$style.inlineRenamePreview" />
			<EditableInput :style="{ width: `${width}px` }" @input="(e) => onChange(e.target.value)" />
		</EditableArea>
	</EditableRoot>
</template>

<style lang="scss" module>
.inlineRenameArea {
	cursor: text;
	width: fit-content;
}

.inlineRenameArea[data-focused] {
	background-color: var(--color-primary);
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
