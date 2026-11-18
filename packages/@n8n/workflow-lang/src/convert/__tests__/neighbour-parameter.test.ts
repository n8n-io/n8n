/**
 * An expression that reads the parameter next to its own parameter (`$parameter["&name"]`),
 * against v1. The recorder runs the v1 Supabase node, which evaluates the expressions. The
 * converted workflow runs in the reference runner. The two must send the same request body.
 */
import type { EquivalenceCase } from '../../nodes/__tests__/equivalence.ts';
import { recordV1, recorderAvailable } from '../../nodes/__tests__/v1-recorder.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

const ITEMS = [
	{ a: 1, key: 'email|string' },
	{ a: 2, key: 'phone|number' },
];

const FIELDS: Array<[string, string]> = [
	['size|number', '={{$parameter["&fieldId"].split("|")[1]}}'],
	['kind|text|x', '={{$parameter["&fieldId"].split("|").pop()}}'],
	['plain', "={{ $parameter['&fieldId'] }}"],
	['both', '=a {{ $parameter["&fieldId"] }} b {{ $json.a }}'],
	['with "quotes" and \\ marks', '={{ $parameter["&fieldId"].length }}'],
	['={{ $json.key }}', '={{$parameter["&fieldId"].split("|")[1]}}'],
	['twice', '={{ $parameter["&fieldId"] + $parameter["&fieldId"].toUpperCase() }}'],
];

const parametersOf = (fields: Array<[string, string]>) => ({
	resource: 'row',
	operation: 'create',
	tableId: 'leads',
	fieldsUi: { fieldValues: fields.map(([fieldId, fieldValue]) => ({ fieldId, fieldValue })) },
});

const workflowOf = (parameters: Record<string, unknown>) => ({
	name: 'Neighbour parameter',
	nodes: [
		{
			name: 'T',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			name: 'Rows',
			type: 'n8n-nodes-base.supabase',
			typeVersion: 1,
			position: [200, 0],
			parameters,
			credentials: { supabaseApi: { id: '1', name: 'Supabase' } },
		},
	],
	connections: { T: { main: [[{ node: 'Rows', type: 'main', index: 0 }]] } },
});

describe.runIf(recorderAvailable())('an expression that reads the parameter next to it', () => {
	it.each(FIELDS)('field %s with the value %s sends the body of v1', async (fieldId, value) => {
		const parameters = parametersOf([[fieldId, value]]);
		const testCase: EquivalenceCase = {
			name: `neighbour parameter ${fieldId}`,
			type: 'n8n-nodes-base.supabase',
			typeVersion: 1,
			parameters,
			items: [ITEMS[0]],
			credential: {
				type: 'supabaseApi',
				data: { host: 'https://proj1.supabase.co', serviceRole: 'fake-supabase-key' },
			},
			responses: [{ body: [{ id: 1 }] }],
		};
		const v1 = await recordV1(testCase);
		expect(v1.error).toBeUndefined();
		const converted = convertWorkflow(workflowOf(parameters), { trace: 'all' });
		expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
		expect(converted.fallbackNodes).toEqual([]);
		const out = await runReference(converted.source, {
			trigger: { body: ITEMS[0] },
			now: 0,
			seed: 1,
			effects: { Rows: [{ status: 201, headers: {}, body: [{ id: 1 }] }] },
		});
		expect(out.status).toBe('ok');
		const sent = out.effects.find((e) => e.step === 'Rows' && e.kind === 'http')?.args as {
			body: unknown;
		};
		expect(sent.body).toEqual(v1.requests[0].body);
	});

	it('keeps the node in the host when the parameter next to it is not there', () => {
		const parameters = parametersOf([['plain', '={{ $parameter["&other"] }}']]);
		expect(convertWorkflow(workflowOf(parameters), { trace: 'all' }).fallbackNodes).toEqual([
			'Rows',
		]);
	});

	it('keeps the node in the host when the parameter reads itself', () => {
		const parameters = parametersOf([['plain', '={{ $parameter["&fieldValue"] }}']]);
		expect(convertWorkflow(workflowOf(parameters), { trace: 'all' }).fallbackNodes).toEqual([
			'Rows',
		]);
	});
});
