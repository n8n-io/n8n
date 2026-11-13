/**
 * dateTime conditions of the If node against v1: each case runs the workflow
 * in n8n's engine and the converted workflow on the reference runner, and
 * compares which output each item takes (or the error).
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

interface Case {
	name: string;
	operation: string;
	right: string;
	dates: unknown[];
	strict?: boolean;
}

const DATES = [
	'2024-03-01T10:00:00Z',
	'2024-03-01T09:00:00+01:00',
	'2024-03-01 11:30:00',
	'2024-03-01',
	'Fri, 01 Mar 2024 08:00:00 GMT',
	null,
];

const CASES: Case[] = [
	{ name: 'after', operation: 'after', right: '2024-03-01T09:45:00+01:00', dates: DATES },
	{ name: 'before', operation: 'before', right: '2024-03-01T10:15:00', dates: DATES },
	{ name: 'equals', operation: 'equals', right: '2024-03-01T08:00:00.000Z', dates: DATES },
	{ name: 'after or equals', operation: 'afterOrEquals', right: '2024-03-01', dates: DATES },
	{
		name: 'before or equals (loose)',
		operation: 'beforeOrEquals',
		right: '2024-03-01 10:00:00',
		dates: DATES,
		strict: false,
	},
	{ name: 'text that is not a date', operation: 'after', right: '2024-03-01', dates: ['soon'] },
];

function workflow(c: Case) {
	return {
		name: 'Dates',
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
				parameters: {
					jsCode: `return ${JSON.stringify(c.dates)}.map((date) => ({ json: { date } }));`,
				},
			},
			{
				name: 'Check',
				type: 'n8n-nodes-base.if',
				typeVersion: 2.2,
				position: [400, 0],
				parameters: {
					conditions: {
						options: {
							caseSensitive: true,
							leftValue: '',
							typeValidation: c.strict === false ? 'loose' : 'strict',
							version: 2,
						},
						conditions: [
							{
								id: 'd',
								leftValue: '={{ $json.date }}',
								rightValue: c.right,
								operator: { type: 'dateTime', operation: c.operation },
							},
						],
						combinator: 'and',
					},
					looseTypeValidation: c.strict === false,
					options: {},
				},
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'Check', type: 'main', index: 0 }]] },
		},
		// The oracle runs every workflow in the default zone (America/New_York), as the
		// converter does for a workflow without a time zone. n8n gives Luxon the workflow
		// zone (WorkflowDataProxy), which the oracle does not pass on.
		settings: { executionOrder: 'v1' },
	};
}

describe('dateTime conditions and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		const v1 = await runOracle(workflow(c), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
		});
		const converted = convertWorkflow(workflow(c), { trace: 'all' });
		expect(converted.fallbackNodes).toEqual([]);
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {},
			trace: true,
		});
		if (v1.error) {
			expect(out.status).toBe('error');
			const message = (out.result as { message?: string }).message ?? '';
			expect(message).toBe(v1.error);
			return;
		}
		expect(out.status).toBe('ok');
		const traced = (out.trace ?? []).find((t) => t.step === 'Check')?.items;
		expect(traced).toEqual(v1.nodes.Check);
	});
});
