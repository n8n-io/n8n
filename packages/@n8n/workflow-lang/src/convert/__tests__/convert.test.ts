import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { compile } from '../../compiler/index.ts';
import { NOT_INJECTABLE } from '../../credentials/not-injectable.generated.ts';
import { runConvert } from '../cli.ts';
import type { ExpressionScope } from '../expression.ts';
import { segments, translateExpression } from '../expression.ts';
import { Graph } from '../graph.ts';
import { convertWorkflow } from '../index.ts';
import { camelIdentifier, credentialSlots } from '../naming.ts';
import { connect, extraWorkflows, node, webhookNode } from './workflows.ts';

const scope: ExpressionScope = {
	pairedItem: (name) =>
		name === 'Missing'
			? null
			: name === 'Webhook'
				? { code: 'webhookItems[0]', usesIndex: false }
				: { code: `${camelIdentifier(name)}[i]`, usesIndex: true },
	nodeList: (name) => (name === 'Missing' ? null : camelIdentifier(name)),
	nodeParameters: () => ({ a: 1 }),
	inputList: 'input',
	ownParameters: {},
	workflowName: 'My flow',
	workflowId: 'w1',
	prevNode: 'Edit Fields',
};

function tr(value: string): string {
	const r = translateExpression(value, scope);
	if (!r.ok) throw new Error(r.issues.map((i) => i.feature).join(', '));
	return r.code;
}

const wf = (nodes: unknown[], connections: unknown, extra: Record<string, unknown> = {}) => ({
	name: 'Test',
	nodes,
	connections,
	settings: { executionOrder: 'v1' },
	...extra,
});

describe('expressions', () => {
	it('splits templates into text and expression parts', () => {
		expect(segments('a {{ x }} b{{y}}')).toEqual([
			{ text: 'a ' },
			{ expression: ' x ' },
			{ text: ' b' },
			{ expression: 'y' },
		]);
	});

	it.each([
		['={{ $json.a.b }}', '$json.a.b'],
		['={{ $json["a b"] }}', '$json["a b"]'],
		// The `$` + `{` split keeps the expected template text out of string interpolation rules.
		['=Hi {{ $json.name }}!', '`Hi $' + "{$json.name ?? ''}!`"],
		['=n={{ $json.a + 1 }}', '`n=$' + '{$json.a + 1}`'],
		["={{ $('Webhook').item.json.body.x }}", 'webhookItems[0].body.x'],
		["={{ $('Edit Fields').first().json.id }}", 'editFields[0].id'],
		["={{ $('Edit Fields').last().json.id }}", 'editFields[editFields.length - 1].id'],
		["={{ $('Edit Fields').all().length }}", 'editFields.map((json: Json) => ({ json })).length'],
		['={{ $node["Edit Fields"].json.id }}', 'editFields[i].id'],
		['={{ $input.item.json.a }}', '$json.a'],
		['={{ $input.first().json.a }}', 'input[0].a'],
		[
			'={{ $input.all().map(i => i.json.a) }}',
			'input.map((json: Json) => ({ json })).map((i: Json) => i.json.a)',
		],
		['={{ $itemIndex + 1 }}', 'i + 1'],
		['={{ $runIndex }}', '0'],
		['={{ $workflow.name }}', "'My flow'"],
		['={{ $prevNode.name }}', "'Edit Fields'"],
		['={{ Math.random() }}', 'ctx.random()'],
		['={{ Date.now() }}', 'ctx.now()'],
		['={{ $items("Edit Fields").length }}', 'editFields.map((json: Json) => ({ json })).length'],
	])('%s → %s', (input, output) => {
		expect(tr(input)).toBe(output);
	});

	it('gives $items() all input items of a node with "execute once", as v1 does', () => {
		const r = translateExpression('={{ $items().length }}', { ...scope, itemsList: 'allInput' });
		expect(r.ok && r.code).toBe('allInput.map((json: Json) => ({ json })).length');
	});

	it('reports what has no mapping', () => {
		const r = translateExpression('={{ $execution.id }}', scope);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.issues[0].feature).toBe('$execution');
		// v1 stops with an expression error at run time, so the code throws there too.
		const m = translateExpression("={{ $('Missing').item.json }}", scope);
		expect(m.ok && m.code).toContain(
			"throw new Error('Node \\'Missing\\' hasn\\'t been executed')",
		);
	});
});

describe('run order', () => {
	it('follows v1: depth first, top child first, a node with two parents after both', () => {
		const g = new Graph({
			nodes: [
				node('T', 'webhook', 2, [0, 0]),
				node('Low', 'noOp', 1, [200, 200]),
				node('High', 'noOp', 1, [200, -200]),
				node('High child', 'noOp', 1, [400, -200]),
				node('Join', 'merge', 3, [600, 0]),
			],
			connections: connect([
				['T', 0, 'Low', 0],
				['T', 0, 'High', 0],
				['High', 0, 'High child', 0],
				['High child', 0, 'Join', 0],
				['Low', 0, 'Join', 1],
			]),
		});
		expect(g.runOrder('T')).toEqual(['T', 'High', 'High child', 'Low', 'Join']);
	});
});

describe('credential slots', () => {
	it('come from the credential names and do not depend on the order', () => {
		const uses = [
			{ type: 'slackApi', name: 'Slack account' },
			{ type: 'notionApi', name: 'Main' },
			{ type: 'slackOAuth2Api', name: 'Main' },
		];
		const a = credentialSlots(uses);
		const b = credentialSlots([...uses].reverse());
		expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
		expect([...a.values()].sort()).toEqual(['mainNotionApi', 'mainSlackOauth2Api', 'slackAccount']);
	});
});

describe('convertWorkflow', () => {
	it('converts the sample workflows, and the source compiles', () => {
		for (const [name, sample] of Object.entries(extraWorkflows)) {
			const r = convertWorkflow(sample);
			expect(r.ok, name).toBe(true);
			expect(compile(r.source, { fileName: '/workflow.ts' }).ok, name).toBe(true);
		}
	});

	it('maps node settings: retry, onError, executeOnce, alwaysOutputData', () => {
		const r = convertWorkflow(
			wf(
				[
					webhookNode(),
					node(
						'Fetch',
						'postgres',
						2.5,
						[200, 0],
						{ operation: 'select' },
						{ onError: 'continueErrorOutput', retryOnFail: true },
					),
					node(
						'Once',
						'set',
						3.4,
						[400, 0],
						{ assignments: { assignments: [] }, options: {} },
						{ executeOnce: true, alwaysOutputData: true },
					),
					node('Errors', 'noOp', 1, [400, 200]),
				],
				connect([
					['Webhook', 0, 'Fetch', 0],
					['Fetch', 0, 'Once', 0],
					['Fetch', 1, 'Errors', 0],
				]),
			),
		);
		expect(r.ok).toBe(true);
		// Retry on fail is v1's retry loop around the one call: 3 tries, 1000 ms apart.
		expect(r.source).toContain('for (let tryIndex = 0; tryIndex < 3; tryIndex++) {');
		expect(r.source).toContain('duration: 1000 });');
		expect(r.source).not.toContain('retry: { max: 2, delayMs: 1000 }');
		// The host gives the error output as v1 makes it; a failure of the whole node passes
		// the input on output 0 and fills no error item (v1's handleNodeExecutionError).
		expect(r.source).toContain(
			'for (const r of result[result.length - 1]?.items ?? []) fetchErrors.push(r);',
		);
		expect(r.source).toContain('for (const e of webhookItems) fetch.push(e);');
		expect(r.source).toContain('const onceFirstItem: Json[] = fetch.slice(0, 1);');
		// v1 adds the empty item when the node ran (its input had items) and output 0 is empty.
		expect(r.source).toContain('if (fetch.length > 0 && once.length === 0) once.push({});');
		expect(r.source).toContain('const errors: Json[] = fetchErrors;');
		expect(r.fallbackNodes).toEqual(['Fetch']);
	});

	it('passes an expression that only reads the item to the fallback host as raw text', () => {
		const r = convertWorkflow(
			wf(
				[
					webhookNode(),
					node('Format date', 'dateTime', 2, [200, 0], {
						value: '={{ $jmespath($json, "body.at") }}',
					}),
				],
				connect([['Webhook', 0, 'Format date', 0]]),
			),
		);
		expect(r.ok).toBe(true);
		expect(r.source).toContain('$jmespath($json, "body.at")');
	});

	it('runs a node whose expression reads other nodes and does not translate in the host, with run data', () => {
		const r = convertWorkflow(
			wf(
				[
					webhookNode(),
					node('Format date', 'dateTime', 2, [200, 0], {
						value: "={{ $('Webhook').item.json.at.toDateTime() }}",
					}),
				],
				connect([['Webhook', 0, 'Format date', 0]]),
			),
		);
		expect(r.ok).toBe(true);
		expect(r.diagnostics.find((d) => d.code === 'host-expression')?.node).toBe('Format date');
		// n8n evaluates the expression in the host, with the items of the Webhook node.
		expect(r.source).toContain('item.json.at.toDateTime() }}');
		expect(r.source).toMatch(/runs: \{ Webhook: \[\[webhookItems\]\] \}/);
		expect(r.fallbackNodes).toEqual(['Format date']);
	});

	it('runs a core node in the fallback host when its expression only reads the item', () => {
		const r = convertWorkflow(
			wf(
				[
					webhookNode(),
					node('Stamp', 'set', 3.4, [200, 0], {
						assignments: {
							assignments: [
								{
									id: 'a',
									name: 'at',
									value: '={{ $jmespath($json, "body.at") }}',
									type: 'string',
								},
							],
						},
						options: {},
					}),
				],
				connect([['Webhook', 0, 'Stamp', 0]]),
			),
		);
		expect(r.ok).toBe(true);
		expect(r.fallbackNodes).toEqual(['Stamp']);
		expect(r.diagnostics.map((d) => d.code)).toContain('fallback-degrade');
	});

	it('reports a stand-in trigger, pinned data and nodes that the trigger does not reach', () => {
		const r = convertWorkflow(
			wf(
				[
					node('Start', 'manualTrigger', 1, [0, 0]),
					node('A', 'noOp', 1, [200, 0]),
					node('Loose', 'noOp', 1, [200, 300]),
				],
				connect([['Start', 0, 'A', 0]]),
				{ pinData: { A: [{ json: {} }] } },
			),
		);
		expect(r.ok).toBe(true);
		expect(r.source).toContain('const start: Json[] = [trigger.body ?? {}];');
		expect(r.diagnostics.map((d) => d.code).sort()).toEqual([
			'pinned-data',
			'unreachable',
			'unsupported-trigger',
		]);
	});

	it.each([
		[
			'AI sub-nodes',
			wf(
				[
					webhookNode(),
					{ ...node('Agent', 'x', 1, [200, 0]), type: '@n8n/n8n-nodes-langchain.agent' },
					{ ...node('Model', 'x', 1, [200, 200]), type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
				],
				{
					...connect([['Webhook', 0, 'Agent', 0]]),
					Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
				},
			),
		],
		[
			'Python code',
			wf(
				[
					webhookNode(),
					node('Py', 'code', 2, [200, 0], { language: 'python', pythonCode: 'return items' }),
				],
				connect([['Webhook', 0, 'Py', 0]]),
			),
		],
		[
			'a second output of a fallback node',
			wf(
				[
					webhookNode(),
					node('Cmp', 'compareDatasets', 2.3, [200, 0]),
					node('X', 'noOp', 1, [400, 0]),
				],
				connect([
					['Webhook', 0, 'Cmp', 0],
					['Cmp', 1, 'X', 0],
				]),
			),
		],
	])('runs %s in the fallback host', (_name, input) => {
		const r = convertWorkflow(input);
		expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
		expect(r.fallbackNodes.length).toBeGreaterThan(0);
	});

	it('runs a library operation that the library does not have in the fallback host', () => {
		const r = convertWorkflow(
			wf(
				[
					webhookNode(),
					node('S', 'slack', 2.2, [200, 0], { resource: 'channel', operation: 'create' }),
				],
				connect([['Webhook', 0, 'S', 0]]),
			),
		);
		expect(r.ok).toBe(true);
		expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	});

	it('rejects input that is not a workflow', () => {
		expect(convertWorkflow({ nodes: 3 }).diagnostics[0].code).toBe('input');
		expect(convertWorkflow(wf([node('A', 'noOp', 1, [0, 0])], {})).diagnostics[0].code).toBe(
			'no-trigger',
		);
	});
});

describe('wfc convert', () => {
	it('writes the source and returns 0', () => {
		const dir = mkdtempSync(join(tmpdir(), 'wfc-convert-'));
		try {
			const input = join(dir, 'in.json');
			const output = join(dir, 'out.ts');
			writeFileSync(input, JSON.stringify(extraWorkflows['schedule-cron']));
			expect(runConvert([input, '-o', output])).toBe(0);
			expect(readFileSync(output, 'utf8')).toContain("schedule({ cron: '0 9 * * 1-5'");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe('credential types that the runtime cannot apply', () => {
	const httpWith = (credentialType: string) => ({
		name: 'Auth',
		nodes: [
			{
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Call',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [200, 0],
				parameters: {
					url: 'https://api.github.com/user',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: credentialType,
					options: {},
				},
				credentials: { [credentialType]: { id: '1', name: 'cred' } },
			},
		],
		connections: { Start: { main: [[{ node: 'Call', type: 'main', index: 0 }]] } },
	});

	it('runs an HTTP Request with a preAuthentication credential in the fallback host', () => {
		const r = convertWorkflow(httpWith('githubAppApi'));
		expect(r.ok).toBe(true);
		expect(r.fallbackNodes).toContain('Call');
	});

	it('runs an HTTP Request with an injectable credential natively', () => {
		const r = convertWorkflow(httpWith('githubApi'));
		expect(r.ok).toBe(true);
		expect(r.fallbackNodes).not.toContain('Call');
	});

	it('lists the types of every reason that the runtime cannot apply', () => {
		for (const type of ['githubAppApi', 'metabaseApi', 'aws', 'oAuth1Api', 'zendeskApi']) {
			expect(NOT_INJECTABLE.has(type)).toBe(true);
		}
	});
});
