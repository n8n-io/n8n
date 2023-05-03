import Vue from 'vue';
import { addVarType } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeNodeEditorMixin } from '../types';

const DEFAULT_MATCHER = '$prevNode';

const escape = (str: string) => str.replace('$', '\\$');

export const prevNodeCompletions = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		/**
		 * Complete `$prevNode.` to `.name .outputIndex .runIndex`.
		 */
		prevNodeCompletions(
			context: CompletionContext,
			matcher = DEFAULT_MATCHER,
		): CompletionResult | null {
			const pattern = new RegExp(`${escape(matcher)}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: `${matcher}.name`,
					info: this.$locale.baseText('codeNodeEditor.completer.$prevNode.name'),
				},
				{
					label: `${matcher}.outputIndex`,
					info: this.$locale.baseText('codeNodeEditor.completer.$prevNode.outputIndex'),
				},
				{
					label: `${matcher}.runIndex`,
					info: this.$locale.baseText('codeNodeEditor.completer.$prevNode.runIndex'),
				},
			];

			return {
				from: preCursor.from,
				options: options.map(addVarType),
			};
		},
	},
});
