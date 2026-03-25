import * as tmpl from '@n8n_io/riot-tmpl';
import { print, visit } from 'recast';
import { isDifferent } from './Differ';

import type { ExpressionAnalysis } from './ExpressionBuilder';
import { getExpressionCode, getParsedExpression } from './ExpressionBuilder';
import { joinExpression } from './ExpressionSplitter';

interface TmplOrTournament {
	tmpl: boolean;
	tournament: boolean;
}
interface TmplSame {
	same: true;
	expression?: SanitizedString;
}
interface TmplDiff {
	same: false;
	expression: SanitizedString | 'UNPARSEABLE';
	has?: ExpressionAnalysis['has'];
	parserError?: TmplOrTournament;
}
export type TmplDifference = TmplSame | TmplDiff;

export const getTmplDifference = (expr: string, dataNodeName: string): TmplDifference => {
	if (!expr) {
		return { same: true };
	}
	if (tmpl.brackets.settings.brackets !== '{{ }}') {
		tmpl.brackets.set('{{ }}');
	}
	let tournParsed: string | null;
	let tmplParsed: string | null;
	let analysis: ExpressionAnalysis | null;
	try {
		[tournParsed, analysis] = getExpressionCode(expr, dataNodeName, { before: [], after: [] });
	} catch (e) {
		tournParsed = null;
		analysis = null;
	}
	try {
		tmplParsed = tmpl.tmpl.getStr(expr);
	} catch (e) {
		tmplParsed = null;
	}
	if (analysis?.has.function || analysis?.has.templateString) {
		return {
			same: false,
			expression: stripIdentifyingInformation(expr),
			has: analysis.has,
		};
	}
	if (tournParsed === null && tmplParsed === null) {
		// Bad expression
		return { same: true };
	} else if (tournParsed === null) {
		// Unparsable expression for tournament
		return {
			same: false,
			expression: 'UNPARSEABLE',
			parserError: {
				tmpl: false,
				tournament: true,
			},
		};
	} else if (tmplParsed === null) {
		// Unparsable expression for tmpl
		return {
			same: false,
			expression: stripIdentifyingInformation(expr),
			parserError: {
				tmpl: true,
				tournament: false,
			},
		};
	}
	const different = isDifferent(tmplParsed, tournParsed);
	if (different) {
		// Different output
		return {
			same: false,
			expression: stripIdentifyingInformation(expr),
		};
	}
	// Same, nothing to report
	return { same: true, expression: stripIdentifyingInformation(expr) };
};

const CHAR_REPLACE = /\S/gu;

// Replace all non-whitespace characters with the letter v.
// This should work with all characters since we're just
// matching on all non-whitespace characters, including
// anything outside the ASCII code points.
const replaceValue = (value: string): string => {
	return value.replace(CHAR_REPLACE, 'v');
};

export interface SanitizedString {
	value: string;
	sanitized: 'ACTUALLY_SANITIZED_DO_NOT_MANUALLY_MAKE_THIS_OBJECT';
}

export const stripIdentifyingInformation = (expr: string): SanitizedString => {
	const chunks = getParsedExpression(expr);

	for (const chunk of chunks) {
		if (chunk.type === 'text') {
			chunk.text = replaceValue(chunk.text);
		} else {
			visit(chunk.parsed, {
				visitLiteral(path) {
					this.traverse(path);
					if (typeof path.node.value === 'string') {
						path.node.value = replaceValue(path.node.value);
					}
				},
				visitStringLiteral(path) {
					this.traverse(path);
					path.node.value = replaceValue(path.node.value);
				},
				visitTemplateElement(path) {
					this.traverse(path);
					if (path.node.value.cooked !== null) {
						path.node.value.cooked = replaceValue(path.node.value.cooked);
					}
					path.node.value.raw = replaceValue(path.node.value.raw);
				},
			});
			chunk.text = print(chunk.parsed).code;
		}
	}

	return {
		value: joinExpression(chunks),
		sanitized: 'ACTUALLY_SANITIZED_DO_NOT_MANUALLY_MAKE_THIS_OBJECT',
	};
};
