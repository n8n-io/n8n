import { parserWithMetaData as n8nParser } from 'codemirror-lang-n8n-expression';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { completeFromList, ifIn, snippetCompletion } from '@codemirror/autocomplete';

import { i18n } from '@/plugins/i18n';
import { proxyCompletions } from './completions/proxy.completions';
import { rootCompletions } from './completions/root.completions';
import { luxonCompletions } from './completions/luxon.completions';
import { alphaCompletions } from './completions/alpha.completions';
import { datatypeCompletions } from './completions/datatype.completions';

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
	const autoshownSnippets = completeFromList(
		[...Object.keys(i18n.rootVars), '$parameter', 'DateTime']
			.sort((a, b) => a.localeCompare(b))
			.map((key) =>
				snippetCompletion(key, { label: key, type: key === '$jmespath' ? 'function' : 'keyword' }),
			), // @TODO: Extract $jmespath check
	);

	const options = [
		autoshownSnippets, // displayed on creating empty resolvable {{ | }}
		rootCompletions, // $entity.
		proxyCompletions, // $input., $prevNode., etc.
		datatypeCompletions, // 'abc'., $json.name., etc.
		alphaCompletions, // D (for DateTime)
		luxonCompletions, // DateTime., $now., $today.
	].map((group) => n8nLanguage.data.of({ autocomplete: ifIn(['Resolvable'], group) }));

	return new LanguageSupport(n8nLanguage, [
		n8nLanguage.data.of({ closeBrackets: { brackets: ['{'] } }),
		...options,
	]);
}
