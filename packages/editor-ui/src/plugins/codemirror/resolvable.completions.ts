import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

/**
 * Completions available inside the resolvable segment `{{ ... }}` of an n8n expression.
 *
 * Currently unused.
 */
export function resolvableCompletions(context: CompletionContext): CompletionResult | null {
	const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);

	if (nodeBefore.name !== 'Resolvable') return null;

	const pattern = /(?<quotedString>('|")\w*('|"))\./;

	const preCursor = context.matchBefore(pattern);

	if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

	const match = preCursor.text.match(pattern);

	if (!match?.groups?.quotedString) return null;

	const { quotedString } = match.groups;

	return {
		from: preCursor.from,
		options: [
			{ label: `${quotedString}.replace()`, info: 'Replace part of a string with another' },
			{ label: `${quotedString}.slice()`, info: 'Copy part of a string' },
		],
	};
}
