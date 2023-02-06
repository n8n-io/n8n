import { parserWithMetaData as n8nParser } from 'codemirror-lang-n8n-expression';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { ifIn } from '@codemirror/autocomplete';

import { blankCompletions } from './completions/blank.completions';
import { bracketAccessCompletions } from './completions/bracketAccess.completions';
import { datatypeCompletions } from './completions/datatype.completions';
import { dollarCompletions } from './completions/dollar.completions';
import { nonDollarCompletions } from './completions/nonDollar.completions';

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
		bracketAccessCompletions,
		datatypeCompletions,
		dollarCompletions,
		nonDollarCompletions,
	].map((group) => n8nLanguage.data.of({ autocomplete: ifIn(['Resolvable'], group) }));

	return new LanguageSupport(n8nLanguage, [
		n8nLanguage.data.of({ closeBrackets: { brackets: ['{', '('] } }),
		...options,
	]);
}
