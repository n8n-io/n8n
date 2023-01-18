import Vue from 'vue';
import { addVarType } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeNodeEditorMixin } from '../types';

const escape = (str: string) => str.replace('$', '\\$');

export const workflowCompletions = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		/**
		 * Complete `$workflow.` to `.id .name .active`.
		 */
		workflowCompletions(
			context: CompletionContext,
			matcher = '$workflow',
		): CompletionResult | null {
			const pattern = new RegExp(`${escape(matcher)}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: `${matcher}.id`,
					info: this.$locale.baseText('codeNodeEditor.completer.$workflow.id'),
				},
				{
					label: `${matcher}.name`,
					info: this.$locale.baseText('codeNodeEditor.completer.$workflow.name'),
				},
				{
					label: `${matcher}.active`,
					info: this.$locale.baseText('codeNodeEditor.completer.$workflow.active'),
				},
			];

			return {
				from: preCursor.from,
				options: options.map(addVarType),
			};
		},
	},
});
