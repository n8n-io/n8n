<template>
	<div ref="codeNodeEditor" />
</template>

<script lang="ts">
import { mapGetters } from 'vuex';
import mixins from 'vue-typed-mixins';

import { EditorState } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';

import { PLACEHOLDERS } from './placeholders';
import { CODE_NODE_EDITOR_THEME } from './theme';
import { BASE_EXTENSIONS } from './baseExtensions';
import { linterExtension } from './linter';
import { completerExtension } from './completer';
import { codeNodeEditorEventBus } from '@/event-bus/code-node-editor-event-bus';
import { workflowHelpers } from '../mixins/workflowHelpers';

export default mixins(linterExtension, completerExtension, workflowHelpers).extend({
	name: 'CodeNodeEditor',
	props: {
		mode: {
			type: String,
			validator: (value: string): boolean =>
				['runOnceForAllItems', 'runOnceForEachItem'].includes(value),
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
		};
	},
	watch: {
		mode() {
			this.refreshPlaceholder();
		},
	},
	computed: {
		...mapGetters(['activeNode']),
		content(): string {
			if (!this.editor) return '';

			return this.editor.state.doc.toString();
		},
		placeholder(): string {
			return {
				runOnceForAllItems: PLACEHOLDERS.ALL_ITEMS,
				runOnceForEachItem: PLACEHOLDERS.EACH_ITEM,
			}[this.mode];
		},
		previousPlaceholder(): string {
			return {
				runOnceForAllItems: PLACEHOLDERS.EACH_ITEM,
				runOnceForEachItem: PLACEHOLDERS.ALL_ITEMS,
			}[this.mode];
		},
	},
	methods: {
		refreshPlaceholder() {
			if (!this.editor) return;

			if (!this.content.trim() || this.content === this.previousPlaceholder) {
				this.editor.dispatch({
					changes: { from: 0, to: this.content.length, insert: this.placeholder },
				});
			}
		},
		highlightErrorLine(errorLineNumber: number) {
			if (!this.editor) return;

			this.editor.dispatch({
				selection: { anchor: this.editor.state.doc.line(errorLineNumber).from },
			});
		},
	},
	destroyed() {
		codeNodeEditorEventBus.$off('error-line-number', this.highlightErrorLine);
	},
	mounted() {
		codeNodeEditorEventBus.$on('error-line-number', this.highlightErrorLine);

		const STATE_BASED_EXTENSIONS = [
			this.linterExtension(),
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
				if (viewUpdate.docChanged) this.$emit('valueChanged', this.content);
			}),
		];

		this.editor = new EditorView({
			parent: this.$refs.codeNodeEditor as HTMLDivElement,
			state: EditorState.create({
				doc: this.activeNode.parameters.jsCode || this.placeholder,
				extensions: [
					...BASE_EXTENSIONS,
					...STATE_BASED_EXTENSIONS,
					CODE_NODE_EDITOR_THEME,
					javascript(),
					this.autocompletionExtension(),
				],
			}),
		});
	},
});
</script>

<style lang="scss" scoped></style>
