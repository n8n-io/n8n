import type { WorkflowJSON } from '@n8n/workflow-sdk';

jest.mock('../../../utils/eval-agents', () => {
	return {
		createEvalAgent: jest.fn(),
		extractText: jest.fn(),
		HAIKU_MODEL: 'test-haiku-model',
	};
});

import { createEvalAgent, extractText } from '../../../utils/eval-agents';
import {
	distributeRowCount,
	extractAgentContext,
	generateSampleRows,
	runBatch,
} from '../generate-sample-rows.service';
import type { AgentContext, SampleRowFacet } from '../generate-sample-rows.service';

const mockCreateEvalAgent = createEvalAgent as jest.MockedFunction<typeof createEvalAgent>;
const mockExtractText = extractText as jest.MockedFunction<typeof extractText>;

function setupAgentMock(responseText: string) {
	const generate = jest.fn().mockResolvedValue({ messages: [] });
	mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
		typeof createEvalAgent
	>);
	mockExtractText.mockReturnValue(responseText);
}

type GenerateMock = jest.Mock<Promise<{ messages: [] }>, [string]>;

function createGenerateMock(): GenerateMock {
	return jest.fn<Promise<{ messages: [] }>, [string]>().mockResolvedValue({ messages: [] });
}

function getPromptText(generate: GenerateMock): string {
	const firstCall = generate.mock.calls[0];
	if (!firstCall) throw new Error('Expected generate to be called');
	return firstCall[0];
}

const WF: WorkflowJSON = { name: 'Test', nodes: [], connections: {} } as unknown as WorkflowJSON;

describe('generateSampleRows', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns parsed input rows from valid JSON across batches', async () => {
		setupAgentMock(JSON.stringify([{ input: 'q1' }]));
		const rows = await generateSampleRows({
			workflow: WF,
			columns: ['input', 'expected_output'],
			rowCount: 5,
		});
		expect(rows.length).toBeGreaterThan(0);
		expect(rows[0]).toEqual({ input: 'q1', expected_output: '' });
	});

	it('coerces non-string cell values to strings', async () => {
		setupAgentMock(JSON.stringify([{ input: 42, expected_output: true }]));
		const rows = await generateSampleRows({
			workflow: WF,
			columns: ['input', 'expected_output'],
			rowCount: 5,
		});
		expect(rows[0]).toEqual({ input: '42', expected_output: '' });
	});

	it('fills missing columns with empty strings', async () => {
		setupAgentMock(JSON.stringify([{ input: 'q1' }]));
		const rows = await generateSampleRows({
			workflow: WF,
			columns: ['input', 'expected_output'],
			rowCount: 5,
		});
		expect(rows[0]).toEqual({ input: 'q1', expected_output: '' });
	});

	it('returns single fallback row when every batch fails to parse', async () => {
		setupAgentMock('not json');
		const rows = await generateSampleRows({
			workflow: WF,
			columns: ['input', 'expected_output'],
			rowCount: 5,
		});
		expect(rows).toEqual([{ input: '', expected_output: '' }]);
	});

	it('returns single fallback row when every batch rejects', async () => {
		const generate = jest.fn().mockRejectedValue(new Error('API down'));
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		const rows = await generateSampleRows({
			workflow: WF,
			columns: ['input', 'expected_output'],
			rowCount: 5,
		});
		expect(rows).toEqual([{ input: '', expected_output: '' }]);
	});
});

describe('distributeRowCount', () => {
	it('distributes 25 evenly across 5 facets', () => {
		expect(distributeRowCount(25)).toEqual([5, 5, 5, 5, 5]);
	});

	it('puts the remainder in the leading facets', () => {
		expect(distributeRowCount(23)).toEqual([5, 5, 5, 4, 4]);
	});

	it('handles small counts with trailing zeros', () => {
		expect(distributeRowCount(8)).toEqual([2, 2, 2, 1, 1]);
		expect(distributeRowCount(3)).toEqual([1, 1, 1, 0, 0]);
	});

	it('treats zero and negative inputs as zero', () => {
		expect(distributeRowCount(0)).toEqual([0, 0, 0, 0, 0]);
		expect(distributeRowCount(-1)).toEqual([0, 0, 0, 0, 0]);
	});
});

const BATCH_FACET: SampleRowFacet = {
	length: 'short',
	edgeMode: 'happy',
	instructions: 'Produce typical inputs.',
};

const BATCH_CONTEXT: AgentContext = {
	workflowName: 'Workflow',
	agentNodeName: 'Agent',
	systemPrompt: 'Be helpful.',
	promptTemplate: undefined,
	connectedToolNames: [],
};

describe('runBatch', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns parsed input rows on success', async () => {
		setupAgentMock(JSON.stringify([{ input: 'q1' }]));
		const rows = await runBatch({
			facet: BATCH_FACET,
			rowCount: 1,
			context: BATCH_CONTEXT,
			columns: ['input', 'expected_output'],
		});
		expect(rows).toEqual([{ input: 'q1', expected_output: '' }]);
	});

	it('caps over-generated rows to the requested batch size', async () => {
		setupAgentMock(JSON.stringify([{ input: 'q1' }, { input: 'q2' }, { input: 'q3' }]));
		const rows = await runBatch({
			facet: BATCH_FACET,
			rowCount: 2,
			context: BATCH_CONTEXT,
			columns: ['input'],
		});
		expect(rows).toEqual([{ input: 'q1' }, { input: 'q2' }]);
	});

	it('does not send expected output columns to the sample-row agent', async () => {
		const generate = createGenerateMock();
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify([{ input: 'q1' }]));

		await runBatch({
			facet: BATCH_FACET,
			rowCount: 1,
			context: BATCH_CONTEXT,
			columns: ['input', 'expected_output'],
		});

		const promptText = getPromptText(generate);
		expect(promptText).toContain('Columns: input');
		expect(promptText).not.toContain('expected_output');
	});

	it('returns empty array when generate throws (does not propagate)', async () => {
		const generate = jest.fn().mockRejectedValue(new Error('API down'));
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		const rows = await runBatch({
			facet: BATCH_FACET,
			rowCount: 1,
			context: BATCH_CONTEXT,
			columns: ['input'],
		});
		expect(rows).toEqual([]);
	});

	it('logs and returns empty array when parsing fails', async () => {
		const logger = { warn: jest.fn<undefined, [string, Record<string, unknown>?]>() };
		setupAgentMock('not json');
		const rows = await runBatch({
			facet: BATCH_FACET,
			rowCount: 1,
			context: BATCH_CONTEXT,
			columns: ['input'],
			logger,
		});
		expect(rows).toEqual([]);
		expect(logger.warn).toHaveBeenCalledTimes(1);
		const [message, metadata] = logger.warn.mock.calls[0];
		expect(message).toBe('generate-sample-rows: batch generation failed');
		expect(metadata).toEqual(expect.objectContaining({ rowCount: 1 }));
		expect(metadata?.error).toBeInstanceOf(SyntaxError);
	});

	it('returns empty array when JSON is malformed', async () => {
		setupAgentMock('not json');
		const rows = await runBatch({
			facet: BATCH_FACET,
			rowCount: 1,
			context: BATCH_CONTEXT,
			columns: ['input'],
		});
		expect(rows).toEqual([]);
	});

	it('returns empty array when schema validation fails', async () => {
		setupAgentMock(JSON.stringify({ not: 'an array' }));
		const rows = await runBatch({
			facet: BATCH_FACET,
			rowCount: 1,
			context: BATCH_CONTEXT,
			columns: ['input'],
		});
		expect(rows).toEqual([]);
	});

	it('strips markdown fences from the response', async () => {
		setupAgentMock('```json\n[{"input":"q","expected_output":"a"}]\n```');
		const rows = await runBatch({
			facet: BATCH_FACET,
			rowCount: 1,
			context: BATCH_CONTEXT,
			columns: ['input', 'expected_output'],
		});
		expect(rows).toEqual([{ input: 'q', expected_output: '' }]);
	});

	it('passes facet instructions, rowCount, and agent context into the prompt', async () => {
		const generate = createGenerateMock();
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify([]));
		await runBatch({
			facet: BATCH_FACET,
			rowCount: 7,
			context: BATCH_CONTEXT,
			columns: ['input'],
		});
		const promptText = getPromptText(generate);
		expect(promptText).toContain('Produce typical inputs.');
		expect(promptText).toContain('7');
		expect(promptText).toContain('Be helpful.');
	});

	it('returns empty array immediately when rowCount is zero', async () => {
		const generate = jest.fn();
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		const rows = await runBatch({
			facet: BATCH_FACET,
			rowCount: 0,
			context: BATCH_CONTEXT,
			columns: ['input'],
		});
		expect(rows).toEqual([]);
		expect(generate).not.toHaveBeenCalled();
	});
});

describe('extractAgentContext', () => {
	const AGENT_TYPE = '@n8n/n8n-nodes-langchain.agent';
	const TOOL_TYPE = '@n8n/n8n-nodes-langchain.toolHttpRequest';

	function buildWorkflow(): WorkflowJSON {
		return {
			name: 'Support bot',
			nodes: [
				{
					id: '1',
					name: 'Agent A',
					type: AGENT_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						text: '={{ $json.message }}',
						options: { systemMessage: 'You are a polite support agent.' },
					},
				},
				{
					id: '2',
					name: 'Lookup tool',
					type: TOOL_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {
				'Lookup tool': {
					ai_tool: [[{ node: 'Agent A', type: 'ai_tool', index: 0 }]],
				},
			},
		} as unknown as WorkflowJSON;
	}

	it('returns context for the named agent', () => {
		const ctx = extractAgentContext(buildWorkflow(), 'Agent A');
		expect(ctx).toEqual({
			workflowName: 'Support bot',
			agentNodeName: 'Agent A',
			systemPrompt: 'You are a polite support agent.',
			promptTemplate: '={{ $json.message }}',
			connectedToolNames: ['Lookup tool'],
		});
	});

	it('returns undefined when the agent name does not match any node', () => {
		const ctx = extractAgentContext(buildWorkflow(), 'Missing Agent');
		expect(ctx).toBeUndefined();
	});

	it('caps an oversized system prompt at 2000 characters', () => {
		const wf = buildWorkflow();
		const huge = 'x'.repeat(5000);
		(
			wf.nodes[0] as unknown as { parameters: { options: { systemMessage: string } } }
		).parameters.options.systemMessage = huge;
		const ctx = extractAgentContext(wf, 'Agent A');
		expect(ctx?.systemPrompt).toHaveLength(2000);
	});

	it('omits prompt template and tools when none are present', () => {
		const wf: WorkflowJSON = {
			name: 'Bare',
			nodes: [
				{
					id: '1',
					name: 'Agent',
					type: AGENT_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;
		const ctx = extractAgentContext(wf, 'Agent');
		expect(ctx).toEqual({
			workflowName: 'Bare',
			agentNodeName: 'Agent',
			systemPrompt: undefined,
			promptTemplate: undefined,
			connectedToolNames: [],
		});
	});
});

describe('generateSampleRows orchestration', () => {
	beforeEach(() => jest.clearAllMocks());

	it('dispatches one batch per non-empty facet', async () => {
		const generate = jest.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify([{ input: 'r' }]));
		await generateSampleRows({ workflow: WF, columns: ['input'], rowCount: 25 });
		expect(generate).toHaveBeenCalledTimes(5);
	});

	it('skips facets that get zero rows', async () => {
		const generate = jest.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify([{ input: 'r' }]));
		await generateSampleRows({ workflow: WF, columns: ['input'], rowCount: 3 });
		expect(generate).toHaveBeenCalledTimes(3);
	});

	it('isolates failures: one batch rejects, others still produce rows', async () => {
		const responses = [
			Promise.resolve({ messages: [] }),
			Promise.reject(new Error('mid batch fail')),
			Promise.resolve({ messages: [] }),
			Promise.resolve({ messages: [] }),
			Promise.resolve({ messages: [] }),
		];
		const generate = jest.fn().mockImplementation(async () => await responses.shift());
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText
			.mockReturnValueOnce(JSON.stringify([{ input: 'a' }]))
			.mockReturnValueOnce(JSON.stringify([{ input: 'c' }]))
			.mockReturnValueOnce(JSON.stringify([{ input: 'd' }]))
			.mockReturnValueOnce(JSON.stringify([{ input: 'e' }]));
		const rows = await generateSampleRows({
			workflow: WF,
			columns: ['input'],
			rowCount: 5,
		});
		const inputs = rows.map((r) => r.input).sort();
		expect(inputs).toEqual(['a', 'c', 'd', 'e']);
	});

	it('uses the default rowCount of 25 when not specified', async () => {
		const generate = jest.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(
			JSON.stringify(Array.from({ length: 5 }, () => ({ input: 'x' }))),
		);
		const rows = await generateSampleRows({ workflow: WF, columns: ['input'] });
		expect(rows).toHaveLength(25);
	});

	it('uses targetAgentNodeName context when provided', async () => {
		const wf: WorkflowJSON = {
			name: 'wf',
			nodes: [
				{
					id: '1',
					name: 'AgentX',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					position: [0, 0],
					parameters: { options: { systemMessage: 'TARGETED-AGENT-SYSTEM' } },
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;
		const generate = createGenerateMock();
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify([]));
		await generateSampleRows({
			workflow: wf,
			columns: ['input'],
			rowCount: 5,
			targetAgentNodeName: 'AgentX',
		});
		const promptText = getPromptText(generate);
		expect(promptText).toContain('TARGETED-AGENT-SYSTEM');
	});

	it('falls back to first detected agent when no targetAgentNodeName', async () => {
		const wf: WorkflowJSON = {
			name: 'wf',
			nodes: [
				{
					id: '1',
					name: 'FirstAgent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					position: [0, 0],
					parameters: { options: { systemMessage: 'FIRST-AGENT-SYSTEM' } },
				},
				{
					id: '2',
					name: 'SecondAgent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					position: [0, 0],
					parameters: { options: { systemMessage: 'SECOND-AGENT-SYSTEM' } },
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;
		const generate = createGenerateMock();
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(JSON.stringify([]));
		await generateSampleRows({ workflow: wf, columns: ['input'], rowCount: 5 });
		const promptText = getPromptText(generate);
		expect(promptText).toContain('FIRST-AGENT-SYSTEM');
		expect(promptText).not.toContain('SECOND-AGENT-SYSTEM');
	});
});
