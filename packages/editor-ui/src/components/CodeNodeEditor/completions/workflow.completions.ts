import { addVarType } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useI18n } from '@/composables/useI18n';

const escape = (str: string) => str.replace('$', '\\$');

export function useWorkflowCompletions() {
	const i18n = useI18n();

	/**
	 * Complete `$workflow.` to `.id .name .active`.
	 */
	const workflowCompletions = (
		context: CompletionContext,
		matcher = '$workflow',
	): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const options: Completion[] = [
			{
				label: `${matcher}.id`,
				info: i18n.baseText('codeNodeEditor.completer.$workflow.id'),
			},
			{
				label: `${matcher}.name`,
				info: i18n.baseText('codeNodeEditor.completer.$workflow.name'),
			},
			{
				label: `${matcher}.active`,
				info: i18n.baseText('codeNodeEditor.completer.$workflow.active'),
			},
		];

		return {
			from: preCursor.from,
			options: options.map(addVarType),
		};
	};

	return { workflowCompletions };
}
