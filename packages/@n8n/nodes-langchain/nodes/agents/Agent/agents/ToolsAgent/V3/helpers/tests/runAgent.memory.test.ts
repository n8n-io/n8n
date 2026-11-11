import type { AgentRunnableSequence } from '@langchain/classic/agents';
import { BufferWindowMemory } from '@langchain/classic/memory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage } from '@langchain/core/messages';
import type {
	EngineRequest,
	EngineResponse,
	IDataObject,
	IExecuteFunctions,
	INode,
	IWorkflowMetadata,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	buildSteps,
	processHitlResponses,
	type RequestResponseMetadata,
	type ToolCallRequest,
} from '@utils/agent-execution';

import type { ItemContext } from '../prepareItemContext';
import { runAgent } from '../runAgent';

// Drives runAgent through the same engine round-trips as executeBatch, with the real
// buildSteps, saveToMemory and an in-memory chat history, to check what one turn stores.

type Round = ToolCallRequest[] | { returnValues: { output: string } };

const tools = [
	{ name: 'tool_a', metadata: { sourceNodeName: 'Tool A' } },
	{ name: 'tool_b', metadata: { sourceNodeName: 'Tool B' } },
	{ name: 'tool_c', metadata: { sourceNodeName: 'Tool C' } },
	{ name: 'tool_d', metadata: { sourceNodeName: 'Tool D' } },
	{ name: 'gated_tool', metadata: { sourceNodeName: 'Approval', gatedToolNodeName: 'Gated Tool' } },
] as unknown as ItemContext['tools'];

const toolRound = (...calls: Array<[tool: string, id: string]>): ToolCallRequest[] => {
	// Parallel calls share one model message, which LangChain puts on the first call only
	const message = new AIMessage({
		content: '',
		tool_calls: calls.map(([name, id]) => ({ id, name, args: {}, type: 'tool_call' as const })),
	});
	return calls.map(([tool, toolCallId], i) => ({
		tool,
		toolInput: tool === 'gated_tool' ? { toolParameters: { q: 1 } } : {},
		toolCallId,
		type: 'tool_call',
		messageLog: i === 0 ? [message] : [],
	}));
};

const finalAnswer = (output: string): Round => ({ returnValues: { output } });

/** Answers each requested action as the engine would after running the tool node. */
const engineResponse = (
	request: EngineRequest<RequestResponseMetadata>,
	json: (action: EngineRequest<RequestResponseMetadata>['actions'][number]) => IDataObject = (
		a,
	) => ({
		result: `${a.nodeName} result`,
	}),
): EngineResponse<RequestResponseMetadata> => ({
	actionResponses: request.actions.map((action) => ({
		action,
		data: {
			data: { ai_tool: [[{ json: json(action) }]] },
			executionTime: 0,
			startTime: 0,
			executionIndex: 0,
			source: [],
		},
	})),
	metadata: request.metadata,
});

const describeMessages = (messages: BaseMessage[]) =>
	messages.map((m) => {
		const toolCalls = (m as AIMessage).tool_calls ?? [];
		if (toolCalls.length > 0) return `ai:${toolCalls.map((c) => c.id).join(',')}`;
		if (m.getType() === 'tool')
			return `tool:${(m as unknown as { tool_call_id: string }).tool_call_id}`;
		return `${m.getType()}:${String(m.content)}`;
	});

describe('runAgent - chat memory across tool-calling rounds', () => {
	let memory: BufferWindowMemory;
	const ctx = mock<IExecuteFunctions>();

	beforeEach(() => {
		memory = new BufferWindowMemory({
			k: 100,
			memoryKey: 'chat_history',
			inputKey: 'input',
			outputKey: 'output',
			returnMessages: true,
		});
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		ctx.getWorkflow.mockReturnValue(mock<IWorkflowMetadata>({ name: 'Test Workflow' }));
		ctx.getExecutionCancelSignal.mockReturnValue(new AbortController().signal);
	});

	const storedMessages = async () => describeMessages(await memory.chatHistory.getMessages());

	/** Runs one item through runAgent until it answers, as executeBatch would. */
	const runTurn = async (
		input: string,
		rounds: Round[],
		onRequest: (
			request: EngineRequest<RequestResponseMetadata>,
		) => EngineResponse<RequestResponseMetadata> = (request) => engineResponse(request),
	) => {
		const invoke = vi.fn();
		for (const round of rounds) invoke.mockResolvedValueOnce(round);
		const executor = mock<AgentRunnableSequence>({
			withConfig: vi.fn().mockReturnValue({ invoke }),
		});

		let response: EngineResponse<RequestResponseMetadata> | undefined;
		for (let i = 0; i < rounds.length + 2; i++) {
			const hitl = processHitlResponses(response, 0);
			if (hitl.pendingGatedToolRequest) {
				response = onRequest(hitl.pendingGatedToolRequest);
				continue;
			}
			const itemContext: ItemContext = {
				itemIndex: 0,
				input,
				steps: buildSteps(hitl.processedResponse, 0),
				tools,
				prompt: mock(),
				options: { maxIterations: 10, returnIntermediateSteps: false, enableStreaming: false },
				outputParser: undefined,
			};
			const result = await runAgent(
				ctx,
				executor,
				itemContext,
				mock<BaseChatModel>(),
				memory,
				hitl.processedResponse,
			);
			if (!('actions' in result)) return { result, invoke };
			response = onRequest(result);
		}
		throw new Error('The agent did not finish the turn');
	};

	it('should store every tool-calling round of a turn', async () => {
		await runTurn('Do the thing', [
			toolRound(['tool_a', 'call_a']),
			toolRound(['tool_b', 'call_b'], ['tool_c', 'call_c']),
			finalAnswer('Done'),
		]);

		expect(await storedMessages()).toEqual([
			'human:Do the thing',
			'ai:call_a',
			'tool:call_a',
			// Without provider signatures, buildSteps gives each parallel call its own AI message
			'ai:call_b',
			'tool:call_b',
			'ai:call_c',
			'tool:call_c',
			'ai:Done',
		]);
	});

	it('should append the second turn once and give the model the full first turn', async () => {
		await runTurn('First', [
			toolRound(['tool_a', 'call_a']),
			toolRound(['tool_b', 'call_b']),
			finalAnswer('First done'),
		]);
		const { invoke } = await runTurn('Second', [
			toolRound(['tool_c', 'call_c']),
			toolRound(['tool_d', 'call_d']),
			finalAnswer('Second done'),
		]);

		const firstTurn = [
			'human:First',
			'ai:call_a',
			'tool:call_a',
			'ai:call_b',
			'tool:call_b',
			'ai:First done',
		];
		expect(describeMessages(invoke.mock.calls[0][0].chat_history)).toEqual(firstTurn);
		expect(await storedMessages()).toEqual([
			...firstTurn,
			'human:Second',
			'ai:call_c',
			'tool:call_c',
			'ai:call_d',
			'tool:call_d',
			'ai:Second done',
		]);
	});

	it('should store the rounds before and after an approval exactly once', async () => {
		await runTurn(
			'Delete the record',
			[
				toolRound(['tool_a', 'call_a']),
				toolRound(['gated_tool', 'call_gated']),
				toolRound(['tool_b', 'call_b']),
				finalAnswer('Deleted'),
			],
			// The approval node answers the gated call; the engine then runs the gated tool
			(request) =>
				engineResponse(request, (action) =>
					action.metadata?.hitl ? { approved: true } : { result: `${action.nodeName} result` },
				),
		);

		expect(await storedMessages()).toEqual([
			'human:Delete the record',
			'ai:call_a',
			'tool:call_a',
			'ai:call_gated',
			'tool:call_gated',
			'ai:call_b',
			'tool:call_b',
			'ai:Deleted',
		]);
	});
});
