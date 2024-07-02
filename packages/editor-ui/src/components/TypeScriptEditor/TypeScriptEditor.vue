<template>
	<div ref="ts-editor" class="ph-no-capture"></div>
</template>

<script lang="ts">
// @TODO: Merge with CodeNodeEditor

import { defineComponent } from 'vue';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { typescript } from '../../plugins/codemirror/typescript-extension/typescript-extension';
import {
	readOnlyEditorExtensions,
	writableEditorExtensions,
} from '../CodeNodeEditor/baseExtensions';
import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';
import { editorTheme } from './themes';
import { ApplicationError } from 'n8n-workflow';

export default defineComponent({
	name: 'TypeScriptEditor',
	props: {
		code: {
			type: String,
			default: '',
		},
	},
	data() {
		return {
			view: null as EditorView | null,
		};
	},
	computed: {
		doc(): string {
			if (!this.view) return '';

			return this.view.state.doc.toString();
		},
	},
	mounted() {
		this.view = new EditorView({
			parent: this.root(),
			state: EditorState.create({
				doc: this.code,

				extensions: [
					...readOnlyEditorExtensions,
					...writableEditorExtensions,

					codeNodeEditorTheme({
						isReadOnly: false,
						maxHeight: '40vh',
						minHeight: '20vh',
						rows: 4,
					}),

					editorTheme,

					typescript(),

					EditorView.updateListener.of((viewUpdate) => {
						if (!viewUpdate.docChanged) return;

						this.$emit('valueChanged', this.doc);
					}),
				],
			}),
		});
	},
	methods: {
		root() {
			const root = this.$refs['ts-editor'] as HTMLDivElement | undefined;

			if (!root) throw new ApplicationError('Expected div with ref "ts-editor"');

			return root;
		},
	},
});
</script>
