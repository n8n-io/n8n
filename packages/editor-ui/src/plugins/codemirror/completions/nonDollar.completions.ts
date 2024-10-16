import { i18n } from '@/plugins/i18n';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { prefixMatch } from './utils';
import { createInfoBoxRenderer } from './infoBoxRenderer';

/**
 * Completions offered at the initial position for any char other than `$`.
 */
export function nonDollarCompletions(context: CompletionContext): CompletionResult | null {
	const dateTime = /(\s+)D[ateTim]*/;
	const math = /(\s+)M[ath]*/;
	const object = /(\s+)O[bject]*/;

	const combinedRegex = new RegExp([dateTime.source, math.source, object.source].join('|'));

	const word = context.matchBefore(combinedRegex);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const userInput = word.text.trim();

	const nonDollarOptions = [
		{
			label: 'DateTime',
			info: createInfoBoxRenderer({
				name: 'DateTime',
				returnType: 'DateTimeGlobal',
				description: i18n.baseText('codeNodeEditor.completer.dateTime'),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
			}),
		},
		{
			label: 'Math',
			info: createInfoBoxRenderer({
				name: 'Math',
				returnType: 'MathGlobal',
				description: i18n.baseText('codeNodeEditor.completer.math'),
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math',
			}),
		},
		{
			label: 'Object',
			info: createInfoBoxRenderer({
				name: 'Object',
				returnType: 'ObjectGlobal',
				description: i18n.baseText('codeNodeEditor.completer.globalObject'),
				docURL:
					'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object',
			}),
		},
	];

	const options = nonDollarOptions.filter((o) => prefixMatch(o.label, userInput));

	return {
		from: word.to - userInput.length,
		filter: false,
		options,
	};
}
