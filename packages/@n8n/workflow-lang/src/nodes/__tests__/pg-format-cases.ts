/**
 * A seeded generator of calls for the pg-promise formatter (`pg-format.test.ts`).
 * The same seed gives the same case, with new objects each time: pg-promise
 * changes the options object of a query, so each side gets its own copy.
 */

export type FormatFunction =
	| 'format'
	| 'concat'
	| 'name'
	| 'alias'
	| 'json'
	| 'value'
	| 'csv'
	| 'array'
	| 'text';

export interface FormatCase {
	fn: FormatFunction;
	/** The query, or the only value of the call. */
	a: unknown;
	/** The values of `format`. */
	b: unknown;
	/** `partial` of `format`, `raw` of `json` and `text`. */
	flag: boolean;
	/** The formatter can send this case to the fallback host. */
	hostAllowed: boolean;
	/** The case has a key `__proto__`, which the test node cannot rebuild from its coded form. */
	protoKey: boolean;
}

/** mulberry32. */
export function prng(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const MODIFIERS = ['^', '~', '#', ':raw', ':alias', ':name', ':json', ':csv', ':list', ':value'];
const NEAR_MODIFIERS = [
	':ra',
	':names',
	'::text',
	':RAW',
	':',
	':csvx',
	'^^',
	'~#',
	':value:raw',
	'',
];

const TEXT_PARTS = [
	"'",
	"''",
	'\\',
	"\\'",
	'"',
	'""',
	'$',
	'$$',
	'$1',
	'$2:raw',
	'$tag$',
	'--',
	'/*',
	'*/',
	';',
	' ',
	'\n',
	'\t',
	'\r\n',
	'\0',
	'\ud800',
	'\udc00',
	'😀',
	'é',
	' ',
	' ',
	'﻿',
	' ',
	'　',
	' ',
	'​',
	'\u0085',
	'*',
	'.',
	'a',
	'B',
	'_',
	'x1',
	'A_b',
	'user',
	'name$',
	'123#bigint',
	'-5#bigint',
	'"7#bigint"',
	'#bigint"',
	"E'",
	'{}',
	'[]',
	'null',
	'true',
	'0',
	'42',
	'); DROP TABLE t; --',
	"' OR '1'='1",
	'\u0001',
	'\u007f',
	'日本',
];

const KEYS = [
	'a',
	'b',
	'id',
	'toPostgres',
	'rawType',
	'toJSON',
	'__proto__',
	'constructor',
	'length',
	'0',
	'10',
	'2',
	'a b',
	'"',
	"'",
	'',
	'12#bigint',
	'this',
	'query',
	'é',
	'*',
	'a.b',
	'\ud800',
];

const NUMBERS = [
	0,
	-0,
	1,
	-1,
	0.1,
	-0.5,
	1e21,
	-1e21,
	1e-7,
	0.000001,
	5e-324,
	1.7976931348623157e308,
	-1.7976931348623157e308,
	2 ** 53,
	-(2 ** 53),
	2 ** 53 + 2,
	123456789012345680000,
	0.1 + 0.2,
	4294967296,
	-2147483648,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
];

const SQL_PARTS = [
	'SELECT ',
	' FROM t WHERE a = ',
	'INSERT INTO t VALUES (',
	')',
	', ',
	' AND ',
	'::int',
	' ',
	';',
	'; ',
	'\n',
	'interval ',
	'${a}',
	'$(b)',
	'$[c:raw]',
	'$<d>',
	'$/e/',
	'$',
	'$$',
	'$0',
	'$01',
	'$ 1',
];

class Generator {
	hostAllowed = false;

	protoKey = false;

	private readonly random: () => number;

	constructor(random: () => number) {
		this.random = random;
	}

	int(below: number): number {
		return Math.floor(this.random() * below);
	}

	chance(p: number): boolean {
		return this.random() < p;
	}

	pick<T>(list: readonly T[]): T {
		return list[this.int(list.length)];
	}

	text(): string {
		const kind = this.int(20);
		if (kind === 0) return '';
		if (kind === 1) {
			// Very long text with quotes inside.
			const unit = this.pick(["a'b", 'x', "''", '\\', '$1', 'é"']);
			return unit.repeat(2000 + this.int(30000));
		}
		if (kind === 2) return this.pick(TEXT_PARTS);
		if (kind === 3)
			return `${' '.repeat(this.int(3))}*${this.pick(['', ' ', '\n\t', ' ', '*', 'a'])}`;
		if (kind === 4)
			return [this.name(), this.name(), this.name()].slice(0, 1 + this.int(3)).join('.');
		let out = '';
		const count = 1 + this.int(8);
		for (let i = 0; i < count; i++) {
			out += this.chance(0.2) ? String.fromCharCode(this.int(0x10000)) : this.pick(TEXT_PARTS);
		}
		return out;
	}

	name(): string {
		return this.pick([
			'a',
			'A',
			'a_b1',
			'AB_C$',
			'aB',
			'1a',
			'_',
			'$a',
			'my col',
			'q"x',
			'',
			'*',
			'é',
		]);
	}

	number(): number {
		const kind = this.int(4);
		if (kind === 0) return this.pick(NUMBERS);
		if (kind === 1) return this.int(2000) - 1000;
		if (kind === 2) return (this.random() - 0.5) * 10 ** (this.int(60) - 30);
		const view = new DataView(new ArrayBuffer(8));
		view.setUint32(0, this.int(4294967296));
		view.setUint32(4, this.int(4294967296));
		return view.getFloat64(0);
	}

	object(depth: number): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		const count = this.int(4);
		for (let i = 0; i < count; i++) {
			const key = this.chance(0.15) ? this.text().slice(0, 20) : this.pick(KEYS);
			if (key === '__proto__') this.protoKey = true;
			Object.defineProperty(out, key, {
				value: this.value(depth + 1),
				enumerable: true,
				writable: true,
				configurable: true,
			});
		}
		return out;
	}

	array(depth: number): unknown[] {
		const out: unknown[] = [];
		const count = this.int(4);
		for (let i = 0; i < count; i++) out.push(this.value(depth + 1));
		return out;
	}

	value(depth: number): unknown {
		const kind = this.int(depth > 3 ? 9 : 13);
		if (kind === 0) return null;
		if (kind === 1) return undefined;
		if (kind === 2) return this.chance(0.5);
		if (kind <= 4) return this.number();
		if (kind <= 8) return this.text();
		if (kind <= 10) return this.array(depth);
		return this.object(depth);
	}

	/** A value that fits the filter, most of the time. */
	valueFor(modifier: string): unknown {
		if (this.chance(0.3)) return this.value(0);
		if (modifier === ':name' || modifier === '~' || modifier === ':alias') {
			const kind = this.int(4);
			if (kind === 0) return this.name();
			if (kind === 1) return this.text();
			if (kind === 2) return [this.name(), this.name()].slice(0, this.int(3));
			return this.object(3);
		}
		if (modifier === ':csv' || modifier === ':list') {
			return this.chance(0.5) ? this.array(1) : this.object(1);
		}
		return this.value(0);
	}

	deepArray(levels: number): unknown[] {
		let out: unknown[] = [this.pick([1, 'a', null])];
		for (let i = 1; i < levels; i++) out = [out];
		return out;
	}

	variable(count: number): { text: string; modifier: string } {
		const kind = this.int(30);
		let index = String(1 + this.int(count + 2));
		if (kind === 0) index = '0';
		else if (kind === 1) index = `0${index}`;
		else if (kind === 2) index = this.pick(['99999', '100000', '100001', '999999']);
		else if (kind === 3) index = '1'.repeat(17);
		else if (kind === 4) index = '1'.repeat(18);
		else if (kind === 5) index = '9'.repeat(30);
		else if (kind === 6) index = `${index}0`;
		const mark = this.int(10);
		const modifier = mark < 5 ? '' : mark < 9 ? this.pick(MODIFIERS) : this.pick(NEAR_MODIFIERS);
		return { text: `$${index}${modifier}`, modifier };
	}

	wrapped(variable: string): string {
		const kind = this.int(16);
		if (kind === 0) return `'${variable}'`;
		if (kind === 1) return `"${variable}"`;
		if (kind === 2) return `$$ ${variable} $$`;
		if (kind === 3) return `$tag$${variable}$tag$`;
		if (kind === 4) return `-- ${variable}\n`;
		if (kind === 5) return `/* ${variable} */`;
		if (kind === 6) return `E'\\${variable}'`;
		if (kind === 7) return `${variable}${variable}`;
		if (kind === 8) return `${variable}${this.int(10)}`;
		return variable;
	}

	/** A query and values for its variables. */
	query(): { query: string; values: unknown } {
		const count = this.int(5);
		const values: unknown[] = [];
		for (let i = 0; i < count; i++) values.push(this.value(0));
		let query = '';
		const parts = this.int(9);
		for (let i = 0; i < parts; i++) {
			const kind = this.int(10);
			if (kind < 5) {
				const variable = this.variable(count);
				const index = Number(variable.text.slice(1, 3).replace(/\D/g, '')) - 1;
				if (variable.modifier !== '' && index >= 0 && index < count && this.chance(0.8)) {
					values[index] = this.valueFor(variable.modifier);
				}
				query += this.wrapped(variable.text);
			} else if (kind < 8) query += this.pick(SQL_PARTS);
			else query += this.text().slice(0, 200);
		}
		const shape = this.int(40);
		if (shape === 0) return { query, values: undefined };
		if (shape <= 3)
			return { query, values: this.pick([null, true, false, 0, -3, 1.5, Number.NaN]) };
		if (shape <= 6) return { query, values: this.text() };
		if (shape === 7) {
			this.hostAllowed = true;
			return { query, values: this.object(0) };
		}
		if (shape === 8) {
			this.hostAllowed = true;
			return { query, values: [this.deepArray(60 + this.int(10))] };
		}
		return { query, values };
	}

	concatEntry(): unknown {
		const kind = this.int(14);
		const pad = () => this.pick(['', ' ', ';', ' ; ', '\n', ';;', ' ', '﻿;', '​']);
		if (kind === 0) return this.pick([null, 5, [], true, {}, { values: [1] }]);
		if (kind <= 3) return `${pad()}${this.pick(SQL_PARTS)}${this.text().slice(0, 40)}${pad()}`;
		if (kind === 4) return pad();
		const formatted = this.query();
		const query = `${pad()}${formatted.query}${pad()}`;
		if (kind === 5) return { query, values: formatted.values };
		if (kind === 6) {
			this.hostAllowed = true;
			return {
				query,
				values: formatted.values,
				options: this.pick<unknown>([{ def: 1 }, { capSQL: true }, 'x', { partial: 1 }]),
			};
		}
		if (kind === 7) return { query: this.pick<unknown>([5, null, undefined, {}]), values: [] };
		if (kind === 8) return { query, values: formatted.values, options: { partial: false } };
		if (kind === 9) return { query, values: formatted.values, options: this.pick([{}, null]) };
		return { query, values: formatted.values, options: { partial: true } };
	}
}

export function formatCase(seed: number): FormatCase {
	const g = new Generator(prng(seed));
	const kind = g.int(20);
	let fn: FormatFunction = 'format';
	let a: unknown;
	let b: unknown;
	let flag = g.chance(0.5);
	if (kind < 10) {
		const formatted = g.query();
		a = g.chance(0.01) ? g.pick<unknown>([5, null, undefined, {}]) : formatted.query;
		b = formatted.values;
	} else if (kind < 13) {
		fn = 'concat';
		const entries: unknown[] = [];
		const count = g.int(5);
		for (let i = 0; i < count; i++) entries.push(g.concatEntry());
		a = g.chance(0.02) ? g.pick<unknown>(['SELECT 1', null, {}]) : entries;
	} else if (kind < 15) {
		fn = 'name';
		a = g.valueFor(':name');
	} else if (kind === 15) {
		fn = 'alias';
		a = g.valueFor(':alias');
	} else if (kind === 16) {
		fn = 'json';
		a = g.value(0);
	} else if (kind === 17) {
		fn = g.chance(0.5) ? 'value' : 'csv';
		a = fn === 'csv' ? g.valueFor(':csv') : g.value(0);
	} else if (kind === 18) {
		fn = 'array';
		a = g.pick<unknown>([g.array(0), g.array(0), null, undefined, g.value(0), g.deepArray(70)]);
		g.hostAllowed = true;
	} else {
		fn = 'text';
		a = g.pick<unknown>([g.text(), g.text(), null, undefined, g.value(0)]);
		g.hostAllowed = true;
	}
	if (fn !== 'format' && fn !== 'json' && fn !== 'text') flag = false;
	return { fn, a, b, flag, hostAllowed: g.hostAllowed, protoKey: g.protoKey };
}

const SOUP = '$$$$0123456789:^~#rawnmeliscvutjo\'"-/*; \n\\';

/** A query that is noise over the characters of variables and filters, with values. */
export function soupCase(seed: number): FormatCase {
	const g = new Generator(prng(seed));
	let query = '';
	const length = g.int(60);
	for (let i = 0; i < length; i++) {
		query += g.chance(0.15) ? g.pick(MODIFIERS) : SOUP[g.int(SOUP.length)];
	}
	const values: unknown[] = [];
	const count = g.int(12);
	for (let i = 0; i < count; i++) values.push(g.value(1));
	const single = g.chance(0.1);
	return {
		fn: 'format',
		a: query,
		b: single ? g.pick<unknown>([g.text(), 7, null, false]) : values,
		flag: g.chance(0.5),
		hostAllowed: false,
		protoKey: g.protoKey,
	};
}

const MARK = '$pgf';

/**
 * The JSON form of a value for the fixture of the test node: undefined, NaN,
 * the infinities and -0 become `{ $pgf: name }`.
 */
export function encode(value: unknown): unknown {
	if (value === undefined) return { [MARK]: 'undefined' };
	if (typeof value === 'number') {
		if (Number.isNaN(value)) return { [MARK]: 'nan' };
		if (value === Number.POSITIVE_INFINITY) return { [MARK]: 'inf' };
		if (value === Number.NEGATIVE_INFINITY) return { [MARK]: '-inf' };
		if (Object.is(value, -0)) return { [MARK]: '-0' };
		return value;
	}
	if (Array.isArray(value)) return value.map(encode);
	if (typeof value === 'object' && value !== null) {
		const out: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value)) {
			Object.defineProperty(out, key, {
				value: encode(entry),
				enumerable: true,
				writable: true,
				configurable: true,
			});
		}
		return out;
	}
	return value;
}
