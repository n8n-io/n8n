<script setup lang="ts">
import { html } from '@n8n/codemirror-lang-html';
import { history } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { vue } from '@codemirror/lang-vue';
import { foldGutter } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { onBeforeUnmount, useTemplateRef, watch } from 'vue';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { editorKeymap } from '@/features/shared/editors/plugins/codemirror/keymap';

const props = defineProps<{
	path: string;
	content: string;
}>();

const emit = defineEmits<{ 'update:content': [string] }>();

/** Unrecognized file types fall back to plain text. */
function languageExtension(path: string): Extension[] {
	const extension = path.split('.').pop() ?? '';
	switch (extension) {
		case 'js':
		case 'jsx':
		case 'ts':
		case 'tsx':
			return [javascript({ jsx: true, typescript: extension.startsWith('ts') })];
		case 'json':
			return [json()];
		case 'css':
			return [css()];
		case 'html':
			return [html()];
		case 'vue':
			return [vue()];
		default:
			return [];
	}
}

const containerRef = useTemplateRef<HTMLElement>('containerRef');
let editor: EditorView | undefined;

function createEditor() {
	if (!containerRef.value) return;
	editor?.destroy();
	editor = new EditorView({
		parent: containerRef.value,
		state: EditorState.create({
			doc: props.content,
			extensions: [
				...languageExtension(props.path),
				lineNumbers(),
				foldGutter(),
				history(),
				keymap.of(editorKeymap),
				EditorView.lineWrapping,
				EditorView.updateListener.of((update) => {
					if (update.docChanged) emit('update:content', update.state.doc.toString());
				}),
				codeEditorTheme({ maxHeight: '100%', minHeight: '100%' }),
			],
		}),
	});
}

// Only switching files recreates the editor and reseeds its content — typing
// updates CodeMirror's own state and is pushed out via the emit above, not
// fed back in as a controlled prop (that would recreate the editor on every
// keystroke and lose cursor position/undo history).
watch([containerRef, () => props.path], createEditor);

// A path-only recreate misses an external content update for the *same* path
// (e.g. AppCodeViewer re-fetching after a save) — apply it in place, but only
// when it actually differs, so the user's own typing (which already matches
// what's in the editor) never triggers a redundant/looping dispatch.
watch(
	() => props.content,
	(content) => {
		if (!editor || content === editor.state.doc.toString()) return;
		editor.dispatch({
			changes: { from: 0, to: editor.state.doc.length, insert: content },
		});
	},
);

onBeforeUnmount(() => editor?.destroy());
</script>

<template>
	<div ref="containerRef" :class="$style.editor" data-test-id="app-code-file-viewer" />
</template>

<style lang="scss" module>
.editor {
	height: 100%;
	overflow: auto;

	:global(.cm-editor) {
		height: 100%;
	}
}
</style>
