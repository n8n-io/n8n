/**
 * Converter tests for loops, sub-workflows, waits, n8n variables and the
 * engine shape. `behaviour.test.ts` compares the same features with n8n's
 * engine (cases 12 to 15).
 */
import { describe, expect, it } from 'vitest';

import { createRequire } from 'node:module';
import { join } from 'node:path';

import { compile } from '../../compiler/index.ts';
import { DEFAULT_NODE_PACKAGES } from '../../credentials/types.ts';
import type { Fixture } from '../../reference/runner.ts';
import { runReference } from '../../reference/runner.ts';
import type { ExpressionScope } from '../expression.ts';
import { translateExpression } from '../expression.ts';
import { convertWorkflow } from '../index.ts';
import { connect, node, webhookNode } from './workflows.ts';

const wf = (nodes: unknown[], connections: unknown, extra: Record<string, unknown> = {}) => ({
	name: 'Test',
	nodes,
	connections,
	settings: { executionOrder: 'v1' },
	...extra,
});

const set = (name: string, position: [number, number], fields: Array<[string, unknown, string]>) =>
	node(name, 'set', 3.4, position, {
		assignments: {
			assignments: fields.map(([n, value, type]) => ({ id: n, name: n, value, type })),
		},
		includeOtherFields: true,
		options: {},
	});

function converted(input: unknown, options = {}) {
	const r = convertWorkflow(input, options);
	expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(compile(r.source, { fileName: '/workflow.ts' }).ok).toBe(true);
	return r;
}

async function run(source: string, body: unknown, effects: Record<string, unknown[]> = {}) {
	const fixture: Fixture = {
		trigger: { body, headers: {}, query: {} },
		now: 1_700_000_000_000,
		seed: 1,
		effects,
		trace: true,
	};
	return await runReference(source, fixture);
}

const child = {
	name: 'Child',
	nodes: [
		node('Start', 'executeWorkflowTrigger', 1.1, [0, 0], {
			inputSource: 'workflowInputs',
			workflowInputs: { values: [{ name: 'n' }] },
		}),
		set('Double', [200, 0], [['twice', '={{ $json.n * 2 }}', 'number']]),
	],
	connections: connect([['Start', 0, 'Double', 0]]),
};

describe('loops', () => {
	it('runs a cycle through IF on the v1 run stack', async () => {
		const r = converted(
			wf(
				[
					webhookNode(),
					set('Increment', [200, 0], [['count', '={{ ($json.count ?? 0) + 1 }}', 'number']]),
					node('Again', 'if', 2.2, [400, 0], {
						conditions: {
							options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
							conditions: [
								{
									id: 'c',
									leftValue: '={{ $json.count }}',
									rightValue: 4,
									operator: { type: 'number', operation: 'lt' },
								},
							],
							combinator: 'and',
						},
						options: {},
					}),
					node('Done', 'noOp', 1, [600, 100]),
				],
				connect([
					['Webhook', 0, 'Increment', 0],
					['Increment', 0, 'Again', 0],
					['Again', 0, 'Increment', 0],
					['Again', 1, 'Done', 0],
				]),
			),
		);
		expect(r.diagnostics.some((d) => d.code === 'engine')).toBe(true);
		expect(r.source).toContain('v1Next(engine)');
		// Node functions are arrow functions: a hoisted declaration that captures a variable
		// of the run fails in the runtime ("value is not a cell", docs/gym-diff.md).
		expect(r.source).toContain('const runIncrement = async (inputs: Json[][]');
		expect(r.source).not.toContain('async function runIncrement');
		const out = await run(r.source, {});
		expect(out.status).toBe('ok');
		const done = (out.result as Record<string, Array<{ count: number }>>).Done;
		expect(done.map((x) => x.count)).toEqual([4]);
		// One trace for each run of Increment, with its run index in order.
		expect(out.trace?.filter((t) => t.step === 'Increment')).toHaveLength(4);
	});

	it('keeps the flat shape for a workflow without loops', () => {
		const r = converted(
			wf([webhookNode(), node('A', 'noOp', 1, [200, 0])], connect([['Webhook', 0, 'A', 0]])),
		);
		expect(r.diagnostics.some((d) => d.code === 'engine')).toBe(false);
		expect(r.source).toContain('const a: Json[] = webhookItems;');
	});
});

describe('sub-workflows', () => {
	const parent = (parameters: Record<string, unknown>) =>
		wf(
			[
				webhookNode(),
				node('Split', 'splitOut', 1, [200, 0], { fieldToSplitOut: 'body.list', options: {} }),
				node('Call', 'executeWorkflow', 1.3, [400, 0], parameters),
			],
			connect([
				['Webhook', 0, 'Split', 0],
				['Split', 0, 'Call', 0],
			]),
		);

	it('calls the callee that the resolver gives as a function, once for each item', async () => {
		const r = converted(
			parent({
				workflowId: { __rl: true, value: 'w1', mode: 'list', cachedResultName: 'Child' },
				mode: 'each',
				options: {},
			}),
			{ resolveWorkflow: (id: string) => (id === 'w1' ? child : undefined) },
		);
		expect(r.source).toContain('async function childWorkflow(items: Json[]): Promise<Json[][]> {');
		expect(r.source).toContain("pickInputs(items, ['n'])");
		const out = await run(r.source, { list: [{ n: 1, x: 'drop' }, { n: 5 }] });
		expect(out.status).toBe('ok');
		expect((out.result as Record<string, unknown>).Call).toEqual([
			{ n: 1, twice: 2 },
			{ n: 5, twice: 10 },
		]);
		// Steps and traces of the callee carry the workflow name.
		expect(out.trace?.some((t) => t.step === 'Child / Double')).toBe(true);
	});

	it('runs a callee that it cannot resolve in the fallback host', () => {
		const r = converted(parent({ workflowId: { __rl: true, value: 'unknown', mode: 'id' } }));
		expect(r.diagnostics.find((d) => d.code === 'sub-workflow-host')?.message).toContain(
			'"unknown" is not known',
		);
		expect(r.source).toContain("type: 'n8n-nodes-base.executeWorkflow'");
		expect(r.fallbackNodes).toEqual(['Call']);
	});

	it('writes a recursive callee once and calls it from itself', () => {
		const recursive = {
			name: 'Again',
			nodes: [
				node('Start', 'executeWorkflowTrigger', 1, [0, 0]),
				node('Deeper', 'executeWorkflow', 1.3, [200, 0], {
					workflowId: { __rl: true, value: 'r', mode: 'id' },
				}),
			],
			connections: connect([['Start', 0, 'Deeper', 0]]),
		};
		const r = converted(parent({ workflowId: { __rl: true, value: 'r', mode: 'id' } }), {
			resolveWorkflow: (id: string) => (id === 'r' ? recursive : undefined),
		});
		expect(r.source.match(/async function againWorkflow\(/g)).toHaveLength(1);
		expect(r.source).toContain('await againWorkflow(');
	});

	it('does not wait for the callee when the node says so, and gives the input items', async () => {
		const r = converted(
			parent({
				source: 'parameter',
				workflowJson: JSON.stringify(child),
				options: { waitForSubWorkflow: false },
			}),
		);
		expect(r.diagnostics.some((d) => d.code === 'sub-workflow-no-wait')).toBe(true);
		const out = await run(r.source, { list: [{ n: 2 }] });
		expect((out.result as Record<string, unknown>).Call).toEqual([{ n: 2 }]);
	});
});

describe('trigger options', () => {
	const schedule = node('Schedule Trigger', 'scheduleTrigger', 1.2, [0, 0], {
		rule: { interval: [{ field: 'hours' }] },
	});
	const manual = node('Manual', 'manualTrigger', 1, [0, 200]);
	const two = wf(
		[schedule, manual, node('A', 'noOp', 1, [200, 0]), node('B', 'noOp', 1, [200, 200])],
		connect([
			['Schedule Trigger', 0, 'A', 0],
			['Manual', 0, 'B', 0],
		]),
	);

	it.each([
		['America/New_York', Date.UTC(2026, 2, 8, 6, 59, 59, 7)],
		['America/New_York', Date.UTC(2026, 2, 8, 7, 0, 0)],
		['Europe/Berlin', Date.UTC(2026, 10, 1, 23, 5, 3)],
		['Asia/Kolkata', Date.UTC(2026, 0, 22, 18, 30)],
		['America/St_Johns', Date.UTC(2026, 5, 3, 11, 0, 0, 999)],
		['UTC', Date.UTC(2026, 11, 13, 12, 0)],
	])('makes the v1 Schedule Trigger item natively in %s (%i)', async (zone, at) => {
		const r = convertWorkflow(
			{ ...two, settings: { executionOrder: 'v1', timezone: zone } },
			{ scheduleItem: 'v1', trace: 'all' },
		);
		expect(r.source).not.toContain('n8n-compiled.schedule');
		const nodesBase = createRequire(join(DEFAULT_NODE_PACKAGES[0], 'package.json'));
		const moment = nodesBase('moment-timezone') as {
			tz(
				at: number,
				zone: string,
			): {
				format(f: string): string;
				toISOString(keepOffset: boolean): string;
			};
		};
		const m = moment.tz(at, zone);
		const expected = {
			timestamp: m.toISOString(true),
			'Readable date': m.format('MMMM Do YYYY, h:mm:ss a'),
			'Readable time': m.format('h:mm:ss a'),
			'Day of week': m.format('dddd'),
			Year: m.format('YYYY'),
			Month: m.format('MMMM'),
			'Day of month': m.format('DD'),
			Hour: m.format('HH'),
			Minute: m.format('mm'),
			Second: m.format('ss'),
			Timezone: `${zone} (UTC${m.format('Z')})`,
		};
		const out = await runReference(r.source, {
			trigger: { scheduledAt: at },
			now: at,
			seed: 1,
			effects: {},
			trace: true,
		});
		const first = (out.trace ?? []).find((t) => t.step === 'Schedule Trigger');
		expect(first?.items).toEqual([expected]);
	});

	it('polls an app trigger once in the host with `pollTrigger`', () => {
		const r = convertWorkflow(
			wf(
				[
					node('Gmail Trigger', 'gmailTrigger', 1.2, [0, 0], { filters: {} }),
					node('A', 'noOp', 1, [200, 0]),
				],
				connect([['Gmail Trigger', 0, 'A', 0]]),
			),
			{ pollTrigger: true },
		);
		expect(r.source).toContain("type: 'n8n-nodes-base.gmailTrigger'");
		expect(r.source).toContain('poll: true');
	});

	it('starts at the trigger that `trigger` names', () => {
		const r = convertWorkflow(two, { trigger: 'Manual' });
		expect(r.source).toContain('const b: Json[]');
		expect(r.source).not.toContain('const a: Json[]');
	});
});

describe('waits', () => {
	it('reads the wait amount in seconds after version 1, and in hours in version 1', () => {
		const source = (version: number) =>
			converted(
				wf(
					[webhookNode(), node('Wait', 'wait', version, [200, 0], { amount: 2 })],
					connect([['Webhook', 0, 'Wait', 0]]),
				),
			).source;
		expect(source(1.1)).toContain('duration: 2 * 1000');
		expect(source(1)).toContain('duration: 2 * 3600000');
	});

	it('waits for a webhook call with ctx.approval and gives the request item', async () => {
		const r = converted(
			wf(
				[
					webhookNode(),
					node('Wait', 'wait', 1.1, [200, 0], {
						resume: 'webhook',
						limitWaitTime: true,
						limitType: 'afterTimeInterval',
						resumeAmount: 5,
						resumeUnit: 'minutes',
					}),
				],
				connect([['Webhook', 0, 'Wait', 0]]),
			),
		);
		expect(r.source).toContain("via: 'webhook'");
		expect(r.source).toContain('timeout: 5 * 60000');
		// n8n resumes the wait with the JSON body of the request; v1 gives the request item.
		const out = await run(r.source, {}, { Wait: [{ ok: 1 }] });
		expect((out.result as Record<string, unknown>).Wait).toEqual([
			{ headers: {}, params: {}, query: {}, body: { ok: 1 } },
		]);
		const timedOut = await run(r.source, { a: 1 }, { Wait: [{ approved: false }] });
		expect((timedOut.result as Record<string, Array<{ body: unknown }>>).Wait[0].body).toEqual({
			a: 1,
		});
	});

	it('turns send and wait into an approval with the v1 output shape', async () => {
		const r = converted(
			wf(
				[
					webhookNode(),
					node('Ask', 'slack', 2.2, [200, 0], {
						resource: 'message',
						operation: 'sendAndWait',
						message: '=Approve {{ $json.body.id }}?',
					}),
				],
				connect([['Webhook', 0, 'Ask', 0]]),
			),
		);
		expect(r.source).toContain("via: 'slack'");
		// The runtime sends the message with this node through the fallback host.
		expect(r.source).toContain('node: {\n');
		expect(r.source).toContain("type: 'n8n-nodes-base.slack'");
		const out = await run(r.source, { id: 7 }, { Ask: [{ approved: true }] });
		expect(out.effects[0].args).toMatchObject({ message: 'Approve 7?' });
		expect((out.result as Record<string, unknown>).Ask).toEqual([{ data: { approved: true } }]);
	});
});

describe('n8n variables and settings', () => {
	it('reads $execution with ctx.execution()', () => {
		const r = converted(
			wf(
				[webhookNode(), set('Url', [200, 0], [['url', '={{ $execution.resumeUrl }}', 'string']])],
				connect([['Webhook', 0, 'Url', 0]]),
			),
		);
		// The runtime gives `$execution` with a glue call; no host step is needed.
		expect(r.source).toContain('ctx.execution().resumeUrl');
		expect(r.source).not.toContain('n8n-compiled.context');
	});

	it('gives a workflow without a trigger a start node for each root', async () => {
		const r = converted(
			wf([set('A', [0, 0], [['a', 1, 'number']]), set('B', [0, 200], [['b', 2, 'number']])], {}),
		);
		expect(r.diagnostics.some((d) => d.code === 'no-trigger')).toBe(true);
		const out = await run(r.source, {});
		expect(out.result).toEqual({ A: [{ a: 1 }], B: [{ b: 2 }] });
	});

	it('runs a node of another package in the fallback host with a warning', () => {
		const r = converted(
			wf(
				[webhookNode(), { ...node('C', 'x', 1, [200, 0]), type: 'n8n-nodes-acme.thing' }],
				connect([['Webhook', 0, 'C', 0]]),
			),
		);
		expect(r.diagnostics.some((d) => d.code === 'community-node')).toBe(true);
		expect(r.fallbackNodes).toEqual(['C']);
	});

	it('translates itemMatching, $runIndex and the node context', () => {
		const scope: ExpressionScope = {
			pairedItem: (name) =>
				name === 'Parent'
					? { code: '$json', usesIndex: false }
					: { code: 'other[i]', usesIndex: true, approximate: true },
			nodeList: (name) => (name === 'Parent' ? 'parent' : 'other'),
			nodeParameters: () => ({}),
			nodeContext: (name) => `${name.toLowerCase()}Context`,
			inputList: 'input',
			ownParameters: {},
			workflowName: 'W',
			workflowId: '1',
			prevNode: null,
			prevSource: 'source',
			runIndex: 'runIndex',
		};
		const code = (v: string) => {
			const r = translateExpression(v, scope);
			if (!r.ok) throw new Error(r.issues.map((i) => i.feature).join());
			return r.code;
		};
		expect(code("={{ $('Parent').itemMatching(0).json.a }}")).toBe('input[(0)].a');
		expect(code("={{ $('Other').itemMatching($itemIndex).json.a }}")).toBe('other[(i)].a');
		expect(code('={{ $runIndex }}')).toBe('runIndex');
		expect(code('={{ $node["Loop"].context["done"] }}')).toBe('loopContext["done"]');
		expect(code('={{ $prevNode.name }}')).toBe('source?.previousNode');
	});
});

describe('schedule intervals', () => {
	it('reads a cron rule written as `=` text without `{{ }}` as that text', () => {
		const r = convertWorkflow(
			wf(
				[
					node('Every 10', 'scheduleTrigger', 1.2, [0, 0], {
						rule: { interval: [{ field: 'cronExpression', expression: '=5-59/10 8-20 * * 1-5' }] },
					}),
					node('A', 'noOp', 1, [200, 0]),
				],
				connect([['Every 10', 0, 'A', 0]]),
			),
		);
		expect(r.ok).toBe(true);
		expect(r.source).toContain("cron: '5-59/10 8-20 * * 1-5'");
	});

	it('fires at hour 0 for an hours interval of 24, as n8n does before version 1.3', () => {
		const r = convertWorkflow(
			wf(
				[
					node('Daily', 'scheduleTrigger', 1.2, [0, 0], {
						rule: { interval: [{ field: 'hours', hoursInterval: 24, triggerAtMinute: 25 }] },
					}),
					node('A', 'noOp', 1, [200, 0]),
				],
				connect([['Daily', 0, 'A', 0]]),
			),
		);
		expect(r.ok).toBe(true);
		expect(r.source).toContain("cron: '25 0 * * *'");
	});

	it.each([
		[
			'days interval 0',
			{ field: 'days', daysInterval: 0, triggerAtHour: 12 },
			"every: { unit: 'days', value: 1",
		],
		[
			'weeks interval null',
			{ field: 'weeks', weeksInterval: null, triggerAtDay: [1] },
			"every: { unit: 'weeks', value: 1",
		],
		['hours interval 0', { field: 'hours', hoursInterval: 0 }, "every: { unit: 'hours', value: 1"],
	])('compiles an interval that n8n runs on every cron slot (%s)', (_name, rule, expected) => {
		const r = convertWorkflow(
			wf(
				[
					node('S', 'scheduleTrigger', 1.2, [0, 0], { rule: { interval: [rule] } }),
					node('A', 'noOp', 1, [200, 0]),
				],
				connect([['S', 0, 'A', 0]]),
			),
		);
		expect(r.ok).toBe(true);
		expect(r.source).toContain(expected);
	});

	it.each([
		[{ mode: 'everyX', value: 24 }, "cron: '0 0 * * *'"],
		[{ mode: 'everyX', value: 60, unit: 'minutes' }, "cron: '0 * * * *'"],
	])('maps a Cron node step of a whole field to its one slot (%j)', (item, expected) => {
		const r = convertWorkflow(
			wf(
				[
					node('C', 'cron', 1, [0, 0], { triggerTimes: { item: [item] } }),
					node('A', 'noOp', 1, [200, 0]),
				],
				connect([['C', 0, 'A', 0]]),
			),
		);
		expect(r.ok).toBe(true);
		expect(r.source).toContain(expected);
	});
});

describe('filter conditions', () => {
	it('accepts operands and template parts that end in `?? ""` (TS2869)', async () => {
		const r = converted(
			wf(
				[
					webhookNode(),
					set('Text', [200, 0], [['t', '=Hi {{ $json.body.name ?? "you" }}!', 'string']]),
					node('Check', 'if', 2.3, [400, 0], {
						conditions: {
							options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
							conditions: [
								{
									id: 'a',
									leftValue: '={{ $json.body.text ?? "" }}',
									rightValue: '',
									operator: { type: 'string', operation: 'empty', singleValue: true },
								},
							],
							combinator: 'and',
						},
						options: {},
					}),
				],
				connect([
					['Webhook', 0, 'Text', 0],
					['Text', 0, 'Check', 0],
				]),
			),
		);
		expect(r.fallbackNodes).toEqual([]);
		const out = await run(r.source, { name: 'Ada' });
		expect(out.status).toBe('ok');
	});

	it('compares with a fixed expression text natively (no `??` on a literal)', async () => {
		const condition = (left: string, right: string, operation: string) => ({
			id: operation,
			leftValue: left,
			rightValue: right,
			operator: { type: 'string', operation },
		});
		const r = converted(
			wf(
				[
					webhookNode(),
					node('Check', 'if', 2.3, [200, 0], {
						conditions: {
							options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
							conditions: [
								condition('={{ $json.body.status }}', '=No Leads Today', 'notEquals'),
								condition('=={{ $json.body.flag }}', '==false', 'equals'),
							],
							combinator: 'and',
						},
						options: {},
					}),
					node('Yes', 'noOp', 1, [400, -100]),
					node('No', 'noOp', 1, [400, 100]),
				],
				connect([
					['Webhook', 0, 'Check', 0],
					['Check', 0, 'Yes', 0],
					['Check', 1, 'No', 0],
				]),
			),
		);
		expect(r.fallbackNodes).toEqual([]);
		expect(r.source).not.toMatch(/"No Leads Today" \?\?/);
		const yes = await run(r.source, { status: 'Leads', flag: false });
		expect(Object.keys(yes.result as Record<string, unknown>)).toContain('Yes');
		const no = await run(r.source, { status: 'No Leads Today', flag: false });
		expect(Object.keys(no.result as Record<string, unknown>)).toContain('No');
	});
});

describe('library nodes that v1 runs once for all items', () => {
	it('sends one Supabase create request with the fields of each item', async () => {
		const r = converted(
			wf(
				[
					webhookNode(),
					node('Split', 'splitOut', 1, [200, 0], { fieldToSplitOut: 'body.people', options: {} }),
					node(
						'Create',
						'supabase',
						1,
						[400, 0],
						{
							resource: 'row',
							operation: 'create',
							tableId: 'people',
							fieldsUi: {
								fieldValues: [
									{ fieldId: 'name', fieldValue: '={{ $json.name }}' },
									{ fieldId: 'n', fieldValue: '={{ $itemIndex }}' },
								],
							},
						},
						{ credentials: { supabaseApi: { id: '1', name: 'Supabase' } } },
					),
				],
				connect([
					['Webhook', 0, 'Split', 0],
					['Split', 0, 'Create', 0],
				]),
			),
		);
		expect(r.fallbackNodes).toEqual([]);
		const out = await run(
			r.source,
			{ people: [{ name: 'Ada' }, { name: 'Bob' }] },
			{ Create: [{ status: 201, headers: {}, body: [{ id: 1 }, { id: 2 }] }] },
		);
		expect(out.status).toBe('ok');
		const calls = out.effects.filter((e) => e.step === 'Create');
		expect(calls).toHaveLength(1);
		expect((calls[0].args as { body: unknown }).body).toEqual([
			{ name: 'Ada', n: 0 },
			{ name: 'Bob', n: 1 },
		]);
	});
});

describe('Slack link to the workflow', () => {
	const slackFlow = (otherOptions: Record<string, unknown>) =>
		wf(
			[
				webhookNode(),
				node(
					'Post',
					'slack',
					2.3,
					[200, 0],
					{
						select: 'channel',
						channelId: { __rl: true, mode: 'id', value: 'C1' },
						text: 'hi',
						otherOptions,
					},
					{ credentials: { slackApi: { id: '1', name: 'Slack' } } },
				),
			],
			connect([['Webhook', 0, 'Post', 0]]),
			{ id: 'wf1' },
		);
	const instance = { baseUrl: 'https://n8n.example.com/', id: 'abc' };

	it('runs the default link in the host when the instance is not known', () => {
		expect(convertWorkflow(slackFlow({})).fallbackNodes).toEqual(['Post']);
	});

	it('posts the v1 link text with the instance URL, workflow id and instance id', async () => {
		const r = converted(slackFlow({}), { instance });
		expect(r.fallbackNodes).toEqual([]);
		const out = await run(
			r.source,
			{},
			{ Post: [{ status: 200, headers: {}, body: { ok: true, ts: '1.2' } }] },
		);
		const call = out.effects.find((e) => e.step === 'Post');
		expect(call).toBeDefined();
		expect((call!.args as { body: { text: string } }).body.text).toBe(
			'hi\n_Automated with this <https://n8n.example.com/workflow/wf1?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.slack_abc|n8n workflow>_',
		);
	});

	it('keeps a computed link option in the host', () => {
		expect(
			convertWorkflow(slackFlow({ includeLinkToWorkflow: '={{ true }}' }), { instance })
				.fallbackNodes,
		).toEqual(['Post']);
	});
});
