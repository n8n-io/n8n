import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

import { useSnippetsStore } from '../snippets.store';
import { parseSnippetSignature } from '../snippets.utils';

const escape = (str: string) => str.replace('$', '\\$');

export function useSnippetsCompletions() {
	const snippetsStore = useSnippetsStore();

	/**
	 * Complete `$snippets.` / `$project.` (or an alias variable) to snippet names
	 * in the Code node editor.
	 */
	const snippetsCompletions = (
		context: CompletionContext,
		matcher = '$snippets',
		scope: '$snippets' | '$project' = matcher === '$project' ? '$project' : '$snippets',
	): CompletionResult | null => {
		const pattern = new RegExp(`${escape(matcher)}\..*`);

		const preCursor = context.matchBefore(pattern);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const snippets = snippetsStore.allSnippets.filter((snippet) =>
			scope === '$snippets' ? !snippet.project : !!snippet.project,
		);

		const options: Completion[] = snippets.map((snippet) => {
			const signature = parseSnippetSignature(snippet.code);
			return {
				label: `${matcher}.${snippet.name}${signature.isFunction ? '()' : ''}`,
				type: signature.isFunction ? 'function' : 'variable',
				info: snippet.description ?? undefined,
			};
		});

		return {
			from: preCursor.from,
			options,
		};
	};

	return { snippetsCompletions };
}
