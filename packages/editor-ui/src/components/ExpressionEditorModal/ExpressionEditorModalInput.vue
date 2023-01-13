<template>
	<div ref="root" class="ph-no-capture" @keydown.stop @keydown.esc="onClose"></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { EditorView } from '@codemirror/view';
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
import { autocompletion, selectedCompletion } from '@codemirror/autocomplete';
import { completionPreviewEventBus } from '@/event-bus/completion-preview-event-bus';
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
			Prec.highest(this.previewKeymap),
			autocompletion({
				aboveCursor: true,
			}),
			n8nLang(),
			history(),
			expressionInputHandler(),
			EditorView.lineWrapping,
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.domEventHandlers({ scroll: forceParse }),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor) return;

				const completion = selectedCompletion(this.editor.state);

				if (completion) {
					const previewSegments = this.toPreviewSegments(completion, this.editor.state);

					completionPreviewEventBus.$emit('preview-completion', previewSegments);

					return;
				}

				if (!viewUpdate.docChanged) return;

				highlighter.removeColor(this.editor, this.plaintextSegments);
				highlighter.addColor(this.editor, this.resolvableSegments);

				try {
					this.trackCompletion(viewUpdate, this.path);
				} catch (_) {}

				setTimeout(() => this.editor?.focus()); // prevent blur on paste

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
		onClose() {
			this.$emit('close');
		},
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
