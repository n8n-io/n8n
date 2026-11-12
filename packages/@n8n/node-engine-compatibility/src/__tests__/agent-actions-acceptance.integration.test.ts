import { createRequire } from 'node:module';

import { createDataSource } from '@n8n/engine';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	ISupplyDataFunctions,
	IVersionedNodeType,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
	converter,
	mainTo,
	makeRunWorkflow,
	realNodeTypes,
	setNode,
	TRIGGER,
} from './acceptance-fixtures';
import { v1Workflow } from './fixtures';

/*
 * The AI nodes come from the nodes-langchain build. Its export map hides the
 * node files, and LangChain must be the copy the nodes use: a second copy of
 * `@langchain/core` would not know the messages of the first.
 */
const langchainRequire = createRequire(
	createRequire(__filename).resolve('@n8n/n8n-nodes-langchain/package.json'),
);
const { Agent } = langchainRequire('./dist/nodes/agents/Agent/Agent.node') as {
	Agent: new () => IVersionedNodeType;
};
const { ToolCalculator } = langchainRequire(
	'./dist/nodes/tools/ToolCalculator/ToolCalculator.node',
) as { ToolCalculator: new () => INodeType };

type LangChainMessage = { _getType(): string; content: unknown };
type ToolCall = { id: string; name: string; args: Record<string, unknown> };
const { BaseChatModel } = langchainRequire('@langchain/core/language_models/chat_models') as {
	BaseChatModel: new (fields: object) => object;
};
const { AIMessage } = langchainRequire('@langchain/core/messages') as {
	AIMessage: new (fields: { content: string; tool_calls?: ToolCall[] }) => LangChainMessage;
};

/**
 * A chat model that asks for the calculator until the prompt holds
 * `toolRounds` tool results, and then answers with the last one. It reads its
 * place in the script from the prompt, because the agent builds a new model in
 * every round.
 */
class ScriptedChatModel extends BaseChatModel {
	constructor(private readonly toolRounds: number) {
		super({});
	}

	_llmType() {
		return 'scripted';
	}

	bindTools() {
		return this;
	}

	async _generate(messages: LangChainMessage[]) {
		const toolResults = messages.filter((message) => message._getType() === 'tool');
		const message =
			toolResults.length >= this.toolRounds
				? new AIMessage({ content: `The answer is ${String(toolResults.at(-1)?.content)}` })
				: new AIMessage({
						content: '',
						tool_calls: [
							{
								id: `call-${toolResults.length + 1}`,
								// A tool node's tool name is its node name.
								name: 'Calculator',
								args: { input: `${toolResults.length + 2} + 2` },
							},
						],
					});
		return await Promise.resolve({
			generations: [{ text: typeof message.content === 'string' ? message.content : '', message }],
		});
	}
}

class LmChatScripted implements INodeType {
	description = {
		displayName: 'Scripted Chat Model',
		name: 'lmChatScripted',
		group: ['transform'],
		version: 1,
		description: 'Answers from a script',
		defaults: { name: 'Scripted Chat Model' },
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		properties: [{ displayName: 'Tool Rounds', name: 'toolRounds', type: 'number', default: 1 }],
	} as unknown as INodeTypeDescription;

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		const toolRounds = this.getNodeParameter('toolRounds', 0, 1) as number;
		return await Promise.resolve({ response: new ScriptedChatModel(toolRounds) });
	}
}

const aiNodes = new Map<string, INodeType | IVersionedNodeType>([
	['@n8n/n8n-nodes-langchain.agent', new Agent()],
	['@n8n/n8n-nodes-langchain.toolCalculator', new ToolCalculator()],
	['test.lmChatScripted', new LmChatScripted()],
]);

const nodeTypes: INodeTypes = {
	getByName: (type) => aiNodes.get(type) ?? realNodeTypes.getByName(type),
	getByNameAndVersion: (type, version) => {
		const found = aiNodes.get(type);
		if (!found) return realNodeTypes.getByNameAndVersion(type, version);
		return NodeHelpers.getVersionedNodeType(found, version);
	},
	getKnownTypes: (): IDataObject => ({}),
};

/**
 * Trigger → AI Agent → After, with a chat model and a calculator attached to
 * the agent.
 */
function agentWorkflow(toolRounds = 1) {
	return converter.convert(
		v1Workflow(
			[
				TRIGGER,
				{
					id: 'agent',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 3.1,
					parameters: { promptType: 'define', text: 'What is 2 + 2?', options: {} },
				},
				{
					id: 'model',
					name: 'Scripted Model',
					type: 'test.lmChatScripted',
					parameters: { toolRounds },
				},
				{
					id: 'calculator',
					name: 'Calculator',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
				},
				setNode('after', 'After', [
					{ name: 'answer', value: '={{ $json.output }}', type: 'string' },
				]),
			],
			{
				'When clicking Execute': mainTo('AI Agent'),
				'AI Agent': mainTo('After'),
				'Scripted Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
				Calculator: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
			},
		),
	);
}

describe('agent actions acceptance (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: ReturnType<typeof createDataSource>;

	beforeAll(async () => {
		container = await new PostgreSqlContainer('postgres:18-alpine').start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	const runWorkflow = makeRunWorkflow(() => dataSource);

	it('runs the AI Agent: the calculator runs as a spawned step, and the agent continues with its result', async () => {
		const { execution, steps, byNode } = await runWorkflow(
			agentWorkflow(),
			[[{ json: { question: 'sum' } }]],
			'manual',
			{ nodeTypes },
		);

		// The step states say where it failed, so a failing run reads as one.
		const states = steps.map(({ nodeId, kind, status, error }) => [nodeId, kind, status, error]);
		expect(execution.status, JSON.stringify(states)).toBe('completed');

		// One graph step for the agent, with the final answer of the last round.
		const agent = steps.filter((step) => step.nodeId === 'agent');
		expect(agent).toHaveLength(1);
		expect(agent[0]).toMatchObject({
			kind: 'graph',
			status: 'completed',
			outputs: [
				[expect.objectContaining({ json: { output: 'The answer is [{"response":"4"}]' } })],
			],
		});

		// One spawned step for the calculator, on the merged input item.
		const spawned = steps.filter((step) => step.kind === 'spawned');
		expect(spawned).toHaveLength(1);
		expect(spawned[0]).toMatchObject({
			nodeId: 'calculator',
			status: 'completed',
			declaringStepId: agent[0].id,
			round: 0,
			callId: 'call-1',
			outputs: [[expect.objectContaining({ json: { response: '4' } })]],
		});

		// The round that ended with the tool call, with the agent's payload.
		const rounds = (await dataSource.query(
			'SELECT round, actions, payload FROM workflow_step_round WHERE step_id = $1',
			[agent[0].id],
		)) as Array<{ round: number; actions: unknown[]; payload: unknown }>;
		expect(rounds).toEqual([
			{
				round: 0,
				actions: [
					expect.objectContaining({
						targetNodeId: 'calculator',
						callId: 'call-1',
						itemIndex: 0,
						arguments: { input: '2 + 2' },
					}),
				],
				payload: expect.objectContaining({ previousRequests: [], iterationCount: 1 }),
			},
		]);

		// The successor runs once, on the agent's final output.
		expect(byNode('after')?.outputs).toEqual([
			[expect.objectContaining({ json: { answer: 'The answer is [{"response":"4"}]' } })],
		]);
	});

	it('runs the AI Agent over two tool rounds: the second round reads the first from its JSON payload', async () => {
		const { execution, steps } = await runWorkflow(
			agentWorkflow(2),
			[[{ json: { question: 'sum' } }]],
			'manual',
			{ nodeTypes },
		);

		const states = steps.map(({ nodeId, kind, status, error }) => [nodeId, kind, status, error]);
		expect(execution.status, JSON.stringify(states)).toBe('completed');

		const agent = steps.find((step) => step.nodeId === 'agent');
		expect(agent?.outputs).toEqual([
			[expect.objectContaining({ json: { output: 'The answer is [{"response":"5"}]' } })],
		]);

		const spawned = steps
			.filter((step) => step.kind === 'spawned')
			.sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
		expect(spawned.map(({ round, callId, outputs }) => ({ round, callId, outputs }))).toEqual([
			{
				round: 0,
				callId: 'call-1',
				outputs: [[expect.objectContaining({ json: { response: '4' } })]],
			},
			{
				round: 1,
				callId: 'call-2',
				outputs: [[expect.objectContaining({ json: { response: '5' } })]],
			},
		]);

		// The second round's payload carries the first tool call as the agent's own
		// step, with LangChain messages in their JSON form.
		const [round1] = (await dataSource.query(
			'SELECT payload FROM workflow_step_round WHERE step_id = $1 AND round = 1',
			[agent?.id],
		)) as Array<{ payload: { previousRequests: Array<{ action: { messageLog: unknown[] } }> } }>;
		expect(round1.payload.previousRequests).toHaveLength(1);
		expect(round1.payload.previousRequests[0].action.messageLog[0]).toMatchObject({
			lc: 1,
			type: 'constructor',
		});
	});
});
