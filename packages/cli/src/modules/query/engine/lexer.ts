import { ParseError } from './errors';

export type Token =
	| { kind: 'KEYWORD'; value: string; start: number }
	| { kind: 'IDENT'; value: string; start: number }
	| { kind: 'STRING'; value: string; start: number }
	| { kind: 'NUMBER'; value: number; start: number }
	| { kind: 'OPERATOR'; value: string; start: number }
	| { kind: 'PUNCT'; value: string; start: number }
	| { kind: 'STAR'; start: number }
	| { kind: 'EOF'; start: number };

export type TokenKind = Token['kind'];

const KEYWORDS = new Set([
	'SELECT',
	'FROM',
	'WHERE',
	'AND',
	'OR',
	'NOT',
	'ORDER',
	'BY',
	'GROUP',
	'HAVING',
	'LIMIT',
	'ASC',
	'DESC',
	'IS',
	'NULL',
	'IN',
	'LIKE',
	'LAST',
	'SINCE',
	'EXECUTION',
	'COUNT',
	'SUM',
	'AVG',
	'MIN',
	'MAX',
	// reserved for v1 grammar — recognised so the parser can issue specific errors
	'JOIN',
	'LEFT',
	'RIGHT',
	'INNER',
	'FULL',
	'CROSS',
	'OUTER',
	'ON',
	'AS',
]);

const PUNCT_CHARS = new Set(['(', ')', ',', '.']);

const isDigit = (c: string) => c >= '0' && c <= '9';
const isAlpha = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const isIdentStart = (c: string) => isAlpha(c) || c === '_';
const isIdentPart = (c: string) => isIdentStart(c) || isDigit(c);
const isWhitespace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

export function lex(input: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < input.length) {
		const c = input[i];

		if (isWhitespace(c)) {
			i++;
			continue;
		}

		const start = i;

		// string literal — single-quoted, SQL doubling for escapes
		if (c === "'") {
			i++;
			let value = '';
			let closed = false;
			while (i < input.length) {
				if (input[i] === "'") {
					if (input[i + 1] === "'") {
						value += "'";
						i += 2;
					} else {
						i++;
						closed = true;
						break;
					}
				} else {
					value += input[i];
					i++;
				}
			}
			if (!closed) {
				throw new ParseError('Unterminated string literal', start);
			}
			tokens.push({ kind: 'STRING', value, start });
			continue;
		}

		// two-char operators
		const two = input.slice(i, i + 2);
		if (two === '!=' || two === '<>' || two === '<=' || two === '>=') {
			tokens.push({ kind: 'OPERATOR', value: two, start });
			i += 2;
			continue;
		}

		// single-char operators
		if (c === '=' || c === '<' || c === '>') {
			tokens.push({ kind: 'OPERATOR', value: c, start });
			i++;
			continue;
		}

		if (c === '*') {
			tokens.push({ kind: 'STAR', start });
			i++;
			continue;
		}

		if (PUNCT_CHARS.has(c)) {
			tokens.push({ kind: 'PUNCT', value: c, start });
			i++;
			continue;
		}

		// numeric literal
		if (isDigit(c)) {
			let numStr = '';
			let sawDot = false;
			while (i < input.length) {
				if (isDigit(input[i])) {
					numStr += input[i];
					i++;
				} else if (input[i] === '.' && !sawDot && isDigit(input[i + 1])) {
					numStr += '.';
					sawDot = true;
					i++;
				} else {
					break;
				}
			}
			tokens.push({ kind: 'NUMBER', value: Number(numStr), start });
			continue;
		}

		// identifier or keyword
		if (isIdentStart(c)) {
			let id = '';
			while (i < input.length && isIdentPart(input[i])) {
				id += input[i];
				i++;
			}
			const upper = id.toUpperCase();
			if (KEYWORDS.has(upper)) {
				tokens.push({ kind: 'KEYWORD', value: upper, start });
			} else {
				tokens.push({ kind: 'IDENT', value: id, start });
			}
			continue;
		}

		throw new ParseError(`Unexpected character: ${c}`, i);
	}

	tokens.push({ kind: 'EOF', start: input.length });
	return tokens;
}
