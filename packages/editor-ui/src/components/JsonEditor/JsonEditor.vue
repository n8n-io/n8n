<template>
	<div :class="$style.editor">
		<div ref="jsonEditor" class="ph-no-capture json-editor"></div>
		<slot name="suffix" />
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { autocompletion } from '@codemirror/autocomplete';
import { indentWithTab, history, redo, undo } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { lintGutter, linter as createLinter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import {
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';

import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';

export default defineComponent({
	name: 'JsonEditor',
	props: {
		modelValue: {
			type: String,
			required: true,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		fillParent: {
			type: Boolean,
			default: false,
		},
		rows: {
			type: Number,
			default: 4,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
			editorState: null as EditorState | null,
		};
	},
	computed: {
		doc(): string {
			return this.editor?.state.doc.toString();
		},
		extensions(): Extension[] {
			const { isReadOnly } = this;
			const extensions: Extension[] = [
				json(),
				lineNumbers(),
				EditorView.lineWrapping,
				EditorState.readOnly.of(isReadOnly),
				EditorView.editable.of(!isReadOnly),
				codeNodeEditorTheme({
					isReadOnly,
					maxHeight: this.fillParent ? '100%' : '40vh',
					minHeight: '20vh',
					rows: this.rows,
				}),
			];
			if (!isReadOnly) {
				extensions.push(
					history(),
					keymap.of([
						indentWithTab,
						{ key: 'Mod-z', run: undo },
						{ key: 'Mod-Shift-z', run: redo },
					]),
					createLinter(jsonParseLinter()),
					lintGutter(),
					autocompletion(),
					indentOnInput(),
					highlightActiveLine(),
					highlightActiveLineGutter(),
					foldGutter(),
					dropCursor(),
					bracketMatching(),
					EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
						if (!viewUpdate.docChanged || !this.editor) return;
						this.$emit('update:modelValue', this.editor?.state.doc.toString());
					}),
				);
			}
			return extensions;
		},
	},
	mounted() {
		const state = EditorState.create({ doc: this.modelValue, extensions: this.extensions });
		const parent = this.$refs.jsonEditor as HTMLDivElement;
		this.editor = new EditorView({ parent, state });
		this.editorState = this.editor.state;
	},
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
