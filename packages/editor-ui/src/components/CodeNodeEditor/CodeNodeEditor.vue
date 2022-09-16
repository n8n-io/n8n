<template>
	<div ref="codeNodeEditor" />
</template>

<script lang="ts">
import { mapGetters } from 'vuex';
import mixins from 'vue-typed-mixins';

import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';

import { CODE_NODE_EDITOR_THEME } from './theme';
import { BASE_EXTENSIONS } from './baseExtensions';
import { linterExtension } from './linter';
import { completerExtension } from './completer';
import * as PLACEHOLDERS from './placeholders';
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
			linterCompartment: new Compartment(),
		};
	},
	watch: {
		mode() {
			this.refreshPlaceholder();
			this.reloadLinter();
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
		blankRows() {
			const wrapper = document.querySelector('.node-parameters-wrapper');

			if (!wrapper) return '';

			const EDITOR_ROW_HEIGHT_IN_PIXELS = 20;
			const totalRows = Math.floor(wrapper.clientHeight / EDITOR_ROW_HEIGHT_IN_PIXELS);

			const placeholderRows = this.placeholder.split('\n').length;
			const OTHER_PARAMETERS_ROWS = 10; // height of select and notice, in rows
			const blankRowsNumber = Math.max(0, totalRows - placeholderRows - OTHER_PARAMETERS_ROWS);

			return '\n'.repeat(blankRowsNumber);
		},
	},
	methods: {
		refreshPlaceholder() {
			if (!this.editor) return;

			if (!this.content.trim() || this.content.trim() === this.previousPlaceholder) {
				this.editor.dispatch({
					changes: { from: 0, to: this.content.length, insert: this.placeholder + this.blankRows },
				});
			}
		},
		reloadLinter() {
			if (!this.editor) return;

			this.editor.dispatch({
				effects: this.linterCompartment.reconfigure(this.linterExtension()),
			});
		},
		highlightLine(line: number | 'final') {
			if (!this.editor) return;

			if (line === 'final') {
				this.editor.dispatch({
					selection: { anchor: this.content.trim().length },
				});
				return;
			}

			this.editor.dispatch({
				selection: { anchor: this.editor.state.doc.line(line).from },
			});
		},
	},
	destroyed() {
		codeNodeEditorEventBus.$off('error-line-number', this.highlightLine);
	},
	mounted() {
		codeNodeEditorEventBus.$on('error-line-number', this.highlightLine);

		const STATE_BASED_EXTENSIONS = [
			this.linterCompartment.of(this.linterExtension()),
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
				if (viewUpdate.docChanged) this.$emit('valueChanged', this.content);
			}),
		];

		if (this.activeNode.parameters.jsCode === '') {
			this.$emit('valueChanged', this.placeholder + this.blankRows);
		}

		this.editor = new EditorView({
			parent: this.$refs.codeNodeEditor as HTMLDivElement,
			state: EditorState.create({
				doc: this.activeNode.parameters.jsCode,
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
