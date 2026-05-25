import type { DynamicStructuredTool } from '@langchain/classic/tools';
import { NodeConnectionTypes, NodeOperationError, UserError } from 'n8n-workflow';
import type {
	EngineRequest,
	EngineResponse,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { RequestResponseMetadata, ToolMetadata } from '@utils/agent-execution';

import { getTools } from '../../../common';
import { resolveSubAgentRequest } from '../resolveSubAgentRequest';

vi.mock('../../../common', () => ({
	getTools: vi.fn(),
}));

const mockedGetTools = vi.mocked(getTools);

type MockedAction = EngineRequest<RequestResponseMetadata>['actions'][number];

function makeAction(overrides: Partial<MockedAction> = {}): MockedAction {
	return {
		actionType: 'ExecutionNodeAction',
		nodeName: 'ToolNode',
		input: { query: 'hello' },
		type: NodeConnectionTypes.AiTool,
		id: 'call_1',
		metadata: { itemIndex: 0 },
		...overrides,
	};
}

function makeTool(
	name: string,
	sourceNodeName: string,
	invokeImpl: (args: unknown) => unknown | Promise<unknown>,
	extraMetadata: Partial<ToolMetadata> = {},
): DynamicStructuredTool {
	const tool = {
		name,
		description: 'test',
		metadata: { sourceNodeName, ...extraMetadata } as ToolMetadata,
		invoke: vi.fn(async (args: unknown) => await invokeImpl(args)),
	} as unknown as DynamicStructuredTool;
	return tool;
}

function makeRequest(actions: MockedAction[]): EngineRequest<RequestResponseMetadata> {
	return { actions, metadata: { iterationCount: 1 } };
}

function makeCtx(): { ctx: ISupplyDataFunctions; node: INode; abortSignal: AbortController } {
	const node = mock<INode>({ name: 'sub-agent', id: 'node-1' });
	const abortController = new AbortController();
	const ctx = mock<ISupplyDataFunctions>();
	ctx.getNode.mockReturnValue(node);
	ctx.getExecutionCancelSignal = vi.fn(() => abortController.signal) as never;
	return { ctx, node, abortSignal: abortController };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('resolveSubAgentRequest', () => {
	it('resolves a single non-HITL action by invoking the matched tool and returns the agent output', async () => {
		const { ctx } = makeCtx();
		const tool = makeTool('TestTool', 'ToolNode', () => 'tool-output');
		mockedGetTools.mockResolvedValue([tool]);

		const finalOutput: INodeExecutionData[][] = [[{ json: { output: 'all done' } }]];
		const runAgentBatch = vi.fn(async () => finalOutput);

		const request = makeRequest([makeAction({ nodeName: 'ToolNode' })]);
		const result = await resolveSubAgentRequest(ctx, request, { runAgentBatch });

		expect(tool.invoke).toHaveBeenCalledTimes(1);
		expect(tool.invoke).toHaveBeenCalledWith({ query: 'hello' });
		expect(runAgentBatch).toHaveBeenCalledTimes(1);
		expect(runAgentBatch).toHaveBeenCalledWith(
			expect.objectContaining({
				actionResponses: expect.arrayContaining([
					expect.objectContaining({
						action: expect.objectContaining({ id: 'call_1' }),
						data: expect.objectContaining({
							executionStatus: 'success',
							data: {
								ai_tool: [[{ json: { output: 'tool-output' } }]],
							},
						}),
					}),
				]),
				metadata: { iterationCount: 1 },
			}),
		);
		expect(result).toBe(finalOutput);
	});

	it('preserves action ordering when multiple actions resolve in parallel out of order', async () => {
		const { ctx } = makeCtx();
		const slowTool = makeTool(
			'Slow',
			'SlowNode',
			async () => await new Promise((resolve) => setTimeout(() => resolve('slow-result'), 30)),
		);
		const fastTool = makeTool('Fast', 'FastNode', async () => 'fast-result');
		mockedGetTools.mockResolvedValue([slowTool, fastTool]);

		const actions: MockedAction[] = [
			makeAction({ id: 'a', nodeName: 'SlowNode' }),
			makeAction({ id: 'b', nodeName: 'FastNode' }),
		];

		const runAgentBatch = vi.fn(async (response: EngineResponse<RequestResponseMetadata>) => {
			// Assert ordering at the moment of consumption.
			expect(response.actionResponses[0].action.id).toBe('a');
			expect(response.actionResponses[1].action.id).toBe('b');
			expect(response.actionResponses[0].data?.data?.ai_tool?.[0]?.[0]?.json).toEqual({
				output: 'slow-result',
			});
			expect(response.actionResponses[1].data?.data?.ai_tool?.[0]?.[0]?.json).toEqual({
				output: 'fast-result',
			});
			return [[{ json: { output: 'done' } }]];
		});

		await resolveSubAgentRequest(ctx, makeRequest(actions), { runAgentBatch });

		expect(runAgentBatch).toHaveBeenCalledTimes(1);
	});

	it('throws a UserError naming the offending node when a HITL action is requested', async () => {
		const { ctx } = makeCtx();
		mockedGetTools.mockResolvedValue([]);

		const hitlAction = makeAction({
			nodeName: 'ApprovalGate',
			metadata: {
				itemIndex: 0,
				hitl: {
					gatedToolNodeName: 'Database',
					toolName: 'Database',
					originalInput: {},
				},
			},
		});

		const runAgentBatch = vi.fn();

		await expect(
			resolveSubAgentRequest(ctx, makeRequest([hitlAction]), { runAgentBatch }),
		).rejects.toThrow(UserError);
		await expect(
			resolveSubAgentRequest(ctx, makeRequest([hitlAction]), { runAgentBatch }),
		).rejects.toThrow(/ApprovalGate/);

		expect(runAgentBatch).not.toHaveBeenCalled();
	});

	it('catches tool errors and surfaces them as NodeOperationError ITaskData so the LLM can recover', async () => {
		const { ctx } = makeCtx();
		const failingTool = makeTool('Failing', 'ToolNode', () => {
			throw new Error('upstream failure');
		});
		mockedGetTools.mockResolvedValue([failingTool]);

		let capturedResponse: EngineResponse<RequestResponseMetadata> | undefined;
		const runAgentBatch = vi.fn(async (response: EngineResponse<RequestResponseMetadata>) => {
			capturedResponse = response;
			return [[{ json: { output: 'recovered' } }]];
		});

		await resolveSubAgentRequest(ctx, makeRequest([makeAction()]), { runAgentBatch });

		expect(capturedResponse?.actionResponses).toHaveLength(1);
		const errorResponse = capturedResponse!.actionResponses[0];
		expect(errorResponse.data?.executionStatus).toBe('error');
		expect(errorResponse.data?.error).toBeInstanceOf(NodeOperationError);
		expect(errorResponse.data?.error?.message).toContain('upstream failure');
	});

	it('loops until the sub-agent stops returning an EngineRequest', async () => {
		const { ctx } = makeCtx();
		const tool = makeTool('TestTool', 'ToolNode', async () => 'partial');
		mockedGetTools.mockResolvedValue([tool]);

		const followUpRequest = makeRequest([makeAction({ id: 'call_2', nodeName: 'ToolNode' })]);
		const finalOutput: INodeExecutionData[][] = [[{ json: { output: 'final' } }]];

		const runAgentBatch = vi
			.fn()
			.mockResolvedValueOnce(followUpRequest)
			.mockResolvedValueOnce(finalOutput);

		const result = await resolveSubAgentRequest(ctx, makeRequest([makeAction()]), {
			runAgentBatch,
		});

		expect(runAgentBatch).toHaveBeenCalledTimes(2);
		expect(tool.invoke).toHaveBeenCalledTimes(2);
		expect(result).toBe(finalOutput);
	});

	it('honors cancellation: aborts before invoking tools if the cancel signal is already aborted', async () => {
		const { ctx, abortSignal } = makeCtx();
		abortSignal.abort();
		const tool = makeTool('TestTool', 'ToolNode', () => 'should-not-run');
		mockedGetTools.mockResolvedValue([tool]);

		const runAgentBatch = vi.fn();

		await expect(
			resolveSubAgentRequest(ctx, makeRequest([makeAction()]), { runAgentBatch }),
		).rejects.toThrow();

		expect(tool.invoke).not.toHaveBeenCalled();
		expect(runAgentBatch).not.toHaveBeenCalled();
	});

	it('propagates maxIterations errors from runAgentBatch unchanged', async () => {
		const { ctx } = makeCtx();
		const tool = makeTool('TestTool', 'ToolNode', async () => 'ok');
		mockedGetTools.mockResolvedValue([tool]);

		const maxIterationsError = new NodeOperationError(
			mock<INode>(),
			'Max iterations (10) reached. The agent could not complete the task within the allowed number of iterations.',
		);
		const runAgentBatch = vi.fn().mockRejectedValue(maxIterationsError);

		await expect(
			resolveSubAgentRequest(ctx, makeRequest([makeAction()]), { runAgentBatch }),
		).rejects.toBe(maxIterationsError);
	});

	it('strips the toolkit `tool` marker from input before invoking the matching toolkit tool', async () => {
		const { ctx } = makeCtx();
		const toolkitToolA = makeTool('search', 'ToolkitNode', async () => 'result-a', {
			isFromToolkit: true,
		});
		const toolkitToolB = makeTool('fetch', 'ToolkitNode', async () => 'result-b', {
			isFromToolkit: true,
		});
		mockedGetTools.mockResolvedValue([toolkitToolA, toolkitToolB]);

		const runAgentBatch = vi.fn(async () => [[{ json: { output: 'done' } }]]);

		await resolveSubAgentRequest(
			ctx,
			makeRequest([
				makeAction({
					nodeName: 'ToolkitNode',
					input: { tool: 'fetch', url: 'https://example.com' },
				}),
			]),
			{ runAgentBatch },
		);

		expect(toolkitToolA.invoke).not.toHaveBeenCalled();
		expect(toolkitToolB.invoke).toHaveBeenCalledTimes(1);
		expect(toolkitToolB.invoke).toHaveBeenCalledWith({ url: 'https://example.com' });
	});

	it('produces an error response when no connected tool matches the requested node name', async () => {
		const { ctx } = makeCtx();
		mockedGetTools.mockResolvedValue([]);

		let captured: EngineResponse<RequestResponseMetadata> | undefined;
		const runAgentBatch = vi.fn(async (response: EngineResponse<RequestResponseMetadata>) => {
			captured = response;
			return [[{ json: { output: 'done' } }]];
		});

		await resolveSubAgentRequest(ctx, makeRequest([makeAction({ nodeName: 'MissingNode' })]), {
			runAgentBatch,
		});

		const errorResponse = captured!.actionResponses[0];
		expect(errorResponse.data?.executionStatus).toBe('error');
		expect(errorResponse.data?.error?.message).toMatch(/MissingNode/);
	});
});
