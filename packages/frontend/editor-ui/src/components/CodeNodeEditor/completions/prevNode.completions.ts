import { addVarType } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useI18n } from '@n8n/i18n';

const DEFAULT_MATCHER = '$prevNode';

const escape = (str: string) => str.replace('$', '\\$');

export function usePrevNodeCompletions(matcher = DEFAULT_MATCHER) {
	const i18n = useI18n();

	/**
	 * Complete `$prevNode.` to `.name .outputIndex .runIndex`.
	 */
	const prevNodeCompletions = (context: CompletionContext): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const options: Completion[] = [
			{
				label: `${matcher}.name`,
				info: i18n.baseText('codeNodeEditor.completer.$prevNode.name'),
			},
			{
				label: `${matcher}.outputIndex`,
				info: i18n.baseText('codeNodeEditor.completer.$prevNode.outputIndex'),
			},
			{
				label: `${matcher}.runIndex`,
				info: i18n.baseText('codeNodeEditor.completer.$prevNode.runIndex'),
			},
		];

		return {
			from: preCursor.from,
			options: options.map(addVarType),
		};
	};

	return { prevNodeCompletions };
}
