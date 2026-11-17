/**
 * A mapped `dateTime` field of the Data Table node, against v1: n8n's resource mapper parses
 * the value with Luxon in the time zone of the workflow and gives the data-table service the
 * date. Each case runs the workflow in n8n's engine with a data-table service that records
 * its calls, and the converted workflow on the reference runner. The rows of the service
 * call must be the same (a date is its ISO text there), and the node must not run in the
 * fallback host.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const INPUTS = [
	{ d: '2024-03-09T07:05:00.000Z' },
	{ d: '2024-03-09T07:05:00+02:00' },
	{ d: '2024-03-09' },
	{ d: '2024-03-09T07:05' },
	{ d: '2024-07-01 12:30:00' },
	{ d: 'Tue, 02 Jan 2024 03:04:05 +0000' },
	{ d: 'Tue, 02 Jan 2024 03:04:05 GMT' },
	{ d: ' 2024-11-03T01:30:00 ' },
	{ d: null },
	{},
];

function workflow(value: string, inputs: unknown[], operation = 'insert') {
	return {
		name: 'Table dates',
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Items',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [200, 0],
				parameters: { jsCode: `return ${JSON.stringify(inputs)}.map((json) => ({ json }));` },
			},
			{
				name: 'Table',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1.1,
				position: [400, 0],
				parameters: {
					operation,
					dataTableId: { __rl: true, mode: 'id', value: 'tbl1' },
					...(operation === 'insert'
						? {}
						: {
								matchType: 'allConditions',
								filters: {
									conditions: [{ keyName: 'email', condition: 'eq', keyValue: 'a@x.io' }],
								},
							}),
					columns: {
						mappingMode: 'defineBelow',
						value: { email: 'a@x.io', seen: value },
						schema: [
							{ id: 'email', type: 'string' },
							{ id: 'seen', type: 'dateTime' },
						],
					},
					options: {},
				},
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'Table', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

interface Call {
	op: string;
	args: unknown;
}

const COLUMNS = [
	{ id: 'c1', name: 'email', type: 'string', index: 0, dataTableId: 'tbl1' },
	{ id: 'c2', name: 'seen', type: 'date', index: 1, dataTableId: 'tbl1' },
];

/** A data-table service that records its calls as JSON: a date is its ISO text. */
function recordingTables(calls: Call[]) {
	const answer = (op: string, args: unknown, result: unknown) => {
		calls.push({ op, args: JSON.parse(JSON.stringify(args)) });
		return result;
	};
	return {
		getDataTableAggregateProxy: async () => ({ getProjectId: () => 'test' }),
		getDataTableProxy: async (_workflow: unknown, _node: unknown, dataTableId: string) => ({
			getColumns: async () => answer('getColumns', { dataTableId }, COLUMNS),
			insertRows: async (rows: unknown[], returnType: string) =>
				answer('insertRows', { dataTableId, rows, returnType }, []),
			updateRows: async (options: unknown) => answer('updateRows', { dataTableId, options }, []),
			upsertRow: async (options: unknown) => answer('upsertRow', { dataTableId, options }, []),
		}),
	};
}

async function both(value: string, inputs: unknown[], operation = 'insert') {
	const wf = workflow(value, inputs, operation);
	const calls: Call[] = [];
	const v1 = await runOracle(wf, {
		start: 'T',
		item: {},
		mode: 'trigger',
		timeoutMs: 20_000,
		additionalData: { 'data-table': { dataTableProxyProvider: recordingTables(calls) } },
	});
	const converted = convertWorkflow(wf, { trace: 'all' });
	expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(converted.fallbackNodes).toEqual([]);
	const out = await runReference(converted.source, {
		trigger: { body: {} },
		now: 0,
		seed: 1,
		// The answers of the service: the columns for an update or an upsert, then no rows.
		effects: {
			Table: operation === 'insert' ? [[]] : inputs.flatMap(() => [COLUMNS, []]),
		},
		trace: true,
	});
	const sent = out.effects
		.filter((e) => e.step === 'Table' && e.kind === 'service')
		.map((e) => {
			const call = e.args as { op: string; args: unknown };
			return { op: call.op, args: call.args };
		});
	return { v1, out, calls, sent };
}

describe('a mapped dateTime field of the Data Table node', () => {
	it('inserts the dates that v1 gives the service', async () => {
		const { v1, out, calls, sent } = await both('={{ $json.d }}', INPUTS);
		expect(v1.error).toBeNull();
		expect(out.status).toBe('ok');
		expect(calls.length).toBeGreaterThan(0);
		expect(sent).toEqual(calls);
	});

	it.each([
		"={{ DateTime.fromISO('2024-01-02T03:04:05Z') }}",
		"={{ DateTime.fromISO('2024-01-02T03:04:05', { zone: 'Europe/Berlin' }).plus({ days: 1 }) }}",
		"={{ DateTime.fromISO('2024-01-02T03:04:05Z').toISO() }}",
		"={{ DateTime.fromISO('2024-06-02T03:04:05Z').toFormat('yyyy-MM-dd') }}",
		'2024-03-09T07:05:00.000Z',
		'=2024-03-{{ "09" }}',
	])('inserts the date of %s', async (value) => {
		const { v1, out, calls, sent } = await both(value, [{}]);
		expect(v1.error).toBeNull();
		expect(out.status).toBe('ok');
		expect(sent).toEqual(calls);
	});

	it.each(['update', 'upsert'])('gives the date to %s', async (operation) => {
		const { v1, out, calls, sent } = await both('={{ $json.d }}', INPUTS.slice(0, 3), operation);
		expect(v1.error).toBeNull();
		expect(out.status).toBe('ok');
		expect(calls.length).toBeGreaterThan(0);
		expect(sent).toEqual(calls);
	});

	it('reads a number as v1 does', async () => {
		const { v1, out, calls, sent } = await both('={{ $json.d }}', [
			{ d: 12 },
			{ d: 1709967900000 },
		]);
		expect(v1.error === null).toBe(out.status === 'ok');
		expect(sent).toEqual(calls);
	});

	it.each(['not a date', true, { a: 1 }])('fails as v1 for the value %j', async (d) => {
		const { v1, out, calls, sent } = await both('={{ $json.d }}', [{ d }]);
		expect(v1.error).not.toBeNull();
		expect(out.status).toBe('error');
		expect(sent).toEqual(calls);
		const failure = (out.trace ?? []).find((t) => t.step === 'Table')?.items as
			| { $error?: { message?: string } }
			| undefined;
		expect(v1.error).toContain(failure?.$error?.message);
	});
});
