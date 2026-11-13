/**
 * Checks a regular expression against the subset that the runtime's regex
 * engine supports (spec section 4.6). The converter checks each regular
 * expression literal before it writes native code, so the runtime only meets
 * patterns that it supports.
 *
 * The parser follows the ECMAScript pattern grammar, with the web-compatibility
 * rules of Annex B in the non-Unicode mode for the forms that it accepts
 * (`]`, `{` and `}` as plain characters). It rejects the forms that the engine
 * does not have. The runtime parser (`workflow-runtime/src/core/regex.zig`)
 * accepts the same set.
 */

export interface RegexInfo {
	/** Number of capture groups. */
	groups: number;
	/** Name of each capture group (index 0 is group 1), or null. */
	names: Array<string | null>;
}

export type RegexCheck = { ok: true; info: RegexInfo } | { ok: false; reason: string };

/** Flags that the engine supports. */
const FLAGS = new Set(['g', 'i', 'm', 's', 'y', 'u']);

const SYNTAX_CHARS = new Set([
	'^',
	'$',
	'\\',
	'.',
	'*',
	'+',
	'?',
	'(',
	')',
	'[',
	']',
	'{',
	'}',
	'|',
	'/',
]);

class Unsupported extends Error {}

/** Checks `source` with `flags`. */
export function checkRegex(source: string, flags: string): RegexCheck {
	for (const f of flags) {
		if (!FLAGS.has(f)) return { ok: false, reason: `the flag "${f}"` };
	}
	if (new Set(flags).size !== flags.length) return { ok: false, reason: 'a repeated flag' };
	// The engine must agree with JavaScript about what is valid.
	try {
		new RegExp(source, flags);
	} catch {
		return { ok: false, reason: 'an invalid pattern' };
	}
	const unicode = flags.includes('u');
	if (unicode && flags.includes('i')) {
		return { ok: false, reason: 'the flags "u" and "i" together (Unicode case folding)' };
	}
	try {
		const info = new Parser(source, unicode).parse();
		return { ok: true, info };
	} catch (e) {
		if (e instanceof Unsupported) return { ok: false, reason: e.message };
		throw e;
	}
}

class Parser {
	private pos = 0;

	private groups = 0;

	private readonly names: Array<string | null> = [];

	private readonly totalGroups: number;

	private readonly hasNames: boolean;

	private readonly src: string;

	private readonly unicode: boolean;

	constructor(src: string, unicode: boolean) {
		this.src = src;
		this.unicode = unicode;
		const scan = scanGroups(src);
		this.totalGroups = scan.count;
		this.hasNames = scan.named;
	}

	parse(): RegexInfo {
		this.disjunction();
		if (this.pos < this.src.length) throw new Unsupported('an unbalanced parenthesis');
		return { groups: this.groups, names: this.names };
	}

	private peek(k = 0): string {
		return this.src.charAt(this.pos + k);
	}

	private eat(c: string): boolean {
		if (this.src.startsWith(c, this.pos)) {
			this.pos += c.length;
			return true;
		}
		return false;
	}

	private disjunction() {
		this.alternative();
		while (this.eat('|')) this.alternative();
	}

	private alternative() {
		while (this.pos < this.src.length && this.peek() !== '|' && this.peek() !== ')') this.term();
	}

	private term() {
		const c = this.peek();
		if (c === '^' || c === '$') {
			this.pos++;
			this.noQuantifier();
			return;
		}
		if (c === '\\' && (this.peek(1) === 'b' || this.peek(1) === 'B')) {
			this.pos += 2;
			this.noQuantifier();
			return;
		}
		if (c === '(' && this.peek(1) === '?') {
			const kind = this.src.slice(this.pos + 2, this.pos + 4);
			if (kind.startsWith('=') || kind.startsWith('!')) {
				this.pos += 3;
				this.disjunction();
				if (!this.eat(')')) throw new Unsupported('an unbalanced parenthesis');
				this.noQuantifier();
				return;
			}
			if (kind === '<=' || kind === '<!') throw new Unsupported('a lookbehind assertion');
		}
		this.atom();
		this.quantifier();
	}

	/** Quantifiers on assertions are errors, or Annex B forms that the engine does not have. */
	private noQuantifier() {
		const c = this.peek();
		if (c === '*' || c === '+' || c === '?' || (c === '{' && this.braceQuantifier() !== null)) {
			throw new Unsupported('a quantified assertion');
		}
	}

	/** Length of a `{n}`, `{n,}` or `{n,m}` quantifier at the position, or null. */
	private braceQuantifier(): { length: number; min: number; max: number } | null {
		const m = /^\{(\d+)(,(\d*))?\}/.exec(this.src.slice(this.pos));
		if (!m) return null;
		const min = Number(m[1]);
		const max = m[2] === undefined ? min : m[3] === '' ? Infinity : Number(m[3]);
		return { length: m[0].length, min, max };
	}

	private quantifier() {
		const c = this.peek();
		let q = false;
		if (c === '*' || c === '+' || c === '?') {
			this.pos++;
			q = true;
		} else if (c === '{') {
			const b = this.braceQuantifier();
			if (b) {
				if (b.min > 1000 || (b.max !== Infinity && b.max > 1000)) {
					throw new Unsupported('a repetition count above 1000');
				}
				this.pos += b.length;
				q = true;
			}
		}
		if (q) this.eat('?');
	}

	private atom() {
		const c = this.peek();
		if (c === '(') {
			this.pos++;
			if (this.eat('?:')) {
				this.disjunction();
			} else if (this.peek() === '?' && this.peek(1) === '<') {
				this.pos += 2;
				const end = this.src.indexOf('>', this.pos);
				const name = this.src.slice(this.pos, end);
				if (end < 0 || !/^[A-Za-z_$][\w$]*$/.test(name)) {
					throw new Unsupported('a group name that is not plain ASCII');
				}
				this.pos = end + 1;
				this.groups++;
				this.names.push(name);
				this.disjunction();
			} else if (this.peek() === '?') {
				throw new Unsupported('a group modifier');
			} else {
				this.groups++;
				this.names.push(null);
				this.disjunction();
			}
			if (!this.eat(')')) throw new Unsupported('an unbalanced parenthesis');
			return;
		}
		if (c === '[') {
			this.characterClass();
			return;
		}
		if (c === '\\') {
			this.pos++;
			this.atomEscape();
			return;
		}
		if (c === ')' || c === '*' || c === '+' || c === '?') {
			throw new Unsupported('a misplaced syntax character');
		}
		if (c === '{' && this.braceQuantifier() !== null) {
			throw new Unsupported('a misplaced syntax character');
		}
		this.pos += this.unicode ? codePointLength(this.src, this.pos) : 1;
	}

	private atomEscape() {
		const c = this.peek();
		if (c === '') throw new Unsupported('a trailing backslash');
		if (/[1-9]/.test(c)) {
			const m = /^\d+/.exec(this.src.slice(this.pos));
			const n = Number(m?.[0] ?? '0');
			if (n <= this.totalGroups) {
				this.pos += m?.[0].length ?? 1;
				return;
			}
			throw new Unsupported('a legacy octal escape');
		}
		if (c === 'k' && (this.unicode || this.hasNames)) {
			const end = this.src.indexOf('>', this.pos);
			if (this.peek(1) !== '<' || end < 0) throw new Unsupported('an invalid group reference');
			this.pos = end + 1;
			return;
		}
		this.characterEscape(false);
	}

	/** One escape after `\`, outside or inside a class. */
	private characterEscape(inClass: boolean) {
		const c = this.peek();
		if ('dDwWsS'.includes(c)) {
			this.pos++;
			return;
		}
		if (c === 'p' || c === 'P') {
			if (this.unicode) throw new Unsupported('a Unicode property escape');
			this.pos++;
			return;
		}
		if ('fnrtv'.includes(c)) {
			this.pos++;
			return;
		}
		if (c === 'b' && inClass) {
			this.pos++;
			return;
		}
		if (c === '-' && inClass) {
			this.pos++;
			return;
		}
		if (c === 'c') {
			if (/[A-Za-z]/.test(this.peek(1))) {
				this.pos += 2;
				return;
			}
			throw new Unsupported('a legacy control escape');
		}
		if (c === '0') {
			if (/\d/.test(this.peek(1))) throw new Unsupported('a legacy octal escape');
			this.pos++;
			return;
		}
		if (/\d/.test(c)) throw new Unsupported('a legacy octal escape');
		if (c === 'x') {
			if (/^[0-9A-Fa-f]{2}/.test(this.src.slice(this.pos + 1))) this.pos += 3;
			else if (this.unicode) throw new Unsupported('an invalid escape');
			else this.pos++;
			return;
		}
		if (c === 'u') {
			const rest = this.src.slice(this.pos + 1);
			if (/^[0-9A-Fa-f]{4}/.test(rest)) {
				this.pos += 5;
				return;
			}
			if (this.unicode) {
				const m = /^\{[0-9A-Fa-f]+\}/.exec(rest);
				if (!m) throw new Unsupported('an invalid escape');
				this.pos += 1 + m[0].length;
				return;
			}
			this.pos++;
			return;
		}
		if (this.unicode && !SYNTAX_CHARS.has(c)) throw new Unsupported('an invalid escape');
		if (c === 'k' && !inClass) {
			this.pos++;
			return;
		}
		// An identity escape: the character itself.
		this.pos += this.unicode ? codePointLength(this.src, this.pos) : 1;
	}

	private characterClass() {
		this.pos++;
		this.eat('^');
		let first = true;
		while (this.pos < this.src.length && this.peek() !== ']') {
			const a = this.classAtom();
			if (this.peek() === '-' && this.peek(1) !== ']' && this.peek(1) !== '') {
				this.pos++;
				const b = this.classAtom();
				if (a === null || b === null) {
					// Annex B: `[\d-x]` is a class with `-`; the engine does not have this form.
					throw new Unsupported('a class range with a class escape');
				}
			}
			first = false;
		}
		void first;
		if (!this.eat(']')) throw new Unsupported('an unterminated character class');
	}

	/** One class atom. Null for a class escape such as `\d`. */
	private classAtom(): string | null {
		const c = this.peek();
		if (c === '\\') {
			this.pos++;
			const e = this.peek();
			if ('dDwWsS'.includes(e)) {
				this.pos++;
				return null;
			}
			if (/[1-9]/.test(e)) throw new Unsupported('a legacy octal escape');
			if (e === 'c' && !/[A-Za-z]/.test(this.peek(1))) {
				throw new Unsupported('a legacy control escape');
			}
			const start = this.pos;
			this.characterEscape(true);
			return this.src.slice(start, this.pos);
		}
		const n = this.unicode ? codePointLength(this.src, this.pos) : 1;
		this.pos += n;
		return c;
	}
}

function codePointLength(s: string, i: number): number {
	const c = s.charCodeAt(i);
	if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
		const d = s.charCodeAt(i + 1);
		if (d >= 0xdc00 && d <= 0xdfff) return 2;
	}
	return 1;
}

/** Counts capture groups and finds named groups, skipping escapes and classes. */
function scanGroups(src: string): { count: number; named: boolean } {
	let count = 0;
	let named = false;
	let inClass = false;
	for (let i = 0; i < src.length; i++) {
		const c = src.charAt(i);
		if (c === '\\') {
			i++;
			continue;
		}
		if (inClass) {
			if (c === ']') inClass = false;
			continue;
		}
		if (c === '[') inClass = true;
		else if (c === '(') {
			if (src.charAt(i + 1) !== '?') count++;
			else if (
				src.charAt(i + 2) === '<' &&
				src.charAt(i + 3) !== '=' &&
				src.charAt(i + 3) !== '!'
			) {
				count++;
				named = true;
			}
		}
	}
	return { count, named };
}
