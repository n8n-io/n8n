<template>
	<div ref="root" class="ph-no-capture"></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history } from '@codemirror/commands';

import { expressionManager } from '@/mixins/expressionManager';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { n8nLanguageSupport } from './n8nLanguageSupport';
import { braceHandler } from './braceHandler';
import { EXPRESSION_EDITOR_THEME } from './inputTheme';
import { addColor, removeColor } from './colorDecorations';

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
	},
	data() {
		return {
			cursorPosition: 0,
		};
	},
	watch: {
		value(newValue) {
			try {
				this.editor?.dispatch({
					changes: {
						from: 0,
						to: this.editor.state.doc.length,
						insert: newValue,
					},
					selection: { anchor: this.cursorPosition, head: this.cursorPosition },
				});
			} catch (_) {} // @TODO ignore range error from dropping on prepopulated field
		},
	},
	mounted() {
		const extensions = [
			EXPRESSION_EDITOR_THEME,
			n8nLanguageSupport(),
			history(),
			braceHandler(),
			EditorView.lineWrapping,
			EditorView.editable.of(!this.isReadOnly),
			EditorView.domEventHandlers({
				focus: () => {
					this.$emit('focus');
				},
			}),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor || !viewUpdate.docChanged) return;

				const plaintexts = this.plaintextSegments;
				const resolvables = this.resolvableSegments;

				removeColor(this.editor, plaintexts);
				addColor(this.editor, resolvables);

				this.cursorPosition = viewUpdate.view.state.selection.ranges[0].from;

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

		addColor(this.editor, this.resolvableSegments);

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
		focus() {
			this.editor?.focus();
		},
	},
});
</script>

<style lang="scss"></style>
