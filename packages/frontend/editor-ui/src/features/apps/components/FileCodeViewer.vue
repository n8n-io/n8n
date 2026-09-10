<script setup lang="ts">
import { html } from '@n8n/codemirror-lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { foldGutter } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { onBeforeUnmount, useTemplateRef, watch } from 'vue';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';

const props = defineProps<{
	path: string;
	content: string;
}>();

const emit = defineEmits<{ 'update:content': [string] }>();

/** No CodeMirror language mode covers Vue SFCs (or other unrecognized types) today; they fall back to plain text. */
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
