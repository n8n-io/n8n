import type { InputStream } from '@lezer/lr';
import { ExternalTokenizer } from '@lezer/lr';

import {
	LineComment,
	BlockComment,
	String as StringToken,
	Number as NumberToken,
	Bits,
	Bytes,
	Bool,
	Null,
	ParenL,
	ParenR,
	BraceL,
	BraceR,
	BracketL,
	BracketR,
	Semi,
	Dot,
	Operator,
	Punctuation,
	SpecialVar,
	Identifier,
	QuotedIdentifier,
	Keyword,
	Type,
	Builtin,
	Whitespace,
	Function,
} from './grammar.sql.terms';

const enum Ch {
	Newline = 10,
	Space = 32,
	DoubleQuote = 34,
	Hash = 35,
	Dollar = 36,
	SingleQuote = 39,
	ParenL = 40,
	ParenR = 41,
	Star = 42,
	Plus = 43,
	Comma = 44,
	Dash = 45,
	Dot = 46,
	Slash = 47,
	Colon = 58,
	Semi = 59,
	Question = 63,
	At = 64,
	BracketL = 91,
	BracketR = 93,
	Backslash = 92,
	Underscore = 95,
	Backtick = 96,
	BraceL = 123,
	BraceR = 125,

	A = 65,
	a = 97,
	B = 66,
	b = 98,
	E = 69,
	e = 101,
	F = 70,
	f = 102,
	N = 78,
	n = 110,
	X = 88,
	x = 120,
	Z = 90,
	z = 122,

	_0 = 48,
	_1 = 49,
	_9 = 57,
}

function isAlpha(ch: number) {
	return (ch >= Ch.A && ch <= Ch.Z) || (ch >= Ch.a && ch <= Ch.z) || (ch >= Ch._0 && ch <= Ch._9);
}

function isHexDigit(ch: number) {
	return (ch >= Ch._0 && ch <= Ch._9) || (ch >= Ch.a && ch <= Ch.f) || (ch >= Ch.A && ch <= Ch.F);
}

function readLiteral(input: InputStream, endQuote: number, backslashEscapes: boolean) {
	for (let escaped = false; ; ) {
		if (input.next < 0) return;
		if (input.next === endQuote && !escaped) {
			input.advance();
			return;
		}
		escaped = backslashEscapes && !escaped && input.next === Ch.Backslash;
		input.advance();
	}
}

function readDoubleDollarLiteral(input: InputStream) {
	for (;;) {
		if (input.next < 0 || input.peek(1) < 0) return;
		if (input.next === Ch.Dollar && input.peek(1) === Ch.Dollar) {
			input.advance(2);
			return;
		}
		input.advance();
	}
}

function readWord(input: InputStream): void;
function readWord(input: InputStream, result: string): string;
function readWord(input: InputStream, result?: string) {
	for (;;) {
		if (input.next !== Ch.Underscore && !isAlpha(input.next)) break;
		if (result !== null) result += String.fromCharCode(input.next);
		input.advance();
	}
	return result;
}

function readWordOrQuoted(input: InputStream) {
	if (
		input.next === Ch.SingleQuote ||
		input.next === Ch.DoubleQuote ||
		input.next === Ch.Backtick
	) {
		const quote = input.next;
		input.advance();
		readLiteral(input, quote, false);
	} else {
		readWord(input);
	}
}

function readBits(input: InputStream, endQuote?: number) {
	while (input.next === Ch._0 || input.next === Ch._1) input.advance();
	if (endQuote && input.next === endQuote) input.advance();
}

function readNumber(input: InputStream, sawDot: boolean) {
	for (;;) {
		if (input.next === Ch.Dot) {
			if (sawDot) break;
			sawDot = true;
		} else if (input.next < Ch._0 || input.next > Ch._9) {
			break;
		}
		input.advance();
	}
	if (input.next === Ch.E || input.next === Ch.e) {
		input.advance();
		// advance() updates next, so we need to cast to unknown to avoid type errors
		const advancedInput = input as unknown as InputStream;
		if (advancedInput.next === Ch.Plus || advancedInput.next === Ch.Dash) input.advance();
		while (input.next >= Ch._0 && input.next <= Ch._9) input.advance();
	}
}

function eol(input: InputStream) {
	while (!(input.next < 0 || input.next === Ch.Newline)) input.advance();
}

function inString(ch: number, str: string) {
	for (let i = 0; i < str.length; i++) if (str.charCodeAt(i) === ch) return true;
	return false;
}

const Space = ' \t\r\n';

function keywords(keywords: string, types: string, builtin?: string, functions?: string) {
	const result = Object.create(null) as { [name: string]: number };
	result['true'] = result['false'] = Bool;
	result['null'] = result['unknown'] = Null;
	for (const kw of keywords.split(' ')) if (kw) result[kw] = Keyword;
	for (const tp of types.split(' ')) if (tp) result[tp] = Type;
	for (const kw of (builtin || '').split(' ')) if (kw) result[kw] = Builtin;
	for (const fn of (functions || '').split(' ')) if (fn) result[fn] = Function;
	return result;
}

export interface Dialect {
	backslashEscapes: boolean;
	hashComments: boolean;
	spaceAfterDashes: boolean;
	slashComments: boolean;
	doubleQuotedStrings: boolean;
	doubleDollarQuotedStrings: boolean;
	unquotedBitLiterals: boolean;
	treatBitsAsBytes: boolean;
	charSetCasts: boolean;
	operatorChars: string;
	specialVar: string;
	identifierQuotes: string;
	words: { [name: string]: number };
}

export const SQLTypes =
	'array binary bit boolean char character clob date decimal double float int integer interval large national nchar nclob numeric object precision real smallint time timestamp varchar varying ';
export const SQLFunctions =
	'abs absolute case check cast concat coalesce cube collate count current_date current_path current_role current_time current_timestamp current_user day exists grouping hour localtime localtimestamp minute month second trim session_user size system_user treat unnest user year equals lower upper pow floor ceil exp log ifnull min max avg sum sqrt round ';
export const SQLKeywords =
	'action add after all allocate alter and any are as asc assertion at authorization before begin between both breadth by call cascade cascaded catalog close collation column commit condition connect connection constraint constraints constructor continue corresponding create cross current current_default_transform_group current_transform_group_for_type cursor cycle data deallocate declare default deferrable deferred delete depth deref desc describe descriptor deterministic diagnostics disconnect distinct do domain drop dynamic each else elseif end end-exec equals escape except exception exec execute exit external fetch first for foreign found from free full function general get global go goto grant group handle having hold identity if immediate in indicator initially inner inout input insert intersect into is isolation join key language last lateral leading leave left level like limit local locator loop map match method modifies module names natural nesting new next no none not of old on only open option or order ordinality out outer output overlaps pad parameter partial path prepare preserve primary prior privileges procedure public read reads recursive redo ref references referencing relative release repeat resignal restrict result return returns revoke right role rollback rollup routine row rows savepoint schema scroll search section select session set sets signal similar some space specific specifictype sql sqlexception sqlstate sqlwarning start state static table temporary then timezone_hour timezone_minute to trailing transaction translation trigger under undo union unique until update usage using value values view when whenever where while with without work write zone ';

const defaults: Dialect = {
	backslashEscapes: false,
	hashComments: false,
	spaceAfterDashes: false,
	slashComments: false,
	doubleQuotedStrings: false,
	doubleDollarQuotedStrings: false,
	unquotedBitLiterals: false,
	treatBitsAsBytes: false,
	charSetCasts: false,
	operatorChars: '*+-%<>!==&|~^/',
	specialVar: '?',
	identifierQuotes: '"',
	words: keywords(SQLKeywords, SQLTypes, '', SQLFunctions),
};

export function dialect(
	spec: Partial<Dialect>,
	kws?: string,
	types?: string,
	builtin?: string,
	functions?: string,
): Dialect {
	const dialect = {} as Dialect;
	for (const prop in defaults)
		(dialect as unknown as Record<string, unknown>)[prop] = (
			(Object.prototype.hasOwnProperty.call(spec, prop) ? spec : defaults) as unknown as Record<
				string,
				unknown
			>
		)[prop];
	if (kws) dialect.words = keywords(kws, types || '', builtin, functions);
	return dialect;
}

export function tokensFor(d: Dialect) {
	return new ExternalTokenizer((input) => {
		const { next } = input;
		input.advance();
		if (inString(next, Space)) {
			while (inString(input.next, Space)) input.advance();
			input.acceptToken(Whitespace);
		} else if (next === Ch.Dollar && input.next === Ch.Dollar && d.doubleDollarQuotedStrings) {
			readDoubleDollarLiteral(input);
			input.acceptToken(StringToken);
		} else if (next === Ch.SingleQuote || (next === Ch.DoubleQuote && d.doubleQuotedStrings)) {
			readLiteral(input, next, d.backslashEscapes);
			input.acceptToken(StringToken);
		} else if (
			(next === Ch.Hash && d.hashComments) ||
			(next === Ch.Slash && input.next === Ch.Slash && d.slashComments)
		) {
			eol(input);
			input.acceptToken(LineComment);
		} else if (
			next === Ch.Dash &&
			input.next === Ch.Dash &&
			(!d.spaceAfterDashes || input.peek(1) === Ch.Space)
		) {
			eol(input);
			input.acceptToken(LineComment);
		} else if (next === Ch.Slash && input.next === Ch.Star) {
			input.advance();
			for (let depth = 1; ; ) {
				const cur: number = input.next;
				if (input.next < 0) break;
				input.advance();
				if (cur === Ch.Star && (input as unknown as InputStream).next === Ch.Slash) {
					depth--;
					input.advance();
					if (!depth) break;
				} else if (cur === Ch.Slash && input.next === Ch.Star) {
					depth++;
					input.advance();
				}
			}
			input.acceptToken(BlockComment);
		} else if ((next === Ch.e || next === Ch.E) && input.next === Ch.SingleQuote) {
			input.advance();
			readLiteral(input, Ch.SingleQuote, true);
		} else if (
			(next === Ch.n || next === Ch.N) &&
			input.next === Ch.SingleQuote &&
			d.charSetCasts
		) {
			input.advance();
			readLiteral(input, Ch.SingleQuote, d.backslashEscapes);
			input.acceptToken(StringToken);
		} else if (next === Ch.Underscore && d.charSetCasts) {
			for (let i = 0; ; i++) {
				if (input.next === Ch.SingleQuote && i > 1) {
					input.advance();
					readLiteral(input, Ch.SingleQuote, d.backslashEscapes);
					input.acceptToken(StringToken);
					break;
				}
				if (!isAlpha(input.next)) break;
				input.advance();
			}
		} else if (next === Ch.ParenL) {
			input.acceptToken(ParenL);
		} else if (next === Ch.ParenR) {
			input.acceptToken(ParenR);
		} else if (next === Ch.BraceL) {
			input.acceptToken(BraceL);
		} else if (next === Ch.BraceR) {
			input.acceptToken(BraceR);
		} else if (next === Ch.BracketL) {
			input.acceptToken(BracketL);
		} else if (next === Ch.BracketR) {
			input.acceptToken(BracketR);
		} else if (next === Ch.Semi) {
			input.acceptToken(Semi);
		} else if (d.unquotedBitLiterals && next === Ch._0 && input.next === Ch.b) {
			input.advance();
			readBits(input);
			input.acceptToken(Bits);
		} else if (
			(next === Ch.b || next === Ch.B) &&
			(input.next === Ch.SingleQuote || input.next === Ch.DoubleQuote)
		) {
			const quoteStyle = input.next;
			input.advance();
			if (d.treatBitsAsBytes) {
				readLiteral(input, quoteStyle, d.backslashEscapes);
				input.acceptToken(Bytes);
			} else {
				readBits(input, quoteStyle);
				input.acceptToken(Bits);
			}
		} else if (
			(next === Ch._0 && (input.next === Ch.x || input.next === Ch.X)) ||
			((next === Ch.x || next === Ch.X) && input.next === Ch.SingleQuote)
		) {
			const quoted = input.next === Ch.SingleQuote;
			input.advance();
			while (isHexDigit(input.next)) input.advance();
			if (quoted && input.next === Ch.SingleQuote) input.advance();
			input.acceptToken(NumberToken);
		} else if (next === Ch.Dot && input.next >= Ch._0 && input.next <= Ch._9) {
			readNumber(input, true);
			input.acceptToken(NumberToken);
		} else if (next === Ch.Dot) {
			input.acceptToken(Dot);
		} else if (next >= Ch._0 && next <= Ch._9) {
			readNumber(input, false);
			input.acceptToken(NumberToken);
		} else if (inString(next, d.operatorChars)) {
			while (inString(input.next, d.operatorChars)) input.advance();
			input.acceptToken(Operator);
		} else if (inString(next, d.specialVar)) {
			if (input.next === next) input.advance();
			readWordOrQuoted(input);
			input.acceptToken(SpecialVar);
		} else if (inString(next, d.identifierQuotes)) {
			readLiteral(input, next, false);
			input.acceptToken(QuotedIdentifier);
		} else if (next === Ch.Colon || next === Ch.Comma) {
			input.acceptToken(Punctuation);
		} else if (isAlpha(next)) {
			const word = readWord(input, String.fromCharCode(next));
			input.acceptToken(
				input.next === Ch.Dot ? Identifier : (d.words[word.toLowerCase()] ?? Identifier),
			);
		}
	});
}

export const tokens = tokensFor(defaults);
