import type { Tool } from '@langchain/classic/tools';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as helpers from '../../../../utils/helpers';
import { conversationalAgentExecute } from '../agents/ConversationalAgent/execute';

const { mockInitializeAgentExecutor } = vi.hoisted(() => ({
	mockInitializeAgentExecutor: vi.fn(),
}));

vi.mock('@langchain/classic/agents', () => ({
	initializeAgentExecutorWithOptions: mockInitializeAgentExecutor,
}));

const mockContext = mock<IExecuteFunctions>({ helpers: mock<IExecuteFunctions['helpers']>() });

/** Wires the context so the agent reaches `agentExecutor.invoke` and fails with `error`. */
function setupFailingAgent(error: unknown) {
	const mockModel = mock<BaseChatModel>();
	mockModel.lc_namespace = ['chat_models'];

	mockContext.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));
	mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);
	mockContext.getInputConnectionData.mockImplementation(async (connectionType) =>
		connectionType === NodeConnectionTypes.AiLanguageModel ? mockModel : undefined,
	);
	mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
		if (param === 'text') return 'test input';
		if (param === 'hasOutputParser') return false;
		if (param === 'options') return { maxIterations: 10 };
		return defaultValue;
	});

	vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);

	const invoke = vi.fn().mockRejectedValue(error);
	mockInitializeAgentExecutor.mockResolvedValue({
		withConfig: vi.fn().mockReturnValue({ invoke }),
	});
}

describe('conversationalAgentExecute', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockContext.logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};
		mockContext.getWorkflow.mockReturnValue({ name: 'Test Workflow' } as never);
		mockContext.getExecutionId.mockReturnValue('exec-123');
	});

	it('should surface a raw TypeError as a NodeOperationError keeping message and cause', async () => {
		const original = new TypeError('fetch failed');
		setupFailingAgent(original);
		mockContext.continueOnFail.mockReturnValue(false);

		const thrown = await conversationalAgentExecute
			.call(mockContext, 1.7)
			.catch((error: NodeOperationError) => error);

		expect(thrown).toBeInstanceOf(NodeOperationError);
		expect((thrown as NodeOperationError).message).toBe('fetch failed');
		expect((thrown as NodeOperationError).description).toBe('Original error: TypeError');
		expect((thrown as NodeOperationError).cause).toBe(original);
	});

	it('should replace a useless error message with the agent fallback message', async () => {
		setupFailingAgent(new Error('Error'));
		mockContext.continueOnFail.mockReturnValue(false);

		await expect(conversationalAgentExecute.call(mockContext, 1.7)).rejects.toThrow(
			'Agent execution failed',
		);
	});

	it('should report the enriched message on the item when continueOnFail is true', async () => {
		setupFailingAgent(new Error('Error'));
		mockContext.continueOnFail.mockReturnValue(true);

		const result = await conversationalAgentExecute.call(mockContext, 1.7);

		expect(result[0][0].json.error).toBe('Agent execution failed');
	});
});
