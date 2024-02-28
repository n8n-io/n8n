<template>
	<div ref="root" :class="$style.editor" @keydown.stop></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { history } from '@codemirror/commands';

import { expressionManager } from '@/mixins/expressionManager';
import { completionManager } from '@/mixins/completionManager';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { n8nAutocompletion, n8nLang } from '@/plugins/codemirror/n8nLang';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { inputTheme } from './theme';
import { forceParse } from '@/utils/forceParse';
import { completionStatus } from '@codemirror/autocomplete';

import type { IVariableItemSelected } from '@/Interface';
import {
	autocompleteKeyMap,
	enterKeyMap,
	historyKeyMap,
	tabKeyMap,
} from '@/plugins/codemirror/keymap';

export default defineComponent({
	name: 'ExpressionEditorModalInput',
	mixins: [expressionManager, completionManager],
	props: {
		modelValue: {
			type: String,
			required: true,
		},
		path: {
			type: String,
			required: true,
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
	mounted() {
		const extensions = [
			inputTheme(),
			Prec.highest(
				keymap.of([
					...tabKeyMap(),
					...historyKeyMap,
					...enterKeyMap,
					...autocompleteKeyMap,
					{
						any: (view, event) => {
							if (event.key === 'Escape' && completionStatus(view.state) === null) {
								event.stopPropagation();
								this.$emit('close');
							}

							return false;
						},
					},
				]),
			),
			n8nLang(),
			n8nAutocompletion(),
			history(),
			expressionInputHandler(),
			EditorView.lineWrapping,
			EditorView.editable.of(!this.isReadOnly),
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.contentAttributes.of({ 'data-gramm': 'false' }), // disable grammarly
			EditorView.domEventHandlers({ scroll: forceParse }),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor) return;

				this.completionStatus = completionStatus(viewUpdate.view.state);

				if (!viewUpdate.docChanged) return;

				this.editorState = this.editor.state;

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
				doc: this.modelValue.startsWith('=') ? this.modelValue.slice(1) : this.modelValue,
				extensions,
			}),
		});

		this.editorState = this.editor.state;
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
	beforeUnmount() {
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

<style lang="scss" module>
.editor div[contenteditable='false'] {
	background-color: var(--disabled-fill, var(--color-background-light));
	cursor: not-allowed;
}
</style>
<style lang="scss" scoped>
:deep(.cm-content) {
	border-radius: var(--border-radius-base);
}
</style>
