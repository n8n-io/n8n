import { defineComponent } from 'vue';
import { ExpressionExtensions } from 'n8n-workflow';
import type { EditorView, ViewUpdate } from '@codemirror/view';

import { expressionManager } from './expressionManager';

export const completionManager = defineComponent({
	mixins: [expressionManager],
	data() {
		return {
			editor: {} as EditorView,
		};
	},
	computed: {
		expressionExtensionsCategories() {
			return ExpressionExtensions.reduce<Record<string, string | undefined>>((acc, cur) => {
				for (const fnName of Object.keys(cur.functions)) {
					acc[fnName] = cur.typeName;
				}

				return acc;
			}, {});
		},
	},
	methods: {
		trackCompletion(viewUpdate: ViewUpdate, parameterPath: string) {
			const completionTx = viewUpdate.transactions.find((tx) => tx.isUserEvent('input.complete'));

			if (!completionTx) return;

			let completion = '';
			let completionBase = '';

			viewUpdate.changes.iterChanges((_: number, __: number, fromB: number, toB: number) => {
				completion = this.editor.state.doc.slice(fromB, toB).toString();

				const index = this.findCompletionBaseStartIndex(fromB);

				completionBase = this.editor.state.doc
					.slice(index, fromB - 1)
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
				category: category ?? 'n/a', // only applicable if expression extension completion
			};

			this.$telemetry.track('User autocompleted code', payload);
		},

		findCompletionBaseStartIndex(fromIndex: number) {
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
