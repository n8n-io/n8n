import { parserWithMetaData as n8nParser } from './parser-with-unicode'; // @TODO: Update lib
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { ifIn } from '@codemirror/autocomplete';

import { proxyCompletions } from './completions/proxy.completions';
import { dollarCompletions } from './completions/dollar.completions';
import { luxonCompletions } from './completions/luxon.completions';
import { nonDollarCompletions } from './completions/nonDollar.completions';
import { datatypeCompletions } from './completions/datatype.completions';
import { blankCompletions } from './completions/blank.completions';
import { jsonBracketCompletions } from './completions/jsonBracket.completions';

const n8nParserWithNestedJsParser = n8nParser.configure({
	wrap: parseMixed((node) => {
		if (node.type.isTop) return null;

		return node.name === 'Resolvable'
			? { parser: javascriptLanguage.parser, overlay: (node) => node.type.name === 'Resolvable' }
			: null;
	}),
});

const n8nLanguage = LRLanguage.define({ parser: n8nParserWithNestedJsParser });

export function n8nLang() {
	const options = [
		blankCompletions,
		dollarCompletions,
		nonDollarCompletions,
		proxyCompletions, // from `$input.`, `$(...)`, etc.
		datatypeCompletions, // from primitives `'abc'.` and from references `$json.name.`
		luxonCompletions, // from luxon vars: `DateTime.`, `$now.`, `$today.`
		jsonBracketCompletions, // from `json[`
	].map((group) => n8nLanguage.data.of({ autocomplete: ifIn(['Resolvable'], group) }));

	return new LanguageSupport(n8nLanguage, [
		n8nLanguage.data.of({ closeBrackets: { brackets: ['{', '('] } }),
		...options,
	]);
}
