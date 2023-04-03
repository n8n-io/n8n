import Vue from 'vue';
import { NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION } from '../constants';
import { addVarType } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { INodeUi } from '@/Interface';
import type { CodeNodeEditorMixin } from '../types';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';

function getAutocompletableNodeNames(nodes: INodeUi[]) {
	return nodes
		.filter((node: INodeUi) => !NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION.includes(node.type))
		.map((node: INodeUi) => node.name);
}

export const baseCompletions = (Vue as CodeNodeEditorMixin).extend({
	computed: {
		...mapStores(useWorkflowsStore),
	},
	methods: {
		itemCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/i\w*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = [];

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: 'item',
					info: this.$locale.baseText('codeNodeEditor.completer.$input.item'),
				});
			} else if (this.mode === 'runOnceForAllItems') {
				options.push({
					label: 'items',
					info: this.$locale.baseText('codeNodeEditor.completer.$input.all'),
				});
			}

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * - Complete `$` to `$execution $input $prevNode $runIndex $workflow $now $today
		 * $jmespath $('nodeName')` in both modes.
		 * - Complete `$` to `$json $binary $itemIndex` in single-item mode.
		 */
		baseCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/\$\w*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const TOP_LEVEL_COMPLETIONS_IN_BOTH_MODES: Completion[] = [
				{
					label: '$execution',
					info: this.$locale.baseText('codeNodeEditor.completer.$execution'),
				},
				{ label: '$input', info: this.$locale.baseText('codeNodeEditor.completer.$input') },
				{
					label: '$prevNode',
					info: this.$locale.baseText('codeNodeEditor.completer.$prevNode'),
				},
				{
					label: '$workflow',
					info: this.$locale.baseText('codeNodeEditor.completer.$workflow'),
				},
				{
					label: '$now',
					info: this.$locale.baseText('codeNodeEditor.completer.$now'),
				},
				{
					label: '$today',
					info: this.$locale.baseText('codeNodeEditor.completer.$today'),
				},
				{
					label: '$jmespath()',
					info: this.$locale.baseText('codeNodeEditor.completer.$jmespath'),
				},
				{
					label: '$if()',
					info: this.$locale.baseText('codeNodeEditor.completer.$if'),
				},
				{
					label: '$min()',
					info: this.$locale.baseText('codeNodeEditor.completer.$min'),
				},
				{
					label: '$max()',
					info: this.$locale.baseText('codeNodeEditor.completer.$max'),
				},
				{
					label: '$runIndex',
					info: this.$locale.baseText('codeNodeEditor.completer.$runIndex'),
				},
			];

			const options: Completion[] = TOP_LEVEL_COMPLETIONS_IN_BOTH_MODES.map(addVarType);

			options.push(
				...getAutocompletableNodeNames(this.workflowsStore.allNodes).map((nodeName) => {
					return {
						label: `$('${nodeName}')`,
						type: 'variable',
						info: this.$locale.baseText('codeNodeEditor.completer.$()', {
							interpolate: { nodeName },
						}),
					};
				}),
			);

			if (this.mode === 'runOnceForEachItem') {
				const TOP_LEVEL_COMPLETIONS_IN_SINGLE_ITEM_MODE = [
					{ label: '$json' },
					{ label: '$binary' },
					{
						label: '$itemIndex',
						info: this.$locale.baseText('codeNodeEditor.completer.$itemIndex'),
					},
				];

				options.push(...TOP_LEVEL_COMPLETIONS_IN_SINGLE_ITEM_MODE.map(addVarType));
			}

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * Complete `$(` to `$('nodeName')`.
		 */
		nodeSelectorCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/\$\(.*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = getAutocompletableNodeNames(this.workflowsStore.allNodes).map(
				(nodeName) => {
					return {
						label: `$('${nodeName}')`,
						type: 'variable',
						info: this.$locale.baseText('codeNodeEditor.completer.$()', {
							interpolate: { nodeName },
						}),
					};
				},
			);

			return {
				from: preCursor.from,
				options,
			};
		},
	},
});
