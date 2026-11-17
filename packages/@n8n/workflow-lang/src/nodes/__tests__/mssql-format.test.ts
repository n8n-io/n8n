/**
 * Proof that `src/nodes/shared/mssql-format.ts` gives the statements of the v1 Microsoft SQL
 * node: a differential test on generated cases against the real code. The oracle is the
 * built v1 node (`GenericFunctions.js` of nodes-base) with a real `Request` of `mssql`
 * whose `query` records the text and the parameters and sends nothing. For each case, the
 * text, the names and the order of the parameters, and their values after `request.input`
 * must be equal, and the type that `mssql` takes from each value must be the type that the
 * runtime declares for it (`src/core/tdswire.zig`). An error of v1 must have the same
 * message. A case that the formatter sends to the fallback host (`(limit: sql-host)`) is
 * counted, and only a case that the generator marks can go there.
 *
 * Larger runs: `MSSQL_FORMAT_CASES` and `MSSQL_FORMAT_SEED`.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	msfBind,
	msfChunk,
	msfDelete,
	msfEscapeIdentifier,
	msfEscapeTableName,
	msfFormatColumns,
	msfInsert,
	msfInsideQuotes,
	msfUpdate,
	type MsfStatement,
} from '../shared/mssql-format.ts';
import { prng } from './pg-format-cases.ts';

interface Recorded {
	text: string;
	params: Array<{ name: string; value: unknown; type: string }>;
}

interface MssqlRequest {
	parameters: Record<string, { name: string; value: unknown; type: unknown }>;
	query: (text: string) => Promise<{ rowsAffected: number[] }>;
}

interface Mssql {
	Request: new () => MssqlRequest;
	NVarChar: unknown;
	Int: unknown;
	BigInt: unknown;
	Float: unknown;
	Bit: unknown;
}

interface V1 {
	bindQueryParameters(
		node: unknown,
		request: unknown,
		rawQuery: string,
		values?: unknown[],
	): string;
	insertOperation(tables: unknown, pool: unknown): Promise<unknown>;
	updateOperation(tables: unknown, pool: unknown): Promise<unknown>;
	deleteOperation(tables: unknown, pool: unknown): Promise<unknown>;
	escapeIdentifier(identifier: string): string;
	escapeTableName(table: string): string;
	formatColumns(columns: string): string;
	mssqlChunk(rows: Array<Record<string, unknown>>): Array<Array<Record<string, unknown>>>;
	copyInputItem(
		item: { json: Record<string, unknown> },
		properties: string[],
	): Record<string, unknown>;
}

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '..', '..', '..', '..', '..', 'nodes-base');
const v1File = join(nodesBase, 'dist', 'nodes', 'Microsoft', 'Sql', 'GenericFunctions.js');
const utilsFile = join(nodesBase, 'dist', 'utils', 'sql-query-parameters.js');
const available = existsSync(v1File) && existsSync(utilsFile);
const requireBase = createRequire(join(nodesBase, 'package.json'));

const CASES = Number(process.env.MSSQL_FORMAT_CASES ?? 4000);
const SEED = Number(process.env.MSSQL_FORMAT_SEED ?? 20261117);
const HOST = '(limit: sql-host)';

const TEXT_PARTS = [
	"'",
	"''",
	'"',
	'""',
	'$1',
	'$2',
	'$3',
	'$10',
	'$11',
	'$007',
	'$',
	'$$',
	'$1a',
	'$12345678901234567890123',
	' ',
	'select ',
	' from t where a = ',
	'@p1',
	'--',
	'/*',
	'\n',
	']',
	'[',
	'é',
	'😀',
	',',
	';',
];
const NAME_PARTS = [
	'a',
	'b',
	'id',
	' ',
	'[',
	']',
	'].[',
	'.',
	'dbo',
	"'",
	'"',
	',',
	'é',
	'name',
	'_',
];
const NATIVE_VALUES: unknown[] = [
	'',
	'text',
	"it's",
	'é😀',
	0,
	-0,
	1,
	-1,
	2147483647,
	2147483648,
	-2147483648,
	-2147483649,
	9007199254740991,
	-9223372036854775808,
	1.5,
	-0.1,
	1e-300,
	Infinity,
	-Infinity,
	true,
	false,
	null,
	undefined,
];
const HOST_VALUES: unknown[] = [
	NaN,
	9223372036854775808,
	1e30,
	1e300,
	-1e19,
	{},
	{ a: 1 },
	[],
	[1, 2],
	new Date(0),
	Buffer.from('ab'),
	10n,
];

type Random = () => number;

function pick<T>(random: Random, list: T[]): T {
	return list[Math.floor(random() * list.length)];
}

function textOf(random: Random, parts: string[], most: number): string {
	let out = '';
	const count = Math.floor(random() * most);
	for (let i = 0; i < count; i++) out += pick(random, parts);
	return out;
}

/** A value, and whether the formatter can send it to the fallback host. */
function valueOf(random: Random): { value: unknown; host: boolean } {
	if (random() < 0.08) return { value: pick(random, HOST_VALUES), host: true };
	if (random() < 0.2) return { value: Math.floor((random() - 0.5) * 1e6), host: false };
	if (random() < 0.2) return { value: textOf(random, TEXT_PARTS, 4), host: false };
	return { value: pick(random, NATIVE_VALUES), host: false };
}

function typeName(mssql: Mssql, type: unknown): string {
	if (type === mssql.NVarChar) return 'nvarchar';
	if (type === mssql.Int) return 'int';
	if (type === mssql.BigInt) return 'bigint';
	if (type === mssql.Float) return 'float';
	if (type === mssql.Bit) return 'bit';
	return 'other';
}

/** The type that the runtime declares for a bind value (`declaration` of `tdswire.zig`). */
function runtimeType(value: unknown): string {
	if (value === null || typeof value === 'string') return 'nvarchar';
	if (typeof value === 'boolean') return 'bit';
	if (typeof value !== 'number') return 'other';
	if (!Number.isInteger(value)) return 'float';
	return value >= -2147483648 && value <= 2147483647 ? 'int' : 'bigint';
}

interface Oracle {
	v1: V1;
	mssql: Mssql;
	sent: Recorded[];
	request: () => MssqlRequest;
	pool: { request: () => MssqlRequest };
}

function oracle(): Oracle {
	const v1: V1 = requireBase(v1File);
	const mssql: Mssql = requireBase('mssql');
	const sent: Recorded[] = [];
	const request = (): MssqlRequest => {
		const made = new mssql.Request();
		made.query = async (text: string) => {
			sent.push({
				text,
				params: Object.values(made.parameters).map((p) => ({
					name: p.name,
					value: p.value,
					type: typeName(mssql, p.type),
				})),
			});
			return { rowsAffected: [0] };
		};
		return made;
	};
	return { v1, mssql, sent, request, pool: { request } };
}

type Outcome = { statements: MsfStatement[] } | { error: string };

function mine(run: () => MsfStatement[]): Outcome {
	try {
		return { statements: run() };
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
}

interface Tally {
	equal: number;
	host: number;
	errors: number;
}

function compare(
	label: string,
	got: Outcome,
	want: Recorded[] | { error: string },
	hostAllowed: boolean,
	tally: Tally,
): void {
	if ('error' in got && got.error.endsWith(HOST)) {
		if (!hostAllowed)
			throw new Error(`${label}: the formatter sends a native case to the host: ${got.error}`);
		tally.host += 1;
		return;
	}
	if ('error' in want) {
		if (!('error' in got))
			throw new Error(`${label}: v1 fails with "${want.error}", the formatter does not`);
		expect(got.error, label).toBe(want.error);
		tally.errors += 1;
		return;
	}
	if ('error' in got)
		throw new Error(`${label}: the formatter fails with "${got.error}", v1 does not`);
	expect(
		got.statements.map((s) => s.text),
		label,
	).toEqual(want.map((s) => s.text));
	for (let i = 0; i < want.length; i++) {
		const params = got.statements[i].params;
		expect(
			params.map((p) => p.name),
			label,
		).toEqual(want[i].params.map((p) => p.name));
		for (let k = 0; k < params.length; k++) {
			const theirs = want[i].params[k];
			if (!Object.is(params[k].value, theirs.value)) {
				throw new Error(`${label}: the value of ${theirs.name} differs`);
			}
			expect(runtimeType(params[k].value), `${label} ${theirs.name}`).toBe(theirs.type);
		}
	}
	tally.equal += 1;
}

describe.skipIf(!available)('the Microsoft SQL formatter', () => {
	it('gives the text and the bind values of bindQueryParameters of the v1 node', () => {
		const o = oracle();
		const random = prng(SEED);
		const tally: Tally = { equal: 0, host: 0, errors: 0 };
		for (let n = 0; n < CASES; n++) {
			const query = textOf(random, TEXT_PARTS, 9);
			const values: unknown[] = [];
			let host = false;
			const count = Math.floor(random() * 13);
			for (let i = 0; i < count; i++) {
				const made = valueOf(random);
				values.push(made.value);
				host = host || made.host;
			}
			o.sent.length = 0;
			let want: Recorded[] | { error: string };
			try {
				const request = o.request();
				const text = o.v1.bindQueryParameters({}, request, query, values);
				void request.query(text);
				want = [...o.sent];
			} catch (error) {
				want = { error: error instanceof Error ? error.message : String(error) };
			}
			compare(
				`bind #${n}`,
				mine(() => [msfBind(query, values)]),
				want,
				host,
				tally,
			);
		}
		expect(tally.equal).toBeGreaterThan(CASES / 4);
		expect(tally.errors).toBeGreaterThan(CASES / 20);
		expect(tally.host).toBeGreaterThan(0);
	}, 120_000);

	it('gives the statements of insert, update and delete of the v1 node, with its batching', async () => {
		const o = oracle();
		const random = prng(SEED + 1);
		const tally: Tally = { equal: 0, host: 0, errors: 0 };
		const cases = Math.max(200, Math.floor(CASES / 40));
		for (let n = 0; n < cases; n++) {
			const table = textOf(random, NAME_PARTS, 5);
			const columnCount = 1 + Math.floor(random() * 4);
			const names: string[] = [];
			for (let i = 0; i < columnCount; i++) names.push(textOf(random, NAME_PARTS, 3) || `c${i}`);
			const columnString = names.join(random() < 0.5 ? ',' : ' , ');
			const columns = columnString.split(',').map((c) => c.trim());
			// Most cases are small; some pass the limits of 2,100 values and 1,000 rows.
			const large = random() < 0.04;
			const rowCount = large ? 900 + Math.floor(random() * 1400) : Math.floor(random() * 5);
			let host = false;
			const items: Array<{ json: Record<string, unknown> }> = [];
			for (let r = 0; r < rowCount; r++) {
				const json: Record<string, unknown> = {};
				for (const column of columns) {
					if (random() < 0.1) continue;
					const made = large ? { value: r, host: false } : valueOf(random);
					json[column] = made.value;
					host = host || made.host;
				}
				items.push({ json });
			}
			const kind = pick(random, ['insert', 'update', 'delete']);
			o.sent.length = 0;
			let got: Outcome = { error: 'no result' };
			let want: Recorded[] | { error: string };
			try {
				if (kind === 'insert') {
					const rows = items.map((item) => o.v1.copyInputItem(item, columns));
					got = mine(() => msfInsert(table, columnString, rows));
					await o.v1.insertOperation({ [table]: { [columnString]: rows } }, o.pool);
				} else if (kind === 'update') {
					const updateKey = pick(random, columns.concat(['id', 'updateKey']));
					const rows = items.map((item) => {
						const row = o.v1.copyInputItem(item, columns.concat(['updateKey', updateKey]));
						row.updateKey = updateKey;
						return row;
					});
					got = mine(() => rows.map((row) => msfUpdate(table, columnString, row)));
					await o.v1.updateOperation({ [table]: { [columnString]: rows } }, o.pool);
				} else {
					const deleteKey = pick(random, columns);
					const keys = items.map((item) => o.v1.copyInputItem(item, [deleteKey])[deleteKey]);
					got = mine(() => msfDelete(table, deleteKey, keys));
					await o.v1.deleteOperation({ [table]: { [deleteKey]: items } }, o.pool);
				}
				want = [...o.sent];
			} catch (error) {
				want = { error: error instanceof Error ? error.message : String(error) };
			}
			compare(`${kind} #${n}`, got, want, host, tally);
		}
		expect(tally.equal).toBeGreaterThan(cases / 3);
		expect(tally.errors).toBe(0);
	});

	it('has the text functions of the v1 node', () => {
		const o = oracle();
		const inside: (text: string, index: number) => boolean = requireBase(utilsFile).isInsideQuotes;
		const random = prng(SEED + 2);
		for (let n = 0; n < Math.max(2000, CASES / 4); n++) {
			const name = textOf(random, NAME_PARTS, 6);
			expect(msfEscapeIdentifier(name)).toBe(o.v1.escapeIdentifier(name));
			expect(msfEscapeTableName(name)).toBe(o.v1.escapeTableName(name));
			expect(msfFormatColumns(name)).toBe(o.v1.formatColumns(name));
			const text = textOf(random, TEXT_PARTS, 8);
			const index = Math.floor(random() * (text.length + 2));
			expect(msfInsideQuotes(text, index)).toBe(inside(text, index));
			const rows: Array<Record<string, unknown>> = [];
			const width = 1 + Math.floor(random() * 700);
			for (let r = 0; r < Math.floor(random() * 9); r++) {
				const row: Record<string, unknown> = {};
				for (let c = 0; c < width; c++) row[`c${c}`] = c;
				rows.push(row);
			}
			expect(msfChunk(rows).map((group) => group.length)).toEqual(
				o.v1.mssqlChunk(rows).map((group) => group.length),
			);
		}
	});

	it('sends a value without an exact bind, and a column that is a number, to the host', () => {
		for (const value of [NaN, 1e30, {}, [1], new Date(0), 10n]) {
			expect(() => msfBind('select $1', [value])).toThrow(HOST);
		}
		expect(() => msfInsert('t', '1,a', [{ 1: 'x', a: 'y' }])).toThrow(HOST);
		expect(() => msfBind('select $1, $2', [1])).toThrow(
			'The query references $2, but only 1 query parameter(s) are set',
		);
		expect(msfBind("select $1, '$3', $10", [1, 2, 3, 4, 5, 6, 7, 8, 9, 'x'])).toEqual({
			text: "select @p1, '@p3', @p10",
			params: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((i) => ({
				name: `p${i}`,
				value: i === 10 ? 'x' : i,
			})),
		});
	});
});
