/**
 * Lowerings that run whole nodes in the fallback host: AI clusters, core nodes
 * with conditions that do not compile, nodes with several inputs or outputs,
 * HTTP Request features of the v1 node, Python code, and the test-data node.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { Fixture } from '../../reference/runner.ts';
import { runReference } from '../../reference/runner.ts';
import { compile } from '../../compiler/index.ts';
import { convertWorkflow } from '../index.ts';
import { connect, node, webhookNode } from './workflows.ts';

const LC = '@n8n/n8n-nodes-langchain.';

const wf = (nodes: unknown[], connections: unknown) => ({
	name: 'Test',
	nodes,
	connections,
	settings: { executionOrder: 'v1' },
});

const ai = (
	name: string,
	type: string,
	position: [number, number],
	parameters = {},
	extra = {},
) => ({
	...node(name, 'noOp', 1, position, parameters, extra),
	type: `${LC}${type}`,
});

function converted(workflow: unknown) {
	const r = convertWorkflow(workflow);
	const errors = r.diagnostics.filter((d) => d.severity === 'error');
	expect(errors).toEqual([]);
	return r;
}

describe('AI clusters', () => {
	const workflow = wf(
		[
			webhookNode(),
			node('Customer', 'set', 3.4, [100, 0], { assignments: { assignments: [] }, options: {} }),
			ai('AI Agent', 'agent', [200, 0], { promptType: 'define', text: '={{ $json.body.q }}' }),
			ai(
				'Model',
				'lmChatOpenAi',
				[200, 200],
				{ model: 'gpt-4o-mini' },
				{ credentials: { openAiApi: { id: '1', name: 'OpenAI account' } } },
			),
			ai(
				'Fallback Model',
				'lmChatOpenAi',
				[300, 200],
				{},
				{
					credentials: { openAiApi: { id: '1', name: 'OpenAI account' } },
				},
			),
			ai('Memory', 'memoryBufferWindow', [400, 200], {
				sessionKey: "={{ $('Customer').item.json.id }}",
			}),
			{
				...node('Search', 'httpRequestTool', 4.2, [500, 200], {
					url: "={{ $fromAI('url', 'The URL', 'string') }}",
					toolDescription: 'Search',
				}),
			},
			ai('Retriever', 'retrieverVectorStore', [600, 200]),
			ai('Store', 'vectorStoreInMemory', [600, 400], { mode: 'retrieve' }),
		],
		{
			...connect([
				['Webhook', 0, 'Customer', 0],
				['Customer', 0, 'AI Agent', 0],
			]),
			Model: { ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]] },
			'Fallback Model': {
				ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 1 }]],
			},
			Memory: { ai_memory: [[{ node: 'AI Agent', type: 'ai_memory', index: 0 }]] },
			Search: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
			Retriever: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
			Store: { ai_vectorStore: [[{ node: 'Retriever', type: 'ai_vectorStore', index: 0 }]] },
		},
	);

	it('sends the root and its sub-nodes in one host step', () => {
		const { source, fallbackNodes } = converted(workflow);
		expect(fallbackNodes).toContain('AI Agent');
		expect(source).toContain("type: '@n8n/n8n-nodes-langchain.agent'");
		expect(source).toContain('subNodes: [');
		// The host evaluates `$json` and `$fromAI(...)` as n8n does.
		expect(source).toContain("text: '={{ $json.body.q }}'");
		expect(source).toContain("url: '={{ $fromAI(\\'url\\', \\'The URL\\', \\'string\\') }}'");
		// A sub-node of a sub-node names its target.
		expect(source).toMatch(
			/name: 'Store',[\s\S]*?connection: 'ai_vectorStore',\s*target: 'Retriever'/,
		);
		// The fallback model is input 1 of the agent.
		expect(source).toMatch(/name: 'Fallback Model',[\s\S]*?targetIndex: 1/);
		// Sub-node credentials get slots.
		expect(source).toContain("credentials: { openAiAccount: { type: 'openAiApi' } }");
		expect(source).toContain("credential: 'openAiAccount'");
	});

	it('evaluates expressions that read other nodes before the call, for each item', () => {
		const { source } = converted(workflow);
		expect(source).not.toContain("$('Customer')");
		expect(source).toMatch(/for \(const \$json of customer\)/);
	});

	it('runs a LangChain node without sub-nodes in the host', () => {
		const { source } = converted(
			wf(
				[webhookNode(), ai('OpenAI', 'openAi', [200, 0], { resource: 'text', prompt: 'hi' })],
				connect([['Webhook', 0, 'OpenAI', 0]]),
			),
		);
		expect(source).toContain("type: '@n8n/n8n-nodes-langchain.openAi'");
		expect(source).not.toContain('subNodes');
	});

	it('keeps all outputs of a LangChain node with several outputs', () => {
		const { source } = converted(
			wf(
				[
					webhookNode(),
					ai('Classify', 'textClassifier', [200, 0]),
					node('A', 'noOp', 1, [400, 0]),
					node('B', 'noOp', 1, [400, 200]),
				],
				connect([
					['Webhook', 0, 'Classify', 0],
					['Classify', 0, 'A', 0],
					['Classify', 1, 'B', 0],
				]),
			),
		);
		expect(source).toContain("outputs: 'all'");
		expect(source).toContain('for (const r of result[1]?.items ?? []) classifyOutput1.push(r);');
	});
});

describe('workflow tools', () => {
	const callee = {
		id: '42',
		name: 'Order lookup',
		nodes: [
			node('Start', 'executeWorkflowTrigger', 1.1, [0, 0], { inputSource: 'passthrough' }),
			node(
				'Query',
				'postgres',
				2.5,
				[200, 0],
				{ operation: 'executeQuery', query: 'select 1' },
				{
					credentials: { postgres: { id: '9', name: 'Orders DB' } },
				},
			),
		],
		connections: connect([['Start', 0, 'Query', 0]]),
	};
	const agentWith = (workflowId: unknown) =>
		wf(
			[
				webhookNode(),
				ai('AI Agent', 'agent', [200, 0], { promptType: 'define', text: 'hi' }),
				ai('Lookup', 'toolWorkflow', [200, 200], { description: 'Find an order', workflowId }),
			],
			{
				...connect([['Webhook', 0, 'AI Agent', 0]]),
				Lookup: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
			},
		);

	it('embeds the callee that the resolver gives, with the slots of its credentials', () => {
		const r = convertWorkflow(agentWith({ __rl: true, mode: 'id', value: '42' }), {
			resolveWorkflow: (id) => (id === '42' ? callee : undefined),
		});
		expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
		expect(r.source).toContain("source: 'parameter'");
		expect(r.source).toContain('"credentials":{"postgres":{"id":"ordersDb","name":"ordersDb"}}');
		expect(r.source).toContain("slots: ['ordersDb']");
		expect(r.source).toContain("ordersDb: { type: 'postgres' }");
		expect(r.source).not.toContain('workflowId');
	});

	it('embeds the workflow itself for `$workflow.id`', () => {
		const r = converted(agentWith('={{ $workflow.id }}'));
		expect(r.source).toContain("source: 'parameter'");
		expect(r.source).toContain('workflowJson: \'{"name":"Test"');
	});
});

describe('core nodes that run whole in the host', () => {
	it('runs an If node with a computed regex pattern in the host, with both outputs', () => {
		const { source, diagnostics } = converted(
			wf(
				[
					webhookNode(),
					node('Check', 'if', 2.2, [200, 0], {
						conditions: {
							options: { caseSensitive: true, typeValidation: 'strict', version: 2 },
							conditions: [
								{
									leftValue: '={{ $json.body.code }}',
									rightValue: '={{ $json.body.pattern }}',
									operator: { type: 'string', operation: 'regex' },
								},
							],
							combinator: 'and',
						},
						options: {},
					}),
					node('Yes', 'noOp', 1, [400, 0]),
					node('No', 'noOp', 1, [400, 200]),
				],
				connect([
					['Webhook', 0, 'Check', 0],
					['Check', 0, 'Yes', 0],
					['Check', 1, 'No', 0],
				]),
			),
		);
		expect(diagnostics.some((d) => d.code === 'fallback-degrade' && d.node === 'Check')).toBe(true);
		expect(source).toContain("type: 'n8n-nodes-base.if'");
		expect(source).toContain("outputs: 'all'");
		expect(source).toContain("leftValue: '={{ $json.body.code }}'");
	});

	it('runs a node with two inputs and four outputs in the host', () => {
		const { source } = converted(
			wf(
				[
					webhookNode(),
					node('A', 'noOp', 1, [100, 0]),
					node('B', 'noOp', 1, [100, 200]),
					node('Compare', 'compareDatasets', 2.3, [300, 0], {
						mergeByFields: { values: [{ field1: 'id', field2: 'id' }] },
						options: {},
					}),
					node('Different', 'noOp', 1, [500, 400]),
				],
				connect([
					['Webhook', 0, 'A', 0],
					['Webhook', 0, 'B', 0],
					['A', 0, 'Compare', 0],
					['B', 0, 'Compare', 1],
					['Compare', 3, 'Different', 0],
				]),
			),
		);
		expect(source).toMatch(/inputs: \[a, b\]/);
		expect(source).toContain('for (const r of result[3]?.items ?? []) compareOutput3.push(r);');
	});

	it('runs an HTTP Request with a file response as the v1 node in the host', () => {
		const { source } = converted(
			wf(
				[
					webhookNode(),
					node('Download', 'httpRequest', 4.2, [200, 0], {
						url: 'https://example.com/a.pdf',
						options: { response: { response: { responseFormat: 'file' } } },
					}),
				],
				connect([['Webhook', 0, 'Download', 0]]),
			),
		);
		expect(source).toContain("host: 'fallback'");
		expect(source).toContain("responseFormat: 'file'");
	});

	it('runs a library node call that the library does not support in the host with its v1 parameters', () => {
		const blockId = {
			__rl: true,
			value: 'https://www.notion.so/Block-88188cbb303e4f44847f27d24bd7ad8e',
			mode: 'url',
		};
		const { source } = converted(
			wf(
				[
					webhookNode(),
					node('Notion', 'notion', 2.2, [200, 0], {
						resource: 'block',
						blockId,
						blockUi: { blockValues: [{ type: 'heading_1', textContent: 'h1' }] },
					}),
				],
				connect([['Webhook', 0, 'Notion', 0]]),
			),
		);
		expect(source).toContain("host: 'fallback'");
		// The v1 node reads the resource locator itself (`extractValue`).
		expect(source).toContain("mode: 'url'");
	});

	it('keeps the "execute once" list when the node falls back to the host', () => {
		const r = converted(
			wf(
				[
					webhookNode(),
					node(
						'Set',
						'set',
						3.4,
						[200, 0],
						{
							assignments: {
								assignments: [
									{ id: 'a', name: 'x', value: "={{ $evaluateExpression('1') }}", type: 'string' },
								],
							},
							options: {},
						},
						{ executeOnce: true },
					),
				],
				connect([['Webhook', 0, 'Set', 0]]),
			),
		);
		expect(r.source).toContain('const setFirstItem: Json[] = webhookItems.slice(0, 1);');
		expect(compile(r.source, { fileName: '/workflow.ts' }).ok).toBe(true);
	});

	it('gives every node that ran before to code that reads a node by a computed name', () => {
		const { source } = converted(
			wf(
				[
					webhookNode(),
					node('A', 'noOp', 1, [200, 0]),
					node('Code', 'code', 2, [400, 0], {
						// `require` keeps the code in the host.
						jsCode: "const c = require('crypto'); const n = 'A'; return $(n).all();",
					}),
				],
				connect([
					['Webhook', 0, 'A', 0],
					['A', 0, 'Code', 0],
				]),
			),
		);
		expect(source).toContain('$nodes: {');
		expect(source).toContain('"A": a');
	});

	it('gives `$execution` to a Code step from ctx.execution()', () => {
		const { source } = converted(
			wf(
				[
					webhookNode(),
					node('Code', 'code', 2, [200, 0], {
						jsCode: "const h = require('crypto'); return [{ id: $execution.id, h: !!h }];",
					}),
				],
				connect([['Webhook', 0, 'Code', 0]]),
			),
		);
		expect(source).toContain('$execution: ctx.execution()');
	});

	it('keeps the resource locator of a Sheets tab, whose mode the library node reads', () => {
		const { source } = converted(
			wf(
				[
					webhookNode(),
					node('Rows', 'googleSheets', 4.7, [200, 0], {
						documentId: { __rl: true, mode: 'id', value: 'doc1' },
						sheetName: { __rl: true, mode: 'name', value: 'Sheet1' },
						options: {},
					}),
				],
				connect([['Webhook', 0, 'Rows', 0]]),
			),
		);
		expect(source).toContain("sheetName: { __rl: true, mode: 'name', value: 'Sheet1' }");
	});

	it('gives an HTTP Request the credential that its parameters name', () => {
		const r = converted(
			wf(
				[
					webhookNode(),
					node(
						'Orders',
						'httpRequest',
						4.4,
						[200, 0],
						{
							url: 'https://shop.example/orders.json',
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'shopifyOAuth2Api',
						},
						{
							credentials: {
								httpHeaderAuth: { id: 'h', name: 'Header' },
								shopifyOAuth2Api: { id: 's', name: 'Shop' },
							},
						},
					),
				],
				connect([['Webhook', 0, 'Orders', 0]]),
			),
		);
		expect(Object.values(r.credentials ?? {}).map((c) => c.type)).toEqual(['shopifyOAuth2Api']);
	});

	it('gives `$json` (the first item) to a Code node in "all items" mode, as n8n does', () => {
		const { source } = converted(
			wf(
				[
					webhookNode(),
					node('Code', 'code', 2, [200, 0], {
						jsCode: "const h = require('crypto'); return [{ a: $json.body, h: !!h }];",
					}),
				],
				connect([['Webhook', 0, 'Code', 0]]),
			),
		);
		expect(source).toContain('const $json = items[0]?.json;');
	});

	it('lets a host node with "continue on fail" handle its errors for each item, as in v1', () => {
		const { source } = converted(
			wf(
				[
					webhookNode(),
					node(
						'Query',
						'googleBigQuery',
						2,
						[200, 0],
						{ sqlQuery: 'SELECT 1' },
						{ continueOnFail: true },
					),
				],
				connect([['Webhook', 0, 'Query', 0]]),
			),
		);
		expect(source).toContain("onError: 'continueRegularOutput'");
	});
});

describe('Respond to Webhook with binary data', () => {
	it('sends the file of the first item with `binary`', () => {
		const { source } = converted(
			wf(
				[
					{ ...webhookNode('file', 'responseNode') },
					node('Respond', 'respondToWebhook', 1.1, [200, 0], {
						respondWith: 'binary',
						responseDataSource: 'set',
						inputFieldName: 'report',
						options: {},
					}),
				],
				connect([['Webhook', 0, 'Respond', 0]]),
			),
		);
		expect(source).toMatch(/const respondFile: Json = \(\$json\.\$binary \?\? \{\}\)\['report'\];/);
		expect(source).toContain(
			'binary: { data: respondFile.data, mimeType: respondFile.mimeType, fileName: respondFile.fileName }',
		);
	});
});

describe('test data node', () => {
	const testData = (data: unknown) => ({
		...node('Data', 'noOp', 1, [200, 0], { data }),
		type: 'n8n-nodes-testing.testData',
	});

	it('writes literal items once', () => {
		const { source, fallbackNodes } = converted(
			wf([webhookNode(), testData('[{"a":1},{"a":2}]')], connect([['Webhook', 0, 'Data', 0]])),
		);
		expect(fallbackNodes).toEqual([]);
		expect(source).toMatch(
			/const data: Json\[\] = \w+\.length > 0 \? \[\{ a: 1 \}, \{ a: 2 \}\] : \[\];/,
		);
	});

	it('reads an expression for item 0', () => {
		const { source } = converted(
			wf([webhookNode(), testData('={{ $json.body.rows }}')], connect([['Webhook', 0, 'Data', 0]])),
		);
		expect(source).toMatch(/const \$json = \w+\[0\];/);
	});
});

const hostSource = join(
	dirname(fileURLToPath(import.meta.url)),
	'../../../../workflow-fallback-host/src',
);
const hasPython = spawnSync('python3', ['--version']).status === 0;

describe.skipIf(!hasPython)('Python code', () => {
	it('runs the converted code in the host with the names of n8n’s Python runner', async () => {
		const workflow = wf(
			[
				webhookNode(),
				node('All', 'code', 2, [200, 0], {
					language: 'pythonNative',
					pythonCode: 'return [{"json": {"n": i["json"]["body"]["n"] * 2}} for i in _items]',
				}),
				node('Each', 'code', 2, [400, 0], {
					language: 'pythonNative',
					mode: 'runOnceForEachItem',
					pythonCode: '_item["json"]["seen"] = True\nreturn _item',
				}),
			],
			connect([
				['Webhook', 0, 'All', 0],
				['All', 0, 'Each', 0],
			]),
		);
		const { source } = converted(workflow);
		expect(source).toContain("language: 'python'");
		const { runPythonStep } = (await import(join(hostSource, 'python-step.ts'))) as {
			runPythonStep: (
				a: { name: string; code: string; items: unknown[] },
				o: { timeoutMs: number },
			) => unknown[];
		};
		const effects: Fixture['effects'] = {};
		const fixture: Fixture = {
			trigger: { body: { n: 21 }, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects,
		};
		let out = await runReference(source, fixture);
		for (let round = 0; round < 4; round++) {
			const pending = out.effects.find((e) => e.kind === 'code' && effects[e.step] === undefined);
			if (!pending) break;
			const args = pending.args as { name: string; code: string; items: unknown[] };
			effects[pending.step] = [runPythonStep(args, { timeoutMs: 5000 })];
			out = await runReference(source, fixture);
		}
		expect(out.result).toEqual({ Each: [{ n: 42, seen: true }] });
	});
});
