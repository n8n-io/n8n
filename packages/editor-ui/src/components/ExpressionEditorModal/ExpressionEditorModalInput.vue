<template>
	<div ref="root" class="ph-no-capture" @keydown.stop></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { history } from '@codemirror/commands';

import { workflowHelpers } from '@/mixins/workflowHelpers';
import { expressionManager } from '@/mixins/expressionManager';
import { completionManager } from '@/mixins/completionManager';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { n8nLang } from '@/plugins/codemirror/n8nLang';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { inputTheme } from './theme';
import { forceParse } from '@/utils/forceParse';
import { autocompletion } from '@codemirror/autocomplete';

import type { IVariableItemSelected } from '@/Interface';

export default mixins(expressionManager, completionManager, workflowHelpers).extend({
	name: 'ExpressionEditorModalInput',
	props: {
		value: {
			type: String,
		},
		path: {
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
			inputTheme(),
			autocompletion(),
			Prec.highest(
				keymap.of([
					{
						any: (_: EditorView, event: KeyboardEvent) => {
							if (event.key === 'Escape') {
								event.stopPropagation();
								this.$emit('close');
							}

							return false;
						},
					},
				]),
			),
			n8nLang(),
			history(),
			expressionInputHandler(),
			EditorView.lineWrapping,
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.domEventHandlers({ scroll: forceParse }),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor || !viewUpdate.docChanged) return;

				highlighter.removeColor(this.editor, this.plaintextSegments);
				highlighter.addColor(this.editor, this.resolvableSegments);

				setTimeout(() => {
					this.editor?.focus(); // prevent blur on paste
					try {
						this.trackCompletion(viewUpdate, this.path);
					} catch {}
				});

				this.$emit('change', {
					value: this.unresolvedExpression,
					segments: this.displayableSegments,
				});
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
			segments: this.displayableSegments,
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

			const isInsideResolvable =
				doc.toString().slice(0, head).includes(OPEN_MARKER) &&
				doc.toString().slice(head, doc.length).includes(CLOSE_MARKER);

			const insert = isInsideResolvable
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
