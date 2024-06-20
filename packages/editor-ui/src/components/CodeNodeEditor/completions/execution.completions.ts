import { addInfoRenderer, addVarType, escape } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useI18n } from '@/composables/useI18n';

export function useExecutionCompletions() {
	const i18n = useI18n();

	/**
	 * Complete `$execution.` to `.id .mode .resumeUrl .resumeFormUrl`
	 */
	const executionCompletions = (
		context: CompletionContext,
		matcher = '$execution',
	): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const options: Completion[] = [
			{
				label: `${matcher}.id`,
				info: i18n.baseText('codeNodeEditor.completer.$execution.id'),
			},
			{
				label: `${matcher}.mode`,
				info: i18n.baseText('codeNodeEditor.completer.$execution.mode'),
			},
			{
				label: `${matcher}.resumeUrl`,
				info: i18n.baseText('codeNodeEditor.completer.$execution.resumeUrl'),
			},
			{
				label: `${matcher}.resumeFormUrl`,
				info: i18n.baseText('codeNodeEditor.completer.$execution.resumeFormUrl'),
			},
			{
				label: `${matcher}.customData.set("key", "value")`,
				info: i18n.baseText('codeNodeEditor.completer.$execution.customData.set'),
			},
			{
				label: `${matcher}.customData.get("key")`,
				info: i18n.baseText('codeNodeEditor.completer.$execution.customData.get'),
			},
			{
				label: `${matcher}.customData.setAll({})`,
				info: i18n.baseText('codeNodeEditor.completer.$execution.customData.setAll'),
			},
			{
				label: `${matcher}.customData.getAll()`,
				info: i18n.baseText('codeNodeEditor.completer.$execution.customData.getAll'),
			},
		];

		return {
			from: preCursor.from,
			options: options.map(addVarType).map(addInfoRenderer),
		};
	};

	return { executionCompletions };
}
