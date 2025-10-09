<script setup lang="ts">
import { history } from '@codemirror/commands';
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
import { computed, onMounted, ref, watch } from 'vue';

import { editorKeymap } from '@/plugins/codemirror/keymap';
import { n8nAutocompletion } from '@/plugins/codemirror/n8nLang';
import { codeEditorTheme } from '../CodeNodeEditor/theme';

type Props = {
	modelValue: string;
	isReadOnly?: boolean;
	fillParent?: boolean;
	rows?: number;
	posthogCapture?: boolean;
};

const props = withDefaults(defineProps<Props>(), { fillParent: false, isReadOnly: false, rows: 4 });
const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

onMounted(() => {
	createEditor();
});

watch(
	() => props.modelValue,
	(newValue: string) => {
		const editorValue = editor.value?.state?.doc.toString();

		// If model value changes from outside the component
		if (
			editorValue !== undefined &&
			editorValue.length !== newValue.length &&
			editorValue !== newValue
		) {
			destroyEditor();
			createEditor();
		}
	},
);

function createEditor() {
	const state = EditorState.create({ doc: props.modelValue, extensions: extensions.value });
	const parent = jsEditorRef.value;

	editor.value = new EditorView({ parent, state });
	editorState.value = editor.value.state;
}

function destroyEditor() {
	editor.value?.destroy();
}

const jsEditorRef = ref<HTMLDivElement>();
const editor = ref<EditorView | null>(null);
const editorState = ref<EditorState | null>(null);

const generatedCodeCapture = computed(() => {
	return props.posthogCapture ? '' : 'ph-no-capture ';
});

const extensions = computed(() => {
	const extensionsToApply: Extension[] = [
		javascript(),
		lineNumbers(),
		EditorView.lineWrapping,
		EditorState.readOnly.of(props.isReadOnly),
		codeEditorTheme({
			isReadOnly: props.isReadOnly,
			maxHeight: props.fillParent ? '100%' : '40vh',
			minHeight: '20vh',
			rows: props.rows,
		}),
	];

	if (!props.isReadOnly) {
		extensionsToApply.push(
			history(),
			Prec.highest(keymap.of(editorKeymap)),
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

const focus = () => {
	const view = editor.value;
	if (view && typeof view.focus === 'function') {
		view.focus();
	}
};

defineExpose({
	focus,
});
</script>

<template>
	<div :class="$style.editor" :style="isReadOnly ? 'opacity: 0.7' : ''">
		<div ref="jsEditorRef" :class="generatedCodeCapture + 'js-editor'"></div>
		<slot name="suffix" />
	</div>
</template>

<style lang="scss" module>
.editor {
	height: 100%;

	& > div {
		height: 100%;
	}
}
</style>
