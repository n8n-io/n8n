/**
 * A small code tree for generated values, and a printer that wraps long
 * object and array literals. The converter builds parameter values as trees,
 * so the printer can lay them out like hand-written code.
 */

export type Code =
	| { kind: 'raw'; text: string }
	| { kind: 'object'; entries: Array<[string, Code]> }
	| { kind: 'array'; items: Code[] };

export const raw = (text: string): Code => ({ kind: 'raw', text });

/** Code without the markers that the driver puts around translated expressions. */
export function unmarked(code: string): string {
	let out = '';
	for (let k = 0; k < code.length; k++) {
		const c = code.charCodeAt(k);
		if (c === 1) {
			k = code.indexOf('\u0002', k);
			continue;
		}
		if (c !== 3) out += code.charAt(k);
	}
	return out;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** A string literal in single quotes. */
export function str(text: string): string {
	return `'${escapeControls(
		text
			.replace(/\\/g, '\\\\')
			.replace(/'/g, "\\'")
			.replace(/\n/g, '\\n')
			.replace(/\r/g, '\\r')
			.replace(/\t/g, '\\t')
			.replace(/\u2028/g, '\\u2028')
			.replace(/\u2029/g, '\\u2029'),
	)}'`;
}

/** True for a control character that has no short escape (U+0000 to U+001F but tab and line ends, U+007F). */
function isControl(code: number): boolean {
	return (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f;
}

/**
 * Writes control characters as `\\uXXXX`, or as `replacement` (for a comment). The generator marks
 * translated code with U+0001 to U+0003, so user text must not hold them as they are.
 */
export function escapeControls(text: string, replacement?: string): string {
	let out = '';
	for (const ch of text) {
		const code = ch.charCodeAt(0);
		out += isControl(code) ? (replacement ?? `\\u${code.toString(16).padStart(4, '0')}`) : ch;
	}
	return out;
}

export function propertyKey(key: string): string {
	return IDENTIFIER.test(key) ? key : str(key);
}

/** Code of a plain JSON value. */
export function literal(value: unknown): Code {
	if (value === undefined) return raw('undefined');
	if (value === null) return raw('null');
	if (typeof value === 'string') return raw(str(value));
	if (typeof value === 'number') {
		if (Number.isNaN(value)) return raw('NaN');
		return raw(Object.is(value, -0) ? '-0' : String(value));
	}
	if (typeof value === 'boolean') return raw(String(value));
	if (Array.isArray(value)) return { kind: 'array', items: value.map(literal) };
	if (typeof value === 'object') {
		return {
			kind: 'object',
			entries: Object.entries(value).map(([k, v]): [string, Code] => [k, literal(v)]),
		};
	}
	return raw('undefined');
}

/** An object entry with this key prints as a spread of its value. */
export const SPREAD = '...';

function entry(key: string, value: string): string {
	return key === SPREAD ? `...${value}` : `${propertyKey(key)}: ${value}`;
}

function flat(code: Code): string {
	switch (code.kind) {
		case 'raw':
			return code.text;
		case 'array':
			return `[${code.items.map(flat).join(', ')}]`;
		case 'object':
			return code.entries.length === 0
				? '{}'
				: `{ ${code.entries.map(([k, v]) => entry(k, flat(v))).join(', ')} }`;
	}
}

/**
 * Prints a code tree. `indent` is the indentation (tabs) of the line where the
 * code starts; `column` is where the code starts on that line, with a tab as
 * four columns.
 */
export function print(code: Code, indent: string, column = indent.length * 4, width = 100): string {
	const one = flat(code);
	if (code.kind === 'raw' || column + one.length <= width) return one;
	const inner = `${indent}\t`;
	if (code.kind === 'array') {
		if (code.items.length === 0) return '[]';
		const lines = code.items.map((item) => `${inner}${print(item, inner)},`);
		return `[\n${lines.join('\n')}\n${indent}]`;
	}
	if (code.entries.length === 0) return '{}';
	const lines = code.entries.map(([k, v]) => {
		if (k === SPREAD) return `${inner}...${print(v, inner)},`;
		const key = `${propertyKey(k)}: `;
		return `${inner}${key}${print(v, inner, inner.length * 4 + key.length)},`;
	});
	return `{\n${lines.join('\n')}\n${indent}}`;
}

/** Collects lines of generated code with indentation. */
export class Writer {
	private readonly lines: string[] = [];

	/** Current indentation in tabs. */
	depth = 0;

	get indent(): string {
		return '\t'.repeat(this.depth);
	}

	line(text = ''): void {
		if (text === '') {
			this.lines.push('');
			return;
		}
		for (const l of text.split('\n')) this.lines.push(l === '' ? '' : `${this.indent}${l}`);
	}

	/** Adds a line that may already hold nested lines with their own indentation. */
	block(text: string): void {
		const [first, ...rest] = text.split('\n');
		this.lines.push(`${this.indent}${first}`);
		for (const l of rest) this.lines.push(l);
	}

	open(text: string): void {
		this.line(text);
		this.depth++;
	}

	close(text = '}'): void {
		this.depth--;
		this.line(text);
	}

	comment(text: string): void {
		// Every line terminator of JavaScript ends a line comment, also \u2028 and \u2029.
		for (const l of text.split(/\r\n|[\n\r\u2028\u2029]/)) {
			this.line(`// ${escapeControls(l, ' ')}`.trimEnd());
		}
	}

	toString(): string {
		return this.lines.join('\n');
	}

	get length(): number {
		return this.lines.length;
	}

	/** Takes out the lines from line `from` on and returns them. */
	splice(from: number): string[] {
		return this.lines.splice(from);
	}

	/** Adds lines as they are. */
	append(lines: string[]): void {
		for (const l of lines) this.lines.push(l);
	}

	/** Drops the lines after line `count` and restores the indentation. */
	truncate(count: number, depth: number): void {
		this.lines.length = count;
		this.depth = depth;
	}
}
