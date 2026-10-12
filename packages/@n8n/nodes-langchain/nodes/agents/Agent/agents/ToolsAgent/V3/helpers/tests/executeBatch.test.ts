import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import { vi } from 'vitest';

import type { ItemContext } from '../prepareItemContext';
import { executeBatch } from '../executeBatch';

const { runAgentMock, prepareItemContextMock, createAgentSequenceMock } = vi.hoisted(() => ({
	runAgentMock: vi.fn(),
	prepareItemContextMock: vi.fn(),
	createAgentSequenceMock: vi.fn(),
}));

vi.mock('@utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../runAgent', () => ({ runAgent: runAgentMock }));

vi.mock('../prepareItemContext', () => ({ prepareItemContext: prepareItemContextMock }));

vi.mock('../checkMaxIterations', () => ({ checkMaxIterations: vi.fn() }));

vi.mock('../createAgentSequence', () => ({
	createAgentSequence: createAgentSequenceMock,
}));

vi.mock('../finalizeResult', () => ({ finalizeResult: vi.fn() }));

const mockContext = mock<IExecuteFunctions>();
const mockNode = mock<INode>();

beforeEach(() => {
	vi.clearAllMocks();
	mockContext.getNode.mockReturnValue(mockNode);
	mockContext.getNodeParameter.mockReturnValue(10);
});

function buildItemContext(itemIndex: number, hasSteps = false): ItemContext {
	return {
		itemIndex,
		input: 'test',
		steps: hasSteps ? [mock<ItemContext['steps'][number]>()] : [],
		tools: [],
		prompt: mock(),
		options: {
			maxIterations: 10,
			returnIntermediateSteps: false,
		},
		outputParser: undefined,
	};
}

describe('executeBatch — forced tool calls', () => {
	it.each([
		{ iteration: 'first', hasSteps: false, forceToolCall: true },
		{ iteration: 'later', hasSteps: true, forceToolCall: false },
	])('passes the force flag for the $iteration iteration', async ({ hasSteps, forceToolCall }) => {
		const model = mock<BaseChatModel>();
		const itemContext = buildItemContext(0, hasSteps);
		itemContext.options.forceToolCallOnFirstIteration = true;
		prepareItemContextMock.mockResolvedValue(itemContext);
		runAgentMock.mockResolvedValue(undefined);

		await executeBatch(mockContext, [{ json: {} }], 0, model, null, undefined);

		expect(createAgentSequenceMock.mock.lastCall?.at(-1)).toBe(forceToolCall);
	});
});

describe('executeBatch — error enrichment', () => {
	it('surfaces a useful message in the output item when a tool throws a plain Error("Error") and continueOnFail is on', async () => {
		prepareItemContextMock.mockResolvedValue(buildItemContext(0));
		runAgentMock.mockRejectedValue(new Error('Error'));
		mockContext.continueOnFail.mockReturnValue(true);

		const { returnData } = await executeBatch(
			mockContext,
			[{ json: { text: 'x' } }],
			0,
			mock<BaseChatModel>(),
			null,
			undefined,
		);

		expect(returnData).toHaveLength(1);
		// The original message was the useless "Error"; the wrap must not pass it through verbatim.
		expect(returnData[0].json.error).not.toBe('Error');
		expect(returnData[0].json.error).toBe('Agent execution failed');
	});

	it('throws a NodeOperationError with a useful message when continueOnFail is off', async () => {
		prepareItemContextMock.mockResolvedValue(buildItemContext(0));
		runAgentMock.mockRejectedValue(new Error('Error'));
		mockContext.continueOnFail.mockReturnValue(false);

		await expect(
			executeBatch(
				mockContext,
				[{ json: { text: 'x' } }],
				0,
				mock<BaseChatModel>(),
				null,
				undefined,
			),
		).rejects.toThrow('Agent execution failed');
	});

	it('preserves a real underlying message instead of falling back', async () => {
		const real = new TypeError('not a function');
		prepareItemContextMock.mockResolvedValue(buildItemContext(0));
		runAgentMock.mockRejectedValue(real);
		mockContext.continueOnFail.mockReturnValue(true);

		const { returnData } = await executeBatch(
			mockContext,
			[{ json: { text: 'x' } }],
			0,
			mock<BaseChatModel>(),
			null,
			undefined,
		);

		expect(returnData[0].json.error).toBe('not a function');
	});

	it('still wraps parser errors with the dedicated parser message', async () => {
		prepareItemContextMock.mockResolvedValue(buildItemContext(0));
		runAgentMock.mockRejectedValue(new Error('Failed to parse. Text: "garbage"'));
		mockContext.continueOnFail.mockReturnValue(false);

		await expect(
			executeBatch(
				mockContext,
				[{ json: { text: 'x' } }],
				0,
				mock<BaseChatModel>(),
				null,
				undefined,
			),
		).rejects.toThrow("Model output doesn't fit required format");
	});

	it('returns BaseError subclasses unchanged (no double-wrapping)', async () => {
		const original = new NodeOperationError(mockNode, 'already enriched');
		prepareItemContextMock.mockResolvedValue(buildItemContext(0));
		runAgentMock.mockRejectedValue(original);
		mockContext.continueOnFail.mockReturnValue(true);

		const { returnData } = await executeBatch(
			mockContext,
			[{ json: { text: 'x' } }],
			0,
			mock<BaseChatModel>(),
			null,
			undefined,
		);

		expect(returnData[0].json.error).toBe('already enriched');
	});
});
