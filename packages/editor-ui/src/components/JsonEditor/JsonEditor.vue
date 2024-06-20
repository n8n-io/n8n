<template>
	<div :class="$style.editor">
		<div ref="jsonEditor" class="ph-no-capture json-editor"></div>
		<slot name="suffix" />
	</div>
</template>

<script lang="ts">
import { history } from '@codemirror/commands';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { linter as createLinter, lintGutter } from '@codemirror/lint';
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
import { defineComponent } from 'vue';

import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';
import {
	autocompleteKeyMap,
	enterKeyMap,
	historyKeyMap,
	tabKeyMap,
} from '@/plugins/codemirror/keymap';
import { n8nAutocompletion } from '@/plugins/codemirror/n8nLang';

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
			return this.editor?.state.doc.toString() ?? '';
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
					Prec.highest(
						keymap.of([...tabKeyMap(), ...enterKeyMap, ...historyKeyMap, ...autocompleteKeyMap]),
					),
					createLinter(jsonParseLinter()),
					lintGutter(),
					n8nAutocompletion(),
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
	watch: {
		modelValue(newValue: string) {
			const editorValue = this.editor?.state?.doc.toString();

			// If model value changes from outside the component
			if (editorValue && editorValue.length !== newValue.length && editorValue !== newValue) {
				this.destroyEditor();
				this.createEditor();
			}
		},
	},
	mounted() {
		this.createEditor();
	},
	methods: {
		createEditor() {
			const state = EditorState.create({ doc: this.modelValue, extensions: this.extensions });
			const parent = this.$refs.jsonEditor as HTMLDivElement;

			this.editor = new EditorView({ parent, state });
			this.editorState = this.editor.state;
		},
		destroyEditor() {
			this.editor?.destroy();
		},
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
