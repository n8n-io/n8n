/**
 * The Data Table node in the converter: a library node over `ctx.service`
 * (spec 9.9) when the runtime supports service calls, else the v1 node in
 * the fallback host.
 */
import { compile } from '../../compiler/index.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

function workflow(table: Record<string, unknown>, version = 1.1) {
	return {
		name: 'Data table',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p' },
			},
			{
				name: 'Table',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: version,
				position: [200, 0],
				parameters: table,
			},
		],
		connections: { Hook: { main: [[{ node: 'Table', type: 'main', index: 0 }]] } },
	};
}

const insert = {
	dataTableId: { __rl: true, mode: 'list', value: 'T' },
	columns: {
		mappingMode: 'defineBelow',
		value: { email: '={{ $json.body.e }}', n: '={{ $json.body.n }}' },
		schema: [
			{ id: 'email', type: 'string' },
			{ id: 'n', type: 'number' },
		],
	},
	options: {},
};

describe('Data Table node', () => {
	it('runs in the host without service support', () => {
		const out = convertWorkflow(workflow(insert), { services: false });
		expect(out.ok).toBe(true);
		expect(out.source).toContain("host: 'fallback'");
	});

	it('inserts all items with one service call', async () => {
		const out = convertWorkflow(workflow(insert), { services: true });
		expect(out.ok).toBe(true);
		expect(out.source).not.toContain("host: 'fallback'");
		const compiled = compile(out.source);
		expect(compiled.diagnostics).toEqual([]);
		expect(compiled.warnings ?? []).toEqual([]);
		const run = await runReference(out.source, {
			trigger: { body: { e: 'a@x.io', n: '4' }, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Table: [[{ id: 1, email: 'a@x.io', n: 4 }]] },
		});
		expect(run.effects).toEqual([
			{
				step: 'Table',
				kind: 'service',
				args: {
					service: 'dataTable',
					op: 'insertRows',
					args: { dataTableId: 'T', rows: [{ email: 'a@x.io', n: 4 }], returnType: 'all' },
				},
			},
		]);
	});

	it('gives the input items, as v1 does, when the node continues on fail', async () => {
		const wf = workflow(insert);
		Object.assign(wf.nodes[1], { onError: 'continueRegularOutput' });
		const out = convertWorkflow(wf, { trace: 'all' });
		const run = await runReference(out.source, {
			trigger: { body: { e: 'a@x.io', n: 'x' }, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Table: [] },
			trace: true,
		});
		expect(run.status).toBe('ok');
		// The cast of `n` fails before any service call; v1's bulk path gives the n8n items.
		expect(run.effects).toEqual([]);
		const items = run.trace?.find((t) => t.step === 'Table')?.items;
		expect(JSON.stringify(items)).toContain('"pairedItem":{"item":0}');
	});

	it('sends no filter value when its expression gives no value, as v1 does', async () => {
		const out = convertWorkflow(
			workflow(
				{
					operation: 'deleteRows',
					dataTableId: { __rl: true, mode: 'id', value: 'T' },
					filters: { conditions: [{ keyName: 'email', keyValue: '={{ $json.body.missing }}' }] },
					options: {},
				},
				1,
			),
		);
		const run = await runReference(out.source, {
			trigger: { body: {}, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Table: [[{ name: 'email', type: 'string' }], []] },
		});
		expect(run.effects[1]?.args).toEqual({
			service: 'dataTable',
			op: 'deleteRows',
			args: {
				dataTableId: 'T',
				options: {
					filter: { type: 'or', filters: [{ columnName: 'email', condition: 'eq' }] },
					dryRun: false,
				},
			},
		});
	});

	it('runs the table resource and mapped dates in the host', () => {
		const dated = {
			...insert,
			columns: { ...insert.columns, schema: [{ id: 'email', type: 'dateTime' }] },
		};
		for (const wf of [workflow({ resource: 'table', operation: 'list' }), workflow(dated)]) {
			expect(convertWorkflow(wf, { services: true }).source).toContain("host: 'fallback'");
		}
	});
});
