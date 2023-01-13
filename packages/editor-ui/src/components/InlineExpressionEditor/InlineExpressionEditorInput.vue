<template>
	<div ref="root" class="ph-no-capture" data-test-id="inline-expression-editor-input"></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { mapStores } from 'pinia';
import { ExpressionExtensions } from 'n8n-workflow';
import { EditorView, keymap, ViewUpdate } from '@codemirror/view';
import { EditorState, Extension, Prec } from '@codemirror/state';
import { history } from '@codemirror/commands';
import {
	autocompletion,
	Completion,
	completionStatus,
	currentCompletions,
	selectedCompletion,
	selectedCompletionIndex,
} from '@codemirror/autocomplete';

import { useNDVStore } from '@/stores/ndv';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { expressionManager } from '@/mixins/expressionManager';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { inputTheme } from './theme';
import { n8nLang } from '@/plugins/codemirror/n8nLang';
import { completionEvaluationEventBus } from '@/event-bus/completion-evaluation-event-bus';

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
		path: {
			type: String,
		},
	},
	data() {
		return {
			cursorPosition: 0,
		};
	},
	watch: {
		value(newValue) {
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
		ndvInputData() {
			this.editor?.dispatch({
				changes: {
					from: 0,
					to: this.editor.state.doc.length,
					insert: this.value,
				},
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
		expressionExtensionsCategories() {
			return ExpressionExtensions.reduce<Record<string, string>>((acc, cur) => {
				for (const funcName of Object.keys(cur.functions)) {
					acc[funcName] = cur.typeName;
				}

				return acc;
			}, {});
		},
		previewKeymap(): Extension {
			return keymap.of([
				{
					key: 'Escape',
					run: (view) => {
						if (completionStatus(view.state) !== null) {
							// on dismissing completions, recompute to clear preview
							this.$emit('change', {
								value: this.unresolvedExpression,
								segments: this.displayableSegments,
							});
						}

						return false;
					},
				},
				{
					key: 'ArrowUp',
					run: (view) => {
						const completion = this.getCompletion('previous');

						if (completion === null) return false;

						const previewSegments = this.toPreviewSegments(completion, view.state);

						completionEvaluationEventBus.$emit('preview-in-output', previewSegments);

						return false;
					},
				},
				{
					key: 'ArrowDown',
					run: (view) => {
						const completion = this.getCompletion('next');

						if (completion === null) return false;

						const previewSegments = this.toPreviewSegments(completion, view.state);

						completionEvaluationEventBus.$emit('preview-in-output', previewSegments);

						return false;
					},
				},
			]);
		},
	},
	mounted() {
		const extensions = [
			inputTheme({ isSingleLine: this.isSingleLine }),
			Prec.highest(this.previewKeymap),
			autocompletion({
				aboveCursor: true,
			}),
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

				if (completion) {
					const previewSegments = this.toPreviewSegments(completion, this.editor.state);

					completionEvaluationEventBus.$emit('preview-in-output', previewSegments);

					return;
				}

				if (!viewUpdate.docChanged) return;

				highlighter.removeColor(this.editor, this.plaintextSegments);
				highlighter.addColor(this.editor, this.resolvableSegments);

				this.cursorPosition = viewUpdate.view.state.selection.ranges[0].from;

				try {
					this.trackCompletion(viewUpdate);
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
		getCompletion(which: 'previous' | 'next') {
			if (!this.editor) return null;

			if (completionStatus(this.editor.state) !== 'active') return null;

			const currentIndex = selectedCompletionIndex(this.editor.state);

			if (currentIndex === null) return null;

			const requestedIndex = which === 'previous' ? currentIndex - 1 : currentIndex + 1;

			return currentCompletions(this.editor.state)[requestedIndex] ?? null;
		},
		toPreviewSegments(completion: Completion, state: EditorState) {
			const firstHalf = state.doc.slice(0, this.cursorPosition).toString();
			const secondHalf = state.doc.slice(this.cursorPosition, state.doc.length).toString();

			const previewDoc = [
				firstHalf,
				firstHalf.endsWith('$') ? completion.label.slice(1) : completion.label,
				secondHalf,
			].join('');

			const previewState = EditorState.create({
				doc: previewDoc,
				extensions: [n8nLang()],
			});

			return this.toSegments(previewState);
		},
		trackCompletion(viewUpdate: ViewUpdate) {
			if (!this.editor) return;

			const completionTx = viewUpdate.transactions.find((tx) => tx.isUserEvent('input.complete'));

			if (!completionTx) return;

			let completion = '';
			let completionBase = '';

			viewUpdate.changes.iterChanges((_: number, __: number, fromB: number, toB: number) => {
				if (!this.editor) return;

				completion = this.editor.state.doc.slice(fromB, toB).toString();

				const completionBaseStartIndex = this.findCompletionStart(fromB);

				completionBase = this.editor.state.doc
					.slice(completionBaseStartIndex, fromB - 1)
					.toString()
					.trim();
			});

			const category = this.expressionExtensionsCategories[completion];

			const payload = {
				instance_id: this.rootStore.instanceId,
				node_type: this.ndvStore.activeNode?.type,
				field_name: this.path,
				field_type: 'expression',
				context: completionBase,
				inserted_text: completion,
				category: category ?? 'none', // only applicable for expression extension completion
			};

			this.$telemetry.track('User autocompleted code', payload);
		},
		findCompletionStart(fromIndex: number) {
			if (!this.editor) return -1;

			const INDICATORS = [
				' $', // proxy
				'{ ', // primitive
			];

			const doc = this.editor.state.doc.toString();

			for (let index = fromIndex; index > 0; index--) {
				if (INDICATORS.some((indicator) => indicator === doc[index] + doc[index + 1])) {
					return index + 1;
				}
			}

			return -1;
		},
	},
});
</script>

<style lang="scss"></style>
