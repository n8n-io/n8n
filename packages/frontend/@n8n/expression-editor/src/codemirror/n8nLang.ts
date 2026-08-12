import type { Completion } from '@codemirror/autocomplete';
import { autocompletion, ifIn } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parseMixed, type SyntaxNodeRef } from '@lezer/common';
import { parserWithMetaData as n8nParser } from '@n8n/codemirror-lang';

import { expressionCloseBracketsConfig } from './expressionCloseBrackets';
import type { ExpressionCompletionSource } from '../types';

const isResolvable = (node: SyntaxNodeRef) => node.type.name === 'Resolvable';

const n8nParserWithNestedJsParser = n8nParser.configure({
	wrap: parseMixed((node) => {
		if (node.type.isTop) return null;

		return node.name === 'Resolvable'
			? { parser: javascriptLanguage.parser, overlay: isResolvable }
			: null;
	}),
});

const n8nLanguage = LRLanguage.define({ parser: n8nParserWithNestedJsParser });

export function n8nLang(completionSources: readonly ExpressionCompletionSource[] = []) {
	return new LanguageSupport(n8nLanguage, [
		n8nLanguage.data.of(expressionCloseBracketsConfig),
		...completionSources.map((source) =>
			n8nLanguage.data.of({ autocomplete: ifIn(['Resolvable'], source) }),
		),
	]);
}

export const n8nAutocompletion = () =>
	autocompletion({
		icons: false,
		aboveCursor: true,
		closeOnBlur: false,
		optionClass: (completion: Completion) => completion.type ?? '',
	});
