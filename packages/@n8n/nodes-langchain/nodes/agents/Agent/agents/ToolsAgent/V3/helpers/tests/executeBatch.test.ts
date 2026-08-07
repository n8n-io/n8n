import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as agentExecution from '@utils/agent-execution';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

import type { ItemContext } from '../prepareItemContext';
import { prepareItemContext } from '../prepareItemContext';
import { createAgentSequence } from '../createAgentSequence';
import { executeBatch } from '../executeBatch';
import { runAgent } from '../runAgent';

vi.mock('@utils/agent-execution', async () => {
	const originalModule = await vi.importActual('@utils/agent-execution');
	return {
		...originalModule,
		processHitlResponses: vi.fn(),
	};
});

vi.mock('@utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: vi.fn(),
}));

vi.mock('../prepareItemContext', () => ({
	prepareItemContext: vi.fn(),
}));

vi.mock('../createAgentSequence', () => ({
	createAgentSequence: vi.fn(),
}));

vi.mock('../runAgent', () => ({
	runAgent: vi.fn(),
}));

const mockContext = mock<IExecuteFunctions>();
const mockNode = mock<INode>();
const mockModel = mock<BaseChatModel>();

describe('executeBatch - batch metadata merge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getNodeParameter.mockReturnValue(10);
		mockContext.continueOnFail.mockReturnValue(false);

		(agentExecution.processHitlResponses as ReturnType<typeof vi.fn>).mockReturnValue({
			hasApprovedHitlTools: false,
			pendingGatedToolRequest: undefined,
			processedResponse: undefined,
		});
		(getOptionalOutputParser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

		(prepareItemContext as ReturnType<typeof vi.fn>).mockImplementation(
			(_ctx: unknown, itemIndex: number): ItemContext =>
				({
					itemIndex,
					input: 'test',
					steps: [],
					tools: [],
					prompt: undefined,
					options: {},
					outputParser: undefined,
				}) as unknown as ItemContext,
		);

		(createAgentSequence as ReturnType<typeof vi.fn>).mockReturnValue({});
	});

	it("should not drop a non-first item's previousRequests when merging a two-item batch", async () => {
		// Regression test: executeBatch used to keep only the first item's metadata
		// when merging multiple items that both requested tool calls in the same
		// round, silently discarding every other item's own conversation history.
		const item0Step = {
			action: {
				tool: 'item0_tool',
				toolInput: { input: 'item 0' },
				log: 'item 0 log',
				toolCallId: 'call_item0',
				type: 'tool_call',
			},
			observation: 'item 0 result',
			itemIndex: 0,
		};
		const item1Step = {
			action: {
				tool: 'item1_tool',
				toolInput: { input: 'item 1' },
				log: 'item 1 log',
				toolCallId: 'call_item1',
				type: 'tool_call',
			},
			observation: 'item 1 result',
			itemIndex: 1,
		};

		(runAgent as ReturnType<typeof vi.fn>).mockImplementation(
			async (_ctx: unknown, _executor: unknown, itemContext: ItemContext) => {
				if (itemContext.itemIndex === 0) {
					return {
						actions: [{ nodeName: 'Item0Tool', input: {}, id: 'call_item0' }],
						metadata: { previousRequests: [item0Step], itemIndex: 0, iterationCount: 1 },
					};
				}
				return {
					actions: [{ nodeName: 'Item1Tool', input: {}, id: 'call_item1' }],
					metadata: { previousRequests: [item1Step], itemIndex: 1, iterationCount: 1 },
				};
			},
		);

		const batch = [{ json: {} }, { json: {} }] as INodeExecutionData[];

		const result = await executeBatch(mockContext, batch, 0, mockModel, null, undefined, undefined);

		expect(result.request).toBeDefined();
		expect(result.request?.metadata?.previousRequests).toEqual(
			expect.arrayContaining([item0Step, item1Step]),
		);
		expect(result.request?.metadata?.previousRequests).toHaveLength(2);
	});
});
