<script setup lang="ts">
import { N8nInput, N8nText } from '@n8n/design-system';
import { nextTick, ref, useTemplateRef } from 'vue';

/**
 * Click-to-edit description of the page header. The description is the instructions that AI
 * clients get, so it keeps its line breaks and can be empty. A blur saves, Escape cancels.
 */
const props = defineProps<{
	modelValue: string;
	placeholder: string;
	maxLength: number;
}>();

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

const input = useTemplateRef<{ focus: () => void }>('input');
const preview = useTemplateRef<{ $el: HTMLElement }>('preview');
const editing = ref(false);
const draft = ref('');

async function startEdit() {
	draft.value = props.modelValue;
	editing.value = true;
	await nextTick();
	input.value?.focus();
}

function save() {
	if (!editing.value) return;
	editing.value = false;
	const value = draft.value.trim();
	if (value !== props.modelValue) emit('update:model-value', value);
}

async function cancel() {
	editing.value = false;
	// The textarea had focus and is gone now, so keyboard users continue on the preview.
	await nextTick();
	preview.value?.$el.focus();
}
</script>

<template>
	<div :class="$style.root">
		<N8nInput
			v-if="editing"
			ref="input"
			v-model="draft"
			type="textarea"
			:autosize="{ minRows: 2, maxRows: 10 }"
			:maxlength="maxLength"
			:placeholder="placeholder"
			@blur="save"
			@keydown.esc.stop="cancel"
			@keydown.enter.meta.prevent="save"
			@keydown.enter.ctrl.prevent="save"
		/>
		<N8nText
			v-else
			ref="preview"
			tag="div"
			size="small"
			role="button"
			tabindex="0"
			:class="[$style.preview, { [$style.placeholder]: !modelValue }]"
			@click="startEdit"
			@keydown.enter.prevent="startEdit"
			@keydown.space.prevent="startEdit"
		>
			{{ modelValue || placeholder }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.root {
	max-width: 640px;
}

.preview {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	color: var(--text-color--subtle);
	cursor: pointer;
	border-radius: var(--radius);

	&:hover,
	&:focus-visible {
		background-color: var(--background--hover);
	}
}

.placeholder {
	color: var(--text-color--subtler);
}
</style>
