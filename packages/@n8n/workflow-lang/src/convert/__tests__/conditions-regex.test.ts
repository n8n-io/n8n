/**
 * Regular expression conditions of the If node against v1: each case runs the
 * workflow in n8n's engine and the converted workflow on the reference runner,
 * and compares which output each item takes.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

interface Case {
	name: string;
	operation: 'regex' | 'notRegex';
	pattern: string;
	caseSensitive: boolean;
	/** `options.version` of the filter value: version 4 ignores case with the `i` flag. */
	version: number;
}

const CASES: Case[] = [
	{
		name: 'plain pattern',
		operation: 'regex',
		pattern: '^INV-\\d+$',
		caseSensitive: true,
		version: 2,
	},
	{
		name: 'literal with flags',
		operation: 'regex',
		pattern: '/inv-(\\d+)/i',
		caseSensitive: true,
		version: 2,
	},
	{
		name: 'not regex',
		operation: 'notRegex',
		pattern: 'error|fail',
		caseSensitive: true,
		version: 2,
	},
	{
		name: 'ignore case before version 4',
		operation: 'regex',
		pattern: '^inv',
		caseSensitive: false,
		version: 2,
	},
	{
		name: 'ignore case in version 4',
		operation: 'regex',
		pattern: '^[A-Z]{3}-',
		caseSensitive: false,
		version: 4,
	},
];

const INPUTS = ['INV-42', 'inv-7', 'Invoice failed', 'abc-1', ''];

function workflow(c: Case) {
	return {
		name: 'Regex',
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
					jsCode: `return ${JSON.stringify(INPUTS)}.map((text) => ({ json: { text } }));`,
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
							caseSensitive: c.caseSensitive,
							leftValue: '',
							typeValidation: 'strict',
							version: c.version,
						},
						conditions: [
							{
								id: 'r',
								leftValue: '={{ $json.text }}',
								rightValue: c.pattern,
								operator: { type: 'string', operation: c.operation },
							},
						],
						combinator: 'and',
					},
					options: c.caseSensitive ? {} : { ignoreCase: true },
				},
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'Check', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

describe('regular expression conditions and v1', () => {
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
		expect(out.status).toBe('ok');
		const traced = (out.trace ?? []).find((t) => t.step === 'Check')?.items;
		expect(traced).toEqual(v1.nodes.Check);
	});
});
