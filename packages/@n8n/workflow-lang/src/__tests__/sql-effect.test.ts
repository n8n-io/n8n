/**
 * The `sql` effect (spec 9.10) in the compiler, the reference runner and the
 * bytecode VM: effect kind 7, answered by step name from the fixture.
 */
import { compile } from '../compiler/index.ts';
import { decodeModule } from '../compiler/decode.ts';
import { EFFECT_KIND_NAMES, EffectKind } from '../compiler/opcodes.ts';
import { runReference } from '../reference/runner.ts';
import { runModule } from '../testing/vm.ts';

const wrap = (body: string) => `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ name: string; age: number }>({ path: 'p' })],
	credentials: { db: { type: 'postgres' } },
	async run(ctx, trigger) {
${body}
	},
});
`;

const call = (options: string) => wrap(`return await ctx.sql({ name: 'Read', ${options} });`);

const READ = wrap(`const out = await ctx.sql({
			name: 'Read',
			credential: 'db',
			dialect: 'postgres',
			mode: 'transaction',
			statements: [
				{ text: 'SELECT id FROM people WHERE name = $1 AND age > $2', values: [trigger.body.name, trigger.body.age] },
				{ text: 'DELETE FROM notes' },
			],
		});
		const first = out.results[0];
		if (out.connect !== undefined) return { failed: out.connect.message };
		if ('error' in first) return { failed: first.error.message };
		return { ids: first.rows.map((row) => row.id), command: first.command };`);

const fixture = (result: unknown) => ({
	trigger: { body: { name: 'Ann', age: 30 }, headers: {}, query: {} },
	now: 0,
	seed: 1,
	effects: { Read: [result] },
});

function codes(source: string): string[] {
	return compile(source).diagnostics.map((d) => d.code);
}

describe('the sql effect', () => {
	it('has the effect kind 7', () => {
		expect(EffectKind.sql).toBe(7);
		expect(EFFECT_KIND_NAMES[7]).toBe('sql');
	});

	it.each([
		[
			'rows',
			{
				results: [
					{ command: 'SELECT', rowCount: 2, rows: [{ id: 1 }, { id: 4 }] },
					{ command: 'DELETE', rowCount: 0, rows: [] },
				],
			},
			{ ids: [1, 4], command: 'SELECT' },
		],
		[
			'a failure of a statement',
			{ results: [{ error: { message: 'relation "people" does not exist', code: '42P01' } }] },
			{ failed: 'relation "people" does not exist' },
		],
		[
			'a failure of the connection',
			{
				results: [],
				connect: { message: 'connect ECONNREFUSED 127.0.0.1:5432', code: 'ECONNREFUSED' },
			},
			{ failed: 'connect ECONNREFUSED 127.0.0.1:5432' },
		],
	])(
		'gives %s as data, in the reference runner and in the bytecode',
		async (_name, result, expected) => {
			const compiled = compile(READ);
			expect(compiled.diagnostics).toEqual([]);
			const reference = await runReference(READ, fixture(result));
			expect(reference.status).toBe('ok');
			expect(reference.result).toEqual(expected);
			expect(reference.effects).toEqual([
				{
					step: 'Read',
					kind: 'sql',
					args: {
						name: 'Read',
						credential: 'db',
						dialect: 'postgres',
						mode: 'transaction',
						statements: [
							{ text: 'SELECT id FROM people WHERE name = $1 AND age > $2', values: ['Ann', 30] },
							{ text: 'DELETE FROM notes' },
						],
					},
				},
			]);
			const bytecode = runModule(
				decodeModule(compiled.module ?? new Uint8Array()),
				fixture(result),
			);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
		},
	);

	it('fails the step for an effect error', async () => {
		const failed = { $error: 'sql: the column "tags" has the type 1007 (limit: sql-type)' };
		const reference = await runReference(READ, fixture(failed));
		expect(reference.status).toBe('needs_attention');
		const compiled = compile(READ);
		const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture(failed));
		expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	});

	it.each([
		['no credential', "dialect: 'postgres', statements: [{ text: 'SELECT 1' }]"],
		['no dialect', "credential: 'db', statements: [{ text: 'SELECT 1' }]"],
		['another dialect', "credential: 'db', dialect: 'mysql', statements: [{ text: 'SELECT 1' }]"],
		['no statements', "credential: 'db', dialect: 'postgres'"],
		[
			'a statement without text',
			"credential: 'db', dialect: 'postgres', statements: [{ values: [1] }]",
		],
		[
			'a text that is a template with a value',
			"credential: 'db', dialect: 'postgres', statements: [{ text: `SELECT ${trigger.body.age}` }]",
		],
		[
			'a list as a bind value',
			"credential: 'db', dialect: 'postgres', statements: [{ text: 'SELECT $1', values: [[1, 2]] }]",
		],
		[
			'an object as a bind value',
			"credential: 'db', dialect: 'postgres', statements: [{ text: 'SELECT $1', values: [{ a: 1 }] }]",
		],
	])('rejects %s with WL032', (_name, options) => {
		expect(codes(call(options))).toContain('WL032');
	});

	it('accepts scalar bind values', () => {
		expect(
			codes(
				call(
					"credential: 'db', dialect: 'postgres', statements: [{ text: 'SELECT $1, $2, $3, $4', values: ['a', 1, true, null] }]",
				),
			),
		).toEqual([]);
	});

	it('must be awaited, as each effect', () => {
		expect(
			codes(
				wrap(
					"ctx.sql({ name: 'Read', credential: 'db', dialect: 'postgres', statements: [{ text: 'SELECT 1' }] });",
				),
			),
		).toContain('WL010');
	});
});
