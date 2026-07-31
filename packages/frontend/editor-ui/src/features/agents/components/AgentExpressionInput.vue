<script setup lang="ts">
import { completionStatus } from '@codemirror/autocomplete';
import { computed, ref } from 'vue';
import type { IDataObject } from 'n8n-workflow';

import useEnvironmentsStore from '@/features/settings/environments.ee/environments.store';
import InlineExpressionEditorInput from '@/features/shared/editors/components/InlineExpressionEditor/InlineExpressionEditorInput.vue';

const props = withDefaults(
	defineProps<{
		modelValue: string;
		path?: string;
		rows?: number;
		disabled?: boolean;
		readonly?: boolean;
		embedded?: boolean;
		containerClass?: string;
		fillHeight?: boolean;
		submitOnEnter?: boolean;
	}>(),
	{
		path: 'agent.expression',
		rows: 5,
		disabled: false,
		readonly: false,
		embedded: false,
		containerClass: '',
		fillHeight: false,
		submitOnEnter: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
	focus: [];
	blur: [];
	submit: [value: string];
}>();

const environmentsStore = useEnvironmentsStore();
const input = ref<InstanceType<typeof InlineExpressionEditorInput>>();
const editorValue = computed(() =>
	props.modelValue.startsWith('=') ? props.modelValue.slice(1) : props.modelValue,
);
const additionalData = computed<IDataObject>(() => ({
	$vars: environmentsStore.variablesAsObject,
}));

function toRawValue(value: string) {
	return value === '' || value.startsWith('=') ? value : `=${value}`;
}

function onUpdate({ value }: { value: string }) {
	const rawValue = toRawValue(value);
	if (rawValue !== props.modelValue) emit('update:modelValue', rawValue);
}

function focus() {
	input.value?.focus();
}

function onKeydownCapture(event: KeyboardEvent) {
	if (!props.submitOnEnter || event.key !== 'Enter') return;
	const editor = input.value?.editor;
	if (editor && completionStatus(editor.state) !== null) return;
	event.preventDefault();
	event.stopPropagation();
	emit('submit', toRawValue(editor?.state.doc.toString() ?? editorValue.value));
}

defineExpose({ focus });
</script>

<template>
	<InlineExpressionEditorInput
		ref="input"
		:model-value="editorValue"
		:path="props.path"
		:rows="props.rows"
		:is-read-only="props.disabled || props.readonly"
		:additional-data="additionalData"
		:class="[
			$style.expressionInput,
			props.containerClass,
			{ [$style.embedded]: props.embedded, [$style.fillHeight]: props.fillHeight },
		]"
		@update:model-value="onUpdate"
		@focus="emit('focus')"
		@focusout="emit('blur')"
		@keydown.capture="onKeydownCapture"
	/>
</template>

<style module>
.expressionInput {
	min-width: 0;
	width: 100%;
}

.expressionInput :global(.cm-editor) {
	border-radius: var(--radius);
	background-color: var(--background--surface) !important;
}

.fillHeight,
.fillHeight :global(.cm-editor) {
	height: 100%;
	max-height: 100%;
}

.embedded {
	flex: 1 1 auto;
	width: auto;
}

.embedded :global(.cm-editor),
.embedded :global(.cm-content) {
	border: 0 !important;
	border-radius: 0;
	background-color: transparent !important;
}
</style>
