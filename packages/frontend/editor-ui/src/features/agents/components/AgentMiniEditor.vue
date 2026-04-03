<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { history } from '@codemirror/commands';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';

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
let view: EditorView | null = null;

function buildExtensions() {
	const langExtensions = props.language === 'typescript' ? [javascript({ typescript: true })] : [];
	return [
		...langExtensions,
		lineNumbers(),
		EditorView.lineWrapping,
		codeEditorTheme({
			isReadOnly: props.readonly,
			maxHeight: props.maxHeight,
			minHeight: props.minHeight,
			rows: -1,
		}),
		...(props.readonly
			? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
			: [history()]),
		...(!props.readonly
			? [
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							emit('update:modelValue', update.state.doc.toString());
						}
					}),
				]
			: []),
	];
}

onMounted(() => {
	if (!container.value) return;
	view = new EditorView({
		state: EditorState.create({
			doc: props.modelValue,
			extensions: buildExtensions(),
		}),
		parent: container.value,
	});
});

watch(
	() => props.modelValue,
	(newVal) => {
		if (!view) return;
		const current = view.state.doc.toString();
		if (current !== newVal) {
			view.dispatch({
				changes: { from: 0, to: current.length, insert: newVal },
			});
		}
	},
);

onBeforeUnmount(() => {
	view?.destroy();
	view = null;
});
</script>

<template>
	<div ref="container" :class="$style.editor" />
</template>

<style module>
.editor {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
