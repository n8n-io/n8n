<template>
	<div ref="root" :class="$style.editor" data-test-id="inline-expression-editor-input"></div>
</template>

<script lang="ts">
import { acceptCompletion, autocompletion, completionStatus } from '@codemirror/autocomplete';
import { history, redo, undo } from '@codemirror/commands';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

import { completionManager } from '@/mixins/completionManager';
import { expressionManager } from '@/mixins/expressionManager';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { n8nLang } from '@/plugins/codemirror/n8nLang';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { isEqual } from 'lodash-es';
import type { IDataObject } from 'n8n-workflow';
import { inputTheme } from './theme';

const editableConf = new Compartment();

export default defineComponent({
	name: 'InlineExpressionEditorInput',
	mixins: [completionManager, expressionManager],
	props: {
		modelValue: {
			type: String,
			required: true,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		rows: {
			type: Number,
			default: 5,
		},
		path: {
			type: String,
			required: true,
		},
		additionalData: {
			type: Object as PropType<IDataObject>,
			default: () => ({}),
		},
	},
	watch: {
		isReadOnly(newValue: boolean) {
			this.editor?.dispatch({
				effects: editableConf.reconfigure(EditorView.editable.of(!newValue)),
			});
		},
		modelValue(newValue) {
			const isInternalChange = newValue === this.editor?.state.doc.toString();

			if (isInternalChange) return;

			// manual update on external change, e.g. from expression modal or mapping drop

			this.editor?.dispatch({
				changes: {
					from: 0,
					to: this.editor?.state.doc.length,
					insert: newValue,
				},
			});
		},
		displayableSegments(segments, newSegments) {
			if (isEqual(segments, newSegments)) return;

			highlighter.removeColor(this.editor, this.plaintextSegments);
			highlighter.addColor(this.editor, this.resolvableSegments);

			this.$emit('change', {
				value: this.unresolvedExpression,
				segments: this.displayableSegments,
			});
		},
	},
	mounted() {
		const extensions = [
			n8nLang(),
			inputTheme({ rows: this.rows }),
			Prec.highest(
				keymap.of([
					{ key: 'Tab', run: acceptCompletion },
					{
						any(view: EditorView, event: KeyboardEvent) {
							if (event.key === 'Escape' && completionStatus(view.state) !== null) {
								event.stopPropagation();
							}

							return false;
						},
					},
					{ key: 'Mod-z', run: undo },
					{ key: 'Mod-Shift-z', run: redo },
				]),
			),
			autocompletion(),
			history(),
			expressionInputHandler(),
			EditorView.lineWrapping,
			editableConf.of(EditorView.editable.of(!this.isReadOnly)),
			EditorView.contentAttributes.of({ 'data-gramm': 'false' }), // disable grammarly
			EditorView.domEventHandlers({
				focus: () => {
					this.$emit('focus');
				},
			}),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor || !viewUpdate.docChanged) return;

				// Force segments value update by keeping track of editor state
				this.editorState = this.editor.state;

				setTimeout(() => {
					try {
						this.trackCompletion(viewUpdate, this.path);
					} catch {}
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

		highlighter.addColor(this.editor, this.resolvableSegments);
	},
	beforeUnmount() {
		this.editor?.destroy();
	},
	methods: {
		focus() {
			this.editor?.focus();
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
:deep(.cm-editor) {
	padding-left: 0;
}
:deep(.cm-content) {
	padding-left: var(--spacing-2xs);
}
</style>
