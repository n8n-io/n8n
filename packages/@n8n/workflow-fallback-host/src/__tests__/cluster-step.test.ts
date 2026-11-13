/**
 * AI cluster steps: a root node with sub-nodes runs in the host as in n8n.
 *
 * - A Basic LLM Chain with a fake chat model sub-node (`FakeChatModel` of
 *   LangChain, the fake that n8n's own LangChain tests use; it echoes the prompt).
 * - An Agent version 3 with the real OpenAI chat model node and the Calculator
 *   tool, against a local server that answers as the OpenAI API. The agent asks
 *   for a tool call, the host runs the tool node, and the agent answers.
 */
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import type { INodeType, ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { disposeExpressionEngine, NodeStepRunner, parseNodeStepArgs } from '../node-step';
import { HostNodeTypes, langchainRoot } from '../node-types';
import type { JsonObject } from '../protocol';

const langchainRequire = createRequire(join(langchainRoot(), 'package.json'));

interface FakeModule {
	FakeChatModel: new (options: object) => object;
}

/** A chat model sub-node whose model answers with the text of the prompt. */
function fakeChatModelNode(): INodeType {
	return {
		description: {
			displayName: 'Fake Chat Model',
			name: 'fakeChatModel',
			group: ['transform'],
			version: 1,
			description: 'Test model',
			defaults: { name: 'Fake Chat Model' },
			inputs: [],
			outputs: [NodeConnectionTypes.AiLanguageModel],
			properties: [],
		},
		async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
			const testing = langchainRequire('@langchain/core/utils/testing') as FakeModule;
			return { response: new testing.FakeChatModel({}) };
		},
	};
}

function completion(message: Record<string, unknown>, finish: string) {
	return {
		id: 'chatcmpl-test',
		object: 'chat.completion',
		created: 1700000000,
		model: 'gpt-4o-mini',
		choices: [{ index: 0, message: { role: 'assistant', ...message }, finish_reason: finish }],
		usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
	};
}

async function readBody(request: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) chunks.push(Buffer.from(chunk));
	return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

describe('cluster steps', () => {
	const fakeType = 'test.fakeChatModel';
	let server: Server;
	let baseUrl = '';
	const requests: unknown[] = [];
	const answers: unknown[] = [];

	beforeAll(async () => {
		server = createServer((request, response) => {
			void readBody(request).then((body) => {
				requests.push(body);
				response.setHeader('content-type', 'application/json');
				response.end(JSON.stringify(answers.shift() ?? completion({ content: 'none' }, 'stop')));
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
		await disposeExpressionEngine();
	});

	const runner = () =>
		new NodeStepRunner({
			credentials: { get: async () => ({ apiKey: 'test-key', url: baseUrl }) },
			nodeTypes: new HostNodeTypes({ [fakeType]: fakeChatModelNode() }),
		});

	it('runs a chain with a fake chat model sub-node', async () => {
		const args = parseNodeStepArgs({
			name: 'Basic LLM Chain',
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			typeVersion: 1.5,
			parameters: { promptType: 'define', text: '={{ $json.question }}' },
			items: [{ question: 'Hi?' }, { question: 'Bye?' }],
			subNodes: [
				{
					name: 'Model',
					type: fakeType,
					typeVersion: 1,
					parameters: {},
					connection: 'ai_languageModel',
					target: 'Basic LLM Chain',
				},
			],
		});
		const result = await runner().run(args, { step: 'chain', key: 'k1' });
		// The sub-node expression reads the item, so each item gets its own prompt.
		expect(result).toEqual([{ text: 'Hi?' }, { text: 'Bye?' }]);
	});

	it('gives the run data of earlier nodes to the expressions of a cluster root', async () => {
		const args = parseNodeStepArgs({
			name: 'Basic LLM Chain',
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			typeVersion: 1.5,
			parameters: {
				promptType: 'define',
				text: "={{ $('Feeds').all().map((x) => x.json.title).join(', ') }} / {{ $('Feeds').item.json.title }}",
			},
			items: [{ title: 'b' }],
			runData: {
				nodes: [{ name: 'Feeds', type: 'n8n-nodes-base.noOp', typeVersion: 1, parameters: {} }],
				connections: [['Feeds', 0, 'Basic LLM Chain', 0]],
				runs: { Feeds: [[[{ title: 'a' }, { title: 'b' }]]] },
			},
			subNodes: [
				{
					name: 'Model',
					type: fakeType,
					typeVersion: 1,
					parameters: {},
					connection: 'ai_languageModel',
					target: 'Basic LLM Chain',
				},
			],
		});
		const result = await runner().run(args, { step: 'chain', key: 'k-run-data' });
		expect(result).toEqual([{ text: 'a, b / a' }]);
	});

	it('runs an agent that calls a tool node', async () => {
		requests.length = 0;
		answers.push(
			completion(
				{
					content: null,
					tool_calls: [
						{
							id: 'call_1',
							type: 'function',
							function: { name: 'Calculator', arguments: JSON.stringify({ input: '5*5' }) },
						},
					],
				},
				'tool_calls',
			),
			completion({ content: '5 times 5 equals 25.' }, 'stop'),
		);
		const args = parseNodeStepArgs({
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 3.1,
			parameters: { promptType: 'define', text: 'What is 5 times 5?' },
			items: [{}],
			subNodes: [
				{
					name: 'OpenAI Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					parameters: { model: { __rl: true, mode: 'id', value: 'gpt-4o-mini' }, options: {} },
					credential: 'openAi',
					connection: 'ai_languageModel',
					target: 'AI Agent',
				},
				{
					name: 'Calculator',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
					typeVersion: 1,
					parameters: {},
					connection: 'ai_tool',
					target: 'AI Agent',
				},
			],
		});
		const result = await runner().run({ ...args, subRuns: true }, { step: 'agent', key: 'k2' });
		// The outputs, then the runs of the sub-nodes, as n8n-core records them.
		expect(result[0]).toEqual({ items: [{ output: '5 times 5 equals 25.' }] });
		expect(result[1]).toEqual({
			subRuns: {
				'OpenAI Chat Model': [{ error: null }, { error: null }],
				Calculator: [{ error: null }],
			},
		});
		expect(requests).toHaveLength(2);
		// The second request carries the tool result of the Calculator node.
		const messages = (requests[1] as { messages: JsonObject[] }).messages;
		expect(messages.find((m) => m.role === 'tool')).toMatchObject({
			tool_call_id: 'call_1',
			content: expect.stringContaining('25'),
		});
	});

	it('runs a workflow tool whose callee runs on the v1 engine in the host', async () => {
		requests.length = 0;
		const callee = {
			name: 'Order status',
			nodes: [
				{
					id: 't',
					name: 'Start',
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: { inputSource: 'passthrough' },
				},
				{
					id: 's',
					name: 'Status',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {
						mode: 'manual',
						includeOtherFields: true,
						assignments: {
							assignments: [
								{
									id: '1',
									name: 'status',
									value: '={{ "shipped by " + $workflow.name }}',
									type: 'string',
								},
							],
						},
						options: {},
					},
				},
			],
			connections: { Start: { main: [[{ node: 'Status', type: 'main', index: 0 }]] } },
		};
		answers.push(
			completion(
				{
					content: null,
					tool_calls: [
						{
							id: 'call_1',
							type: 'function',
							function: { name: 'Order_Status', arguments: JSON.stringify({ orderId: 'A7' }) },
						},
					],
				},
				'tool_calls',
			),
			completion({ content: 'Order A7 is shipped.' }, 'stop'),
		);
		const args = parseNodeStepArgs({
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 3.1,
			parameters: { promptType: 'define', text: 'Where is order A7?' },
			items: [{}],
			subNodes: [
				{
					name: 'OpenAI Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
					parameters: { model: { __rl: true, mode: 'id', value: 'gpt-4o-mini' }, options: {} },
					credential: 'openAi',
					connection: 'ai_languageModel',
					target: 'AI Agent',
				},
				{
					name: 'Order Status',
					type: '@n8n/n8n-nodes-langchain.toolWorkflow',
					typeVersion: 2.2,
					parameters: {
						description: 'Gets the status of an order',
						source: 'parameter',
						workflowJson: JSON.stringify(callee),
						workflowInputs: {
							mappingMode: 'defineBelow',
							value: { orderId: "={{ $fromAI('orderId', 'The order id', 'string') }}" },
							matchingColumns: [],
							schema: [
								{
									id: 'orderId',
									displayName: 'orderId',
									required: false,
									defaultMatch: false,
									display: true,
									canBeUsedToMatch: true,
									type: 'string',
								},
							],
							attemptToConvertTypes: false,
							convertFieldsToString: false,
						},
					},
					connection: 'ai_tool',
					target: 'AI Agent',
				},
			],
		});
		const result = await runner().run(args, { step: 'agent', key: 'k3' });
		expect(result).toEqual([{ output: 'Order A7 is shipped.' }]);
		const messages = (requests[1] as { messages: JsonObject[] }).messages;
		expect(messages.find((m) => m.role === 'tool')).toMatchObject({
			tool_call_id: 'call_1',
			// The Set node of the callee ran: v1 evaluated its expression in the callee workflow.
			content: expect.stringContaining('shipped by Order status'),
		});
	});
});
