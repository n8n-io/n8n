import Vue from 'vue';
import { addVarType } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeNodeEditorMixin } from '../types';
import { useEnvironmentsStore } from '@/stores';

const escape = (str: string) => str.replace('$', '\\$');

export const variablesCompletions = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		/**
		 * Complete `$workflow.` to `.id .name .active`.
		 */
		variablesCompletions(context: CompletionContext, matcher = '$vars'): CompletionResult | null {
			const pattern = new RegExp(`${escape(matcher)}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const environmentsStore = useEnvironmentsStore();
			const options: Completion[] = environmentsStore.variables.map((variable) => ({
				label: `${matcher}.${variable.key}`,
				info: variable.value,
			}));

			return {
				from: preCursor.from,
				options: options.map(addVarType),
			};
		},
	},
});
