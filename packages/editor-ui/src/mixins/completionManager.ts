import mixins from 'vue-typed-mixins';
import { ExpressionExtensions } from 'n8n-workflow';
import { EditorView, keymap, ViewUpdate } from '@codemirror/view';
import {
	completionStatus,
	currentCompletions,
	selectedCompletionIndex,
} from '@codemirror/autocomplete';

// import { completionPreviewEventBus } from '@/event-bus/completion-preview-event-bus';
import { expressionManager } from './expressionManager';

import type { Extension } from '@codemirror/state';

export const completionManager = mixins(expressionManager).extend({
	data() {
		return {
			editor: null as EditorView | null,
			errorsInSuccession: 0,
		};
	},

	computed: {
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
					any(view: EditorView, event: KeyboardEvent) {
						if (event.key === 'Escape' && completionStatus(view.state) !== null) {
							// prevent completions dismissal from also closing modal
							event.stopPropagation();
						}

						return false;
					},
				},
				{
					key: 'Escape',
					run: (view) => {
						if (completionStatus(view.state) !== null) {
							this.$emit('change', {
								value: this.unresolvedExpression,
								segments: this.displayableSegments,
							});
						}

						return false;
					},
				},
				// {
				// 	key: 'ArrowUp',
				// 	run: (view) => {
				// 		const completion = this.getCompletion('previous');

				// 		if (completion === null) return false;

				// 		const previewSegments = this.toPreviewSegments(completion, view.state);

				// 		completionPreviewEventBus.$emit('preview-completion', previewSegments);

				// 		return false;
				// 	},
				// },
				// {
				// 	key: 'ArrowDown',
				// 	run: (view) => {
				// 		const completion = this.getCompletion('next');

				// 		if (completion === null) return false;

				// 		const previewSegments = this.toPreviewSegments(completion, view.state);

				// 		completionPreviewEventBus.$emit('preview-completion', previewSegments);

				// 		return false;
				// 	},
				// },
			]);
		},
	},
	methods: {
		getCompletion(which: 'previous' | 'next') {
			if (!this.editor) return null;

			if (completionStatus(this.editor.state) !== 'active') return null;

			const currentIndex = selectedCompletionIndex(this.editor.state);

			if (currentIndex === null) return null;

			const requestedIndex = which === 'previous' ? currentIndex - 1 : currentIndex + 1;

			return currentCompletions(this.editor.state)[requestedIndex] ?? null;
		},

		trackCompletion(viewUpdate: ViewUpdate, parameterPath: string) {
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
				field_name: parameterPath,
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
