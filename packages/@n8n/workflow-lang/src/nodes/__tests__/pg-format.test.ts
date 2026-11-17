/**
 * Proof that `src/nodes/shared/pg-format.ts` gives the text of pg-promise.
 *
 * 1. A differential test against the real pg-promise (the version that the v1
 *    Postgres node uses) on generated calls: the text or the error message
 *    must be equal. A call that the formatter sends to the fallback host
 *    (`(limit: sql-host)`) is counted, and only a case that the generator
 *    marks can go there.
 * 2. The same code compiled to bytecode, in a test node, gives the same
 *    result as the source form for a sample of the calls.
 * 3. A fuzz run on noise queries, and properties with an oracle that is not
 *    pg-promise.
 *
 * Larger runs: `PG_FORMAT_CASES`, `PG_FORMAT_VM_CASES`, `PG_FORMAT_FUZZ_CASES`
 * and `PG_FORMAT_FUZZ_SEED`.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runModule } from '../../testing/vm.ts';
import {
	pgAlias,
	pgArray,
	pgConcat,
	pgCsv,
	pgFormat,
	pgJson,
	pgName,
	pgText,
	pgValue,
} from '../shared/pg-format.ts';
import type { FormatCase } from './pg-format-cases.ts';
import { encode, formatCase, prng, soupCase } from './pg-format-cases.ts';

interface PgFormatting {
	format(query: unknown, values?: unknown, options?: unknown): string;
	name(name: unknown): string;
	alias(name: unknown): string;
	json(data: unknown, raw?: boolean): string;
	value(value: unknown): string;
	csv(values: unknown): string;
	array(list: unknown): string;
	text(value: unknown, raw?: boolean): string;
}

interface PgPromiseMain {
	(): { helpers: { concat(queries: unknown): string } };
	as: PgFormatting;
}

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '..', '..', '..', '..', '..', 'nodes-base', 'package.json');
// The pg-promise of the v1 Postgres node.
const pgPromise: PgPromiseMain = createRequire(nodesBase)('pg-promise');
const as = pgPromise.as;
const helpers = pgPromise().helpers;

const CASES = Number(process.env.PG_FORMAT_CASES ?? 60000);
const VM_CASES = Number(process.env.PG_FORMAT_VM_CASES ?? 6000);
const FUZZ_CASES = Number(process.env.PG_FORMAT_FUZZ_CASES ?? 30000);
const FUZZ_SEED = Number(process.env.PG_FORMAT_FUZZ_SEED ?? 20261117);
const HOST = '(limit: sql-host)';

type Outcome = { text: string } | { error: string };

function outcome(run: () => string): Outcome {
	try {
		return { text: run() };
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
}

function theirs(c: FormatCase): Outcome {
	return outcome(() => {
		if (c.fn === 'format') return as.format(c.a, c.b, c.flag ? { partial: true } : undefined);
		if (c.fn === 'concat') return helpers.concat(c.a);
		if (c.fn === 'name') return as.name(c.a);
		if (c.fn === 'alias') return as.alias(c.a);
		if (c.fn === 'json') return as.json(c.a, c.flag);
		if (c.fn === 'value') return as.value(c.a);
		if (c.fn === 'csv') return as.csv(c.a);
		if (c.fn === 'array') return as.array(c.a);
		return as.text(c.a, c.flag);
	});
}

function mine(c: FormatCase): Outcome {
	return outcome(() => {
		if (c.fn === 'format') return pgFormat(c.a, c.b, c.flag);
		if (c.fn === 'concat') return pgConcat(c.a);
		if (c.fn === 'name') return pgName(c.a);
		if (c.fn === 'alias') return pgAlias(c.a);
		if (c.fn === 'json') return pgJson(c.a, c.flag);
		if (c.fn === 'value') return pgValue(c.a);
		if (c.fn === 'csv') return pgCsv(c.a);
		if (c.fn === 'array') return pgArray(c.a);
		return pgText(c.a, c.flag);
	});
}

function isHost(result: Outcome): boolean {
	return 'error' in result && result.error.endsWith(HOST);
}

interface Tally {
	cases: number;
	texts: number;
	errors: number;
	host: number;
	hostReasons: Record<string, number>;
	failures: string[];
}

function emptyTally(): Tally {
	return { cases: 0, texts: 0, errors: 0, host: 0, hostReasons: {}, failures: [] };
}

/** Compares one generated case with pg-promise. The generator runs twice: each side gets its own objects. */
function compare(tally: Tally, make: (seed: number) => FormatCase, seed: number): void {
	const expected = theirs(make(seed));
	const c = make(seed);
	const actual = mine(c);
	tally.cases++;
	if ('error' in actual && isHost(actual)) {
		tally.host++;
		tally.hostReasons[actual.error] = (tally.hostReasons[actual.error] ?? 0) + 1;
		if (!c.hostAllowed && tally.failures.length < 5) {
			tally.failures.push(`seed ${seed}: ${c.fn} went to the host: ${actual.error}`);
		}
		return;
	}
	if ('text' in actual) tally.texts++;
	else tally.errors++;
	if (JSON.stringify(actual) !== JSON.stringify(expected) && tally.failures.length < 5) {
		tally.failures.push(
			`seed ${seed}: ${c.fn} gave ${JSON.stringify(actual).slice(0, 300)}, pg-promise gave ${JSON.stringify(expected).slice(0, 300)}`,
		);
	}
}

function report(label: string, tally: Tally): void {
	console.log(
		`${label}: ${tally.cases} cases; ${tally.texts} equal texts; ${tally.errors} equal errors; ${tally.host} to the host ${JSON.stringify(tally.hostReasons)}`,
	);
}

const workflow = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'x', method: 'POST' })],
	async run(ctx, trigger) {
		return await ctx.node({ name: 'Node', type: 'test.pgFormat', typeVersion: 1, parameters: { cases: trigger.body.cases } });
	},
});
`;

/** The formatter as a node holds it: the text between the markers, without `export`. */
function formatterSource(): string {
	const text = readFileSync(join(here, '..', 'shared', 'pg-format.ts'), 'utf8');
	const begin = text.indexOf('// pg-format:begin');
	const end = text.indexOf('// pg-format:end');
	if (begin < 0 || end < 0) throw new Error('pg-format.ts has no markers');
	return text.slice(begin, end).replace(/^export /gm, '');
}

const testNode = `import { defineNode } from '@n8n/workflow-lang';

${formatterSource()}

function decode(value: any): any {
	if (Array.isArray(value)) {
		const list: any[] = [];
		for (const entry of value) list.push(decode(entry));
		return list;
	}
	if (typeof value === 'object' && value !== null) {
		const mark = value['$pgf'];
		if (mark === 'undefined') return undefined;
		if (mark === 'nan') return 0 / 0;
		if (mark === 'inf') return 1 / 0;
		if (mark === '-inf') return -1 / 0;
		if (mark === '-0') return -0;
		const out: any = {};
		for (const key of Object.keys(value)) out[key] = decode(value[key]);
		return out;
	}
	return value;
}

function call(c: any): string {
	const a = c.coded ? decode(c.a) : c.a;
	const b = c.coded ? decode(c.b) : c.b;
	if (c.fn === 'format') return pgFormat(a, b, c.flag);
	if (c.fn === 'concat') return pgConcat(a);
	if (c.fn === 'name') return pgName(a);
	if (c.fn === 'alias') return pgAlias(a);
	if (c.fn === 'json') return pgJson(a, c.flag);
	if (c.fn === 'value') return pgValue(a);
	if (c.fn === 'csv') return pgCsv(a);
	if (c.fn === 'array') return pgArray(a);
	return pgText(a, c.flag);
}

export default defineNode<any>({
	type: 'test.pgFormat',
	version: 1,
	async run(ctx, parameters, items, credential) {
		const out: any[] = [];
		for (const c of parameters.cases) {
			try {
				out.push({ text: call(c) });
			} catch (error: any) {
				out.push({ error: error.message });
			}
		}
		return out;
	},
});
`;

interface VmCase {
	fn: string;
	a: unknown;
	b: unknown;
	flag: boolean;
	coded: boolean;
}

/** The case for the fixture. A case without undefined, NaN, an infinity or -0 goes as it is. */
function vmCase(c: FormatCase): VmCase {
	const codedA = encode(c.a);
	const codedB = encode(c.b);
	// The coded form has a mark for each value that JSON cannot hold.
	const coded = JSON.stringify([codedA, codedB]).includes('"$pgf"');
	return {
		fn: c.fn,
		a: coded ? codedA : c.a,
		b: coded ? codedB : c.b,
		flag: c.flag,
		coded,
	};
}

describe('the pg-promise formatter', () => {
	it('gives the forms that the v1 Postgres node uses', () => {
		const item = { id: 7, name: "O'Neil", tags: ['a', 'b'], meta: { a: 1 }, gone: null };
		expect(
			pgFormat(
				'INSERT INTO $1:name.$2:name($3:name) VALUES($3:csv)',
				['public', 'my "t"', item],
				false,
			),
		).toBe(
			`INSERT INTO "public"."my ""t"""("id","name","tags","meta","gone") VALUES(7,'O''Neil',array['a','b'],'{"a":1}',null)`,
		);
		expect(pgFormat('SELECT $3:name FROM $1:name.$2:name', ['s', 't', ['a', 'b']], false)).toBe(
			'SELECT "a","b" FROM "s"."t"',
		);
		expect(pgFormat('SELECT $3:name FROM $1:name.$2:name', ['s', 't', '*'], false)).toBe(
			'SELECT * FROM "s"."t"',
		);
		expect(pgFormat("SELECT '$1', $2, $1:raw, $3", ['a\\', -1], true)).toBe(
			"SELECT ''a\\'', (-1), a\\, $3",
		);
		expect(() => pgFormat('SELECT $2', [1], false)).toThrow(
			'Variable $2 out of range. Parameters array length: 1',
		);
		expect(pgJson({ a: "'" }, true)).toBe('{"a":"\'"}');
		expect(
			pgConcat([
				{ query: ' SELECT $1; ', values: [1], options: { partial: true } },
				' ;; ',
				{ query: 'SELECT $1, $2', values: ['x'], options: { partial: true } },
			]),
		).toBe("SELECT 1;SELECT 'x', $2");
	});

	it('does not read the text of a value again', () => {
		expect(pgFormat('$1 $2', ['$2', '$1:raw'], false)).toBe("'$2' '$1:raw'");
		expect(pgFormat('$1:raw $2', ['$2', 'x'], false)).toBe("$2 'x'");
	});

	it('sends what it cannot prove to the fallback host', () => {
		expect(() => pgFormat('SELECT ${a}', { a: 1 }, false)).toThrow(HOST);
		expect(() => pgFormat('SELECT $1', [new Date(0)], false)).toThrow(HOST);
		expect(() => pgJson(new Date(0), false)).toThrow(HOST);
		expect(() => pgConcat([{ query: 'SELECT 1', options: { def: 1 } }])).toThrow(HOST);
	});

	it(`gives the text or the error of pg-promise for ${CASES} generated calls`, () => {
		const tally = emptyTally();
		for (let seed = 1; seed <= CASES; seed++) compare(tally, formatCase, seed);
		report('differential', tally);
		expect(tally.failures).toEqual([]);
		expect(tally.texts).toBeGreaterThan(tally.cases / 3);
		expect(tally.errors).toBeGreaterThan(tally.cases / 50);
		expect(tally.host).toBeLessThan(tally.cases / 8);
	}, 600_000);

	it(`gives the text or the error of pg-promise for ${FUZZ_CASES} noise queries from seed ${FUZZ_SEED}`, () => {
		const tally = emptyTally();
		for (let i = 0; i < FUZZ_CASES; i++) {
			compare(tally, soupCase, FUZZ_SEED + i);
			compare(tally, formatCase, FUZZ_SEED + CASES + i);
		}
		report('fuzz', tally);
		expect(tally.failures).toEqual([]);
	}, 600_000);

	it('writes a string as one literal and a name as one identifier, for any text', () => {
		const random = prng(FUZZ_SEED);
		const alphabet = [
			"'",
			"''",
			'\\',
			'"',
			'$',
			'$1',
			';',
			'--',
			'/*',
			'\0',
			'\n',
			'a',
			'é',
			'\ud800',
		];
		// The end of a quoted token for a server with standard_conforming_strings on.
		const tokenEnd = (text: string, quote: string): number => {
			if (text[0] !== quote) return -1;
			let i = 1;
			while (i < text.length) {
				if (text[i] !== quote) i++;
				else if (text[i + 1] === quote) i += 2;
				else return i + 1;
			}
			return -1;
		};
		for (let n = 0; n < FUZZ_CASES; n++) {
			let value = '';
			const count = Math.floor(random() * 12);
			for (let i = 0; i < count; i++) {
				value += alphabet[Math.floor(random() * alphabet.length)];
			}
			const literal = pgFormat('$1', [value], false);
			expect(literal).toBe(`'${value.split("'").join("''")}'`);
			expect(tokenEnd(literal, "'")).toBe(literal.length);
			expect(pgFormat('a = $1 AND b', value, false)).toBe(`a = ${literal} AND b`);
			const name = `x${value}`;
			const identifier = pgFormat('$1:name', [name], false);
			expect(identifier).toBe(`"${name.split('"').join('""')}"`);
			expect(tokenEnd(identifier, '"')).toBe(identifier.length);
		}
	}, 600_000);

	it(`gives the same result as bytecode for ${VM_CASES} of the calls`, () => {
		const compiled = compile(workflow, { nodes: { 'nodes/pg-format-test.ts': testNode } });
		expect(compiled.diagnostics).toEqual([]);
		const module = decodeModule(compiled.module ?? new Uint8Array());
		const failures: string[] = [];
		let ran = 0;
		let skipped = 0;
		let host = 0;
		const batch = 200;
		const make = (seed: number) => (seed % 10 === 0 ? soupCase(seed) : formatCase(seed));
		for (let first = 1; first <= VM_CASES; first += batch) {
			const seeds: number[] = [];
			const cases: VmCase[] = [];
			for (let seed = first; seed < first + batch && seed <= VM_CASES; seed++) {
				const c = make(seed);
				const sent = vmCase(c);
				// The test node cannot rebuild a key `__proto__` of a coded case.
				if (sent.coded && c.protoKey) {
					skipped++;
					continue;
				}
				seeds.push(seed);
				cases.push(sent);
			}
			const fixture = { trigger: { body: { cases } }, now: 1000, seed: 7, effects: {} };
			const output = runModule(module, fixture, { fuel: 2_000_000_000 });
			expect(output.status).toBe('ok');
			const results: unknown[] = Array.isArray(output.result) ? output.result : [];
			expect(results.length).toBe(cases.length);
			for (let i = 0; i < cases.length; i++) {
				const expected = mine(make(seeds[i]));
				ran++;
				if (isHost(expected)) host++;
				if (JSON.stringify(results[i]) !== JSON.stringify(expected) && failures.length < 5) {
					failures.push(
						`seed ${seeds[i]}: bytecode gave ${JSON.stringify(results[i]).slice(0, 300)}, the source gave ${JSON.stringify(expected).slice(0, 300)}`,
					);
				}
			}
		}
		console.log(
			`bytecode: ${ran} cases equal to the source form (${host} to the host); ${skipped} not run`,
		);
		expect(failures).toEqual([]);
		expect(ran).toBeGreaterThan(VM_CASES * 0.9);
	}, 600_000);
});
