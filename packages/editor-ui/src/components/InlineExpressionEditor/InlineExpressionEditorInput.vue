<template>
	<div
		ref="root"
		class="ph-no-capture"
		data-test-id="inline-expression-editor-input"
		@keydown.esc="onClose"
	></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { mapStores } from 'pinia';
import { EditorView } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { autocompletion, selectedCompletion } from '@codemirror/autocomplete';

import { useNDVStore } from '@/stores/ndv';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { expressionManager } from '@/mixins/expressionManager';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { inputTheme } from './theme';
import { n8nLang } from '@/plugins/codemirror/n8nLang';
// import { completionPreviewEventBus } from '@/event-bus/completion-preview-event-bus';
import { completionManager } from '@/mixins/completionManager';

export default mixins(completionManager, expressionManager, workflowHelpers).extend({
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
		path: {
			type: String,
		},
	},

	watch: {
		value(newValue) {
			const isInternalChange = newValue === this.editor?.state.doc.toString();

			if (isInternalChange) return;

			// on external change (e.g. from expression modal or mapping drop), dispatch to update

			this.editor?.dispatch({
				changes: { from: 0, to: this.editor?.state.doc.length, insert: newValue },
			});
		},
		ndvInputData() {
			this.editor?.dispatch({
				changes: { from: 0, to: this.editor.state.doc.length, insert: this.value },
			});

			setTimeout(() => {
				this.editor?.contentDOM.blur();
			});
		},
	},
	computed: {
		...mapStores(useNDVStore),
		ndvInputData(): object {
			return this.ndvStore.ndvInputData;
		},
	},
	mounted() {
		const extensions = [
			inputTheme({ isSingleLine: this.isSingleLine }),
			Prec.highest(this.previewKeymap),
			autocompletion(),
			n8nLang(),
			history(),
			expressionInputHandler(),
			EditorView.lineWrapping,
			EditorView.editable.of(!this.isReadOnly),
			EditorView.domEventHandlers({
				focus: () => {
					this.$emit('focus');
				},
			}),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor) return;

				const completion = selectedCompletion(this.editor.state);

				// if (completion) {
				// 	const previewSegments = this.toPreviewSegments(completion, this.editor.state);

				// 	completionPreviewEventBus.$emit('preview-completion', previewSegments);

				// 	return;
				// }

				if (!viewUpdate.docChanged) return;

				highlighter.removeColor(this.editor, this.plaintextSegments);
				highlighter.addColor(this.editor, this.resolvableSegments);

				try {
					this.trackCompletion(viewUpdate, this.path);
				} catch (_) {}

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

		highlighter.addColor(this.editor, this.resolvableSegments);

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
		onClose() {
			this.ndvStore.activeNodeName = null;
		},
	},
});
</script>

<style lang="scss"></style>
