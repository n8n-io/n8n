<template>
	<div :class="$style.editor">
		<div ref="jsEditorRef" class="ph-no-capture js-editor"></div>
		<slot name="suffix" />
	</div>
</template>

<script setup lang="ts">
import { history, toggleComment } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { foldGutter, indentOnInput } from '@codemirror/language';
import { lintGutter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { EditorState, Prec } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import {
	EditorView,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import { computed, onMounted, ref } from 'vue';

import {
	autocompleteKeyMap,
	enterKeyMap,
	historyKeyMap,
	tabKeyMap,
} from '@/plugins/codemirror/keymap';
import { n8nAutocompletion } from '@/plugins/codemirror/n8nLang';
import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';

type Props = {
	modelValue: string;
	isReadOnly?: boolean;
	fillParent?: boolean;
	rows?: number;
};

const props = withDefaults(defineProps<Props>(), { fillParent: false, isReadOnly: false, rows: 4 });
const emit = defineEmits<{
	(event: 'update:modelValue', value: string): void;
}>();

onMounted(() => {
	const state = EditorState.create({ doc: props.modelValue, extensions: extensions.value });
	const parent = jsEditorRef.value;
	editor.value = new EditorView({ parent, state });
	editorState.value = editor.value.state;
});

const jsEditorRef = ref<HTMLDivElement>();
const editor = ref<EditorView | null>(null);
const editorState = ref<EditorState | null>(null);

const extensions = computed(() => {
	const extensionsToApply: Extension[] = [
		javascript(),
		lineNumbers(),
		EditorView.lineWrapping,
		EditorState.readOnly.of(props.isReadOnly),
		EditorView.editable.of(!props.isReadOnly),
		codeNodeEditorTheme({
			isReadOnly: props.isReadOnly,
			maxHeight: props.fillParent ? '100%' : '40vh',
			minHeight: '20vh',
			rows: props.rows,
		}),
	];

	if (!props.isReadOnly) {
		extensionsToApply.push(
			history(),
			Prec.highest(
				keymap.of([
					...tabKeyMap(),
					...enterKeyMap,
					...historyKeyMap,
					...autocompleteKeyMap,
					{ key: 'Mod-/', run: toggleComment },
				]),
			),
			lintGutter(),
			n8nAutocompletion(),
			indentOnInput(),
			highlightActiveLine(),
			highlightActiveLineGutter(),
			foldGutter(),
			dropCursor(),
			EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
				if (!viewUpdate.docChanged || !editor.value) return;
				emit('update:modelValue', editor.value?.state.doc.toString());
			}),
		);
	}
	return extensionsToApply;
});
</script>

<style lang="scss" module>
.editor {
	height: 100%;

	& > div {
		height: 100%;
	}
}
</style>
