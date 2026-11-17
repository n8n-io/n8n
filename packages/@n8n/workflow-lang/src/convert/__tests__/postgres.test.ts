/**
 * The Postgres node in the converter: a library node over `ctx.sql` (spec
 * 9.10) when the runtime runs `sql` effects and the library node has the
 * call, else the v1 node in the fallback host.
 */
import { compile } from '../../compiler/index.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

function workflow(
	parameters: Record<string, unknown>,
	settings: Record<string, unknown> = {},
	version = 2.6,
) {
	return {
		name: 'Postgres',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p' },
			},
			{
				name: 'Query',
				type: 'n8n-nodes-base.postgres',
				typeVersion: version,
				position: [200, 0],
				parameters,
				credentials: { postgres: { id: '1', name: 'db' } },
				...settings,
			},
		],
		connections: { Hook: { main: [[{ node: 'Query', type: 'main', index: 0 }]] } },
	};
}

const read = {
	operation: 'executeQuery',
	query: 'SELECT id FROM people WHERE name = $1 AND age > $2',
	options: { queryReplacement: '={{ $json.body.name }}, {{ $json.body.age }}' },
};

const trigger = { body: { name: 'Ann', age: 30 }, headers: {}, query: {} };
const rows = { results: [{ command: 'SELECT', rowCount: 1, rows: [{ id: 1 }] }] };

function hostOnly(source: string): boolean {
	return source.includes("host: 'fallback'") && !source.includes('batch:');
}

describe('Postgres node', () => {
	it('runs in the host when the runtime has no sql effects', () => {
		const out = convertWorkflow(workflow(read));
		expect(out.ok).toBe(true);
		expect(hostOnly(out.source)).toBe(true);
	});

	it.each([
		['has a version below 2.1', read, {}, 2],
		['has a write without a mapping of the columns', { operation: 'insert' }, {}, 2.6],
		[
			'has the option for empty strings and an expression',
			{ ...read, options: { ...read.options, replaceEmptyStrings: true } },
			{},
			2.6,
		],
		[
			'has query parameters that are not text',
			{ ...read, options: { queryReplacement: ['a'] } },
			{},
			2.6,
		],
	])('runs in the host when the node %s', (_name, parameters, settings, version) => {
		const out = convertWorkflow(workflow(parameters, settings, version), { sql: true });
		expect(out.ok).toBe(true);
		expect(hostOnly(out.source)).toBe(true);
	});

	it.each([
		['continueRegularOutput', 'regular'],
		['continueErrorOutput', 'errorOutput'],
	])('gives the library node the error setting %s and a copy of the node', (onError, mode) => {
		const out = convertWorkflow(workflow(read, { onError }), { sql: true });
		expect(out.ok).toBe(true);
		expect(hostOnly(out.source)).toBe(false);
		expect(out.source).toContain(`errorMode: '${mode}'`);
		expect(out.source).toContain("credentials: { postgres: { id: '1', name: 'db' } }");
		expect(compile(out.source).diagnostics).toEqual([]);
	});

	it('drops an option that the node type does not have, as n8n does', () => {
		const parameters = {
			...read,
			options: { ...read.options, outputLargeFormatNumbersAs: 'text' },
		};
		const out = convertWorkflow(workflow(parameters), { sql: true });
		expect(out.ok).toBe(true);
		expect(hostOnly(out.source)).toBe(false);
		expect(out.source).not.toContain('outputLargeFormatNumbersAs');
	});

	it('sends the values of the query parameters as bind values', async () => {
		const out = convertWorkflow(workflow(read), { sql: true });
		expect(out.ok).toBe(true);
		const compiled = compile(out.source);
		expect(compiled.diagnostics).toEqual([]);
		const run = await runReference(out.source, {
			trigger,
			now: 0,
			seed: 1,
			effects: { Query: [rows] },
		});
		expect(run.status).toBe('ok');
		expect(run.effects).toEqual([
			{
				step: 'Query',
				kind: 'sql',
				args: {
					credential: 'db',
					dialect: 'postgres',
					mode: 'single',
					statements: [
						{ text: 'SELECT id FROM people WHERE name = $1 AND age > $2', values: ['Ann', '30'] },
					],
					largeNumbers: 'text',
					dates: 'legacy',
				},
			},
		]);
	});

	it('runs the v1 node in the host in the same run after a limit of the sql effect', async () => {
		const out = convertWorkflow(workflow(read), { sql: true });
		const run = await runReference(out.source, {
			trigger,
			now: 0,
			seed: 1,
			effects: {
				Query: [{ $error: 'sql: the column "tags" has the type 1007 (limit: sql-type)' }],
				'Query (fallback host)': [[{ id: 1, tags: [1] }]],
			},
		});
		expect(run.status).toBe('ok');
		expect(run.effects.map((e) => [e.step, e.kind])).toEqual([
			['Query', 'sql'],
			['Query (fallback host)', 'node'],
		]);
		expect(JSON.stringify(run.result)).toContain('"tags":[1]');
	});

	it('runs the v1 node in the host, and sends nothing, for a text without an exact form', async () => {
		const filter = { ...read, query: 'SELECT $1:name FROM people' };
		const out = convertWorkflow(workflow(filter), { sql: true });
		const run = await runReference(out.source, {
			trigger,
			now: 0,
			seed: 1,
			effects: { 'Query (fallback host)': [[{ name: 'Ann' }]] },
		});
		expect(run.status).toBe('ok');
		expect(run.effects.map((e) => [e.step, e.kind])).toEqual([['Query (fallback host)', 'node']]);
	});

	it('fails the node with the error of v1 for another error of the sql effect', async () => {
		const out = convertWorkflow(workflow(read), { sql: true });
		const run = await runReference(out.source, {
			trigger,
			now: 0,
			seed: 1,
			effects: {
				Query: [{ results: [{ error: { message: 'relation "people" does not exist' } }] }],
			},
		});
		expect(run.status).toBe('error');
		expect(run.result).toEqual({ name: 'Error', message: 'relation "people" does not exist' });
	});

	it('keeps a node in the host that n8n moved there after a limit', () => {
		const out = convertWorkflow(workflow(read), {
			sql: true,
			nodeSources: {
				entry: () => undefined,
				readFile: () => undefined,
				description: () => undefined,
				runsInHost: (name: string) => name === 'Query',
			},
		});
		expect(out.ok).toBe(true);
		expect(hostOnly(out.source)).toBe(true);
	});
});
