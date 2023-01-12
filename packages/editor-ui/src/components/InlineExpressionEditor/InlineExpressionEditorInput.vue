<template>
	<div ref="root" class="ph-no-capture" data-test-id="inline-expression-editor-input"></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { mapStores } from 'pinia';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { ExpressionExtensions } from 'n8n-workflow';

import { useNDVStore } from '@/stores/ndv';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { expressionManager } from '@/mixins/expressionManager';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { inputTheme } from './theme';
import { autocompletion } from '@codemirror/autocomplete';
import { n8nLang } from '@/plugins/codemirror/n8nLang';

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
		extensionsCategories() {
			return ExpressionExtensions.reduce<Record<string, string>>((acc, cur) => {
				for (const funcName of Object.keys(cur.functions)) {
					acc[funcName] = cur.typeName;
				}

				return acc;
			}, {});
		},
	},
	mounted() {
		const extensions = [
			inputTheme({ isSingleLine: this.isSingleLine }),
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
				if (!this.editor || !viewUpdate.docChanged) return;

				highlighter.removeColor(this.editor, this.plaintextSegments);
				highlighter.addColor(this.editor, this.resolvableSegments);

				this.cursorPosition = viewUpdate.view.state.selection.ranges[0].from;

				try {
					this.trackCompletion(viewUpdate);
				} catch (_) {}

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
		trackCompletion(viewUpdate: ViewUpdate) {
			if (!this.editor) return;

			const completionTx = viewUpdate.transactions.find((tx) => tx.isUserEvent('input.complete'));

			if (!completionTx) return;

			let completion = '';
			let completionBase = '';

			viewUpdate.changes.iterChanges((_: number, __: number, fromB: number, toB: number) => {
				if (!this.editor) return;

				completion = this.editor.state.doc.slice(fromB, toB).toString();

				const completionBaseStartIndex = this.findStartOfCompletion(fromB);

				completionBase = this.editor.state.doc
					.slice(completionBaseStartIndex, fromB - 1)
					.toString()
					.trim();
			});

			const category = this.extensionsCategories[completion];

			const payload = {
				instance_id: this.rootStore.instanceId,
				node_type: this.ndvStore.activeNode?.type,
				field_name: this.path,
				field_type: 'expression',
				context: completionBase,
				inserted_text: completion,
				category: category ?? 'n/a', // only applicable for expression extension completion
			};

			this.$telemetry.track('User autocompleted code', payload);
		},
		findStartOfCompletion(fromIndex: number) {
			if (!this.editor) return -1;

			const INDICATORS = [
				' $', // proxy
				'{ ', // primitive
			];

			const doc = this.editor?.state.doc.toString();

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
