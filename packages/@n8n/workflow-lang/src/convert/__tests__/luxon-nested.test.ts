/**
 * A Luxon DateTime as the value of a member of a collection parameter of a library node:
 * v1 gives the node the text of the DateTime (`cleanupParameterData`), so the expression
 * translates to that text and the node stays a library node. A DateTime that is a whole
 * parameter stays a DateTime in v1: that expression does not translate.
 */
import { runReference } from '../../reference/runner.ts';
import { translateValue } from '../expression.ts';
import type { ExpressionScope } from '../expression.ts';
import { convertWorkflow } from '../index.ts';

const AT = "DateTime.fromISO('2024-01-02T03:04:05Z')";

function workflow(parameters: Record<string, unknown>) {
	return {
		name: 'Nested dates',
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
	};
}

const scope: ExpressionScope = {
	pairedItem: () => null,
	nodeList: () => null,
	nodeParameters: () => null,
	inputList: 'input',
	ownParameters: {},
	workflowName: 'W',
	workflowId: '1',
	prevNode: null,
	timezone: 'America/New_York',
};

describe('a DateTime inside a collection parameter of a library node', () => {
	it('is the text of the DateTime in the request of the node', async () => {
		const converted = convertWorkflow(
			workflow({
				operation: 'create',
				tableId: 'events',
				dataToSend: 'defineBelow',
				fieldsUi: {
					fieldValues: [
						{ fieldId: 'at', fieldValue: `={{ ${AT} }}` },
						{ fieldId: 'later', fieldValue: `={{ ${AT}.plus({ days: 1 }).startOf('day') }}` },
						{ fieldId: 'name', fieldValue: '={{ $json.name }}' },
					],
				},
			}),
			{ trace: 'all' },
		);
		expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
		expect(converted.fallbackNodes).toEqual([]);
		const out = await runReference(converted.source, {
			trigger: { body: { name: 'Ada' } },
			now: 0,
			seed: 1,
			effects: { Rows: [{ status: 201, headers: {}, body: [{ id: 1 }] }] },
		});
		expect(out.status).toBe('ok');
		const sent = out.effects.find((e) => e.step === 'Rows' && e.kind === 'http')?.args as {
			body: unknown;
		};
		expect(JSON.stringify(sent.body)).toContain('"at":"2024-01-01T22:04:05.000-05:00"');
		expect(JSON.stringify(sent.body)).toContain('"later":"2024-01-02T00:00:00.000-05:00"');
		expect(JSON.stringify(sent.body)).toContain('"name":"Ada"');
	});

	it('does not translate a DateTime that is a whole parameter', () => {
		const value = {
			tableId: `={{ ${AT} }}`,
			options: { since: `={{ ${AT} }}` },
			list: [`={{ ${AT} }}`],
		};
		const nested = translateValue(value, scope, '', { luxonValue: 'nested' });
		expect(nested.failures.map((f) => f.path)).toEqual(['tableId']);
		// One parameter as a node reads it: the DateTime below it is text.
		const below = translateValue(value.options, scope, 'options', { luxonValue: 'below' });
		expect(below.failures).toEqual([]);
		const whole = translateValue(`={{ ${AT} }}`, scope, 'start', { luxonValue: 'below' });
		expect(whole.failures.map((f) => f.path)).toEqual(['start']);
	});
});
