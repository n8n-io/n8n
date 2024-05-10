import { parserWithMetaData as n8nParser } from '@n8n/codemirror-lang';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { javascriptLanguage } from '@codemirror/lang-javascript';

import { n8nCompletionSources } from './completions/addCompletions';
import { autocompletion } from '@codemirror/autocomplete';

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
	return new LanguageSupport(n8nLanguage, [
		n8nLanguage.data.of({ closeBrackets: { brackets: ['{', '('] } }),
		...n8nCompletionSources().map((source) => n8nLanguage.data.of(source)),
	]);
}

export const n8nAutocompletion = () =>
	autocompletion({ icons: false, aboveCursor: true, closeOnBlur: false });
