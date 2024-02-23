<template>
	<div :class="$style.editor">
		<div ref="jsEditor" class="ph-no-capture js-editor"></div>
		<slot name="suffix" />
	</div>
</template>

<script lang="ts">
import { autocompletion } from '@codemirror/autocomplete';
import { history, redo, toggleComment, undo } from '@codemirror/commands';
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
import { defineComponent } from 'vue';

import { enterKeyMap, tabKeyMap } from '../CodeNodeEditor/baseExtensions';
import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';

export default defineComponent({
	name: 'JsEditor',
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
				javascript(),
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
						keymap.of([
							...tabKeyMap,
							...enterKeyMap,
							{ key: 'Mod-z', run: undo },
							{ key: 'Mod-Shift-z', run: redo },
							{ key: 'Mod-/', run: toggleComment },
						]),
					),
					lintGutter(),
					autocompletion(),
					indentOnInput(),
					highlightActiveLine(),
					highlightActiveLineGutter(),
					foldGutter(),
					dropCursor(),
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
		const parent = this.$refs.jsEditor as HTMLDivElement;
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
