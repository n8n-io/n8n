import { parserWithMetaData as n8nParser } from 'codemirror-lang-n8n-expression';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
// import { parser as jsParser } from '@lezer/javascript';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { ifIn } from '@codemirror/autocomplete';

import { proxyCompletions } from './completions/proxy.completions';
import { rootCompletions } from './completions/root.completions';
import { luxonCompletions } from './completions/luxon.completions';
import { alphaCompletions } from './completions/alpha.completions';

const n8nParserWithNestedJsParser = n8nParser.configure({
	wrap: parseMixed((node) => {
		if (node.type.isTop) return null;

		// @TODO: overlay still needed?
		return node.name === 'Resolvable'
			? { parser: javascriptLanguage.parser, overlay: (node) => node.type.name === 'Resolvable' }
			: null;
	}),
});

const n8nLanguage = LRLanguage.define({ parser: n8nParserWithNestedJsParser });

// legacy: ExpressionEditorModalInput.vue
export function n8nLanguageSupport() {
	return new LanguageSupport(n8nLanguage);
}

export function n8nLang() {
	return new LanguageSupport(n8nLanguage, [
		n8nLanguage.data.of({ closeBrackets: { brackets: ['{'] } }),
		n8nLanguage.data.of({ autocomplete: ifIn(['Resolvable'], rootCompletions) }),
		n8nLanguage.data.of({ autocomplete: ifIn(['Resolvable'], proxyCompletions) }),
		n8nLanguage.data.of({ autocomplete: ifIn(['Resolvable'], luxonCompletions) }),
		n8nLanguage.data.of({ autocomplete: ifIn(['Resolvable'], alphaCompletions) }),
	]);
}
