<template>
	<div ref="root" class="ph-no-capture"></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history } from '@codemirror/commands';

import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { expressionManager } from '@/mixins/expressionManager';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { n8nLanguageSupport } from '@/plugins/codemirror/n8nLanguageSupport';
import { doubleBraceHandler } from '@/plugins/codemirror/doubleBraceHandler';
import { inputTheme } from './theme';

export default mixins(expressionManager, workflowHelpers).extend({
	name: 'InlineExpressionEditorInput',
	props: {
		value: {
			type: String,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		isSingleLine: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			cursorPosition: 0,
		};
	},
	watch: {
		value(newValue) {
			this.editor?.dispatch({
				changes: {
					from: 0,
					to: this.editor.state.doc.length,
					insert: newValue,
				},
				selection: { anchor: this.cursorPosition, head: this.cursorPosition },
			});
		},
	},
	mounted() {
		const extensions = [
			inputTheme({ isSingleLine: this.isSingleLine }),
			n8nLanguageSupport(),
			history(),
			doubleBraceHandler(),
			EditorView.lineWrapping,
			EditorView.editable.of(!this.isReadOnly),
			EditorView.domEventHandlers({
				focus: () => {
					this.$emit('focus');
				},
			}),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor || !viewUpdate.docChanged) return;

				highlighter.removeColor(this.editor, this.plaintextSegments);
				highlighter.addColor(this.editor, this.resolvableSegments);

				this.cursorPosition = viewUpdate.view.state.selection.ranges[0].from;

				setTimeout(() => {
					this.$emit('change', {
						value: this.unresolvedExpression,
						segments: this.displayableSegments,
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
		focus() {
			this.editor?.focus();
		},
	},
});
</script>

<style lang="scss"></style>
