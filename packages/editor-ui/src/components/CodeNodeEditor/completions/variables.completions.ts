import { addVarType } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { defineComponent } from 'vue';

const escape = (str: string) => str.replace('$', '\\$');

export const variablesCompletions = defineComponent({
	methods: {
		/**
		 * Complete `$vars.` to `$vars.VAR_NAME`.
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
