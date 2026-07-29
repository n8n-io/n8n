import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useEnvironmentsStore } from '../environments.store';

const escape = (str: string) => str.replace('$', '\\$');

export const addVarType = (option: Completion) => ({ ...option, type: 'variable' });

export function useVariablesCompletions() {
	const environmentsStore = useEnvironmentsStore();

	/**
	 * Complete `$vars.` to `$vars.VAR_NAME`.
	 */
	const variablesCompletions = (
		context: CompletionContext,
		matcher = '$vars',
	): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const options: Completion[] = environmentsStore.scopedVariables.map((variable) => ({
			label: `${matcher}.${variable.key}`,
			info: variable.value,
		}));

		return {
			from: preCursor.from,
			options: options.map(addVarType),
		};
	};

	return {
		variablesCompletions,
	};
}
