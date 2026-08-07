<script setup lang="ts">
import { ref, toRef, watch } from 'vue';
import { javascript } from '@codemirror/lang-javascript';
import { lineNumbers, EditorView } from '@codemirror/view';
import { history } from '@codemirror/commands';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { useCodeMirrorEditor } from '../composables/useCodeMirrorEditor';

const props = withDefaults(
	defineProps<{
		modelValue: string;
		language?: 'typescript' | 'markdown';
		readonly?: boolean;
		maxHeight?: string;
		minHeight?: string;
	}>(),
	{
		language: 'typescript',
		readonly: false,
		maxHeight: '300px',
		minHeight: '100px',
	},
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const container = ref<HTMLDivElement>();
const readOnly = toRef(props, 'readonly');
const langExtensions = props.language === 'typescript' ? [javascript({ typescript: true })] : [];

const { replaceDoc } = useCodeMirrorEditor({
	container,
	initialDoc: props.modelValue,
	readOnly,
	extensions: [
		...langExtensions,
		lineNumbers(),
		EditorView.lineWrapping,
		codeEditorTheme({
			isReadOnly: props.readonly,
			maxHeight: props.maxHeight,
			minHeight: props.minHeight,
			rows: -1,
		}),
		history(),
	],
	onChange: (next) => emit('update:modelValue', next),
});

watch(
	() => props.modelValue,
	(val) => replaceDoc(val),
);
</script>

<template>
	<div ref="container" :class="$style.editor" />
</template>

<style module>
.editor {
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
