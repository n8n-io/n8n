<template>
	<div ref="root" class="ph-no-capture" />
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history } from '@codemirror/commands';

import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { expressionManager } from '@/mixins/expressionManager';
import { n8nLanguageSupport } from '@/plugins/codemirror/n8nLanguageSupport';
import { doubleBraceHandler } from '../../plugins/codemirror/doubleBraceHandler';
import { EXPRESSION_EDITOR_THEME_INPUT } from './theme';

import type { IVariableItemSelected } from '@/Interface';

export default mixins(expressionManager, workflowHelpers).extend({
	name: 'expression-modal-input',
	props: {
		value: {
			type: String,
		},
		isReadOnly: {
			type: Boolean,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
		};
	},
	mounted() {
		const extensions = [
			EXPRESSION_EDITOR_THEME_INPUT,
			n8nLanguageSupport(),
			history(),
			doubleBraceHandler(),
			EditorView.lineWrapping,
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor || !viewUpdate.docChanged) return;

				const plaintexts = this.plaintextSegments;
				const resolvables = this.resolvableSegments;

				highlighter.removeColor(this.editor, plaintexts);
				highlighter.addColor(this.editor, resolvables);

				setTimeout(() => this.editor?.focus()); // prevent blur on paste

				setTimeout(() => {
					this.$emit('change', {
						value: this.unresolvedExpression,
						segments: this.getDisplayableSegments,
					});
				}, this.evaluationDelay);
			}),
		];

		this.editor = new EditorView({
			parent: this.$refs.root as HTMLDivElement,
			state: EditorState.create({
				doc: this.value.startsWith('=') ? this.value.slice(1) : this.value,
				extensions,
			}),
		});

		this.editor.focus();

		highlighter.addColor(this.editor, this.resolvableSegments);

		this.editor.dispatch({
			selection: { anchor: this.editor.state.doc.length },
		});

		this.$emit('change', {
			value: this.unresolvedExpression,
			segments: this.getDisplayableSegments,
		});
	},
	destroyed() {
		this.editor?.destroy();
	},
	methods: {
		itemSelected({ variable }: IVariableItemSelected) {
			if (!this.editor || this.isReadOnly) return;

			const OPEN_MARKER = '{{';
			const CLOSE_MARKER = '}}';

			const { doc, selection } = this.editor.state;
			const { head } = selection.main;

			const beforeIsBraced = doc.toString().slice(0, head).includes(OPEN_MARKER);
			const afterIsBraced = doc.toString().slice(head, doc.length).includes(CLOSE_MARKER);

			const insert =
				beforeIsBraced && afterIsBraced
					? variable
					: [OPEN_MARKER, variable, CLOSE_MARKER].join(' ');

			this.editor.dispatch({
				changes: {
					from: head,
					insert,
				},
			});
		},
	},
});
</script>

<style lang="scss"></style>
