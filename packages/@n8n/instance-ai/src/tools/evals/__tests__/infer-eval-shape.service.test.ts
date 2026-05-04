import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { createEvalAgent, extractText } from '../../../utils/eval-agents';
import { inferEvalShape, DEFAULT_EVAL_SHAPE } from '../infer-eval-shape.service';

// Mock the eval-agents module so tests never hit a real API
jest.mock('../../../utils/eval-agents', () => {
	const actual: object = jest.requireActual('../../../utils/eval-agents');
	return {
		...actual,
		createEvalAgent: jest.fn(),
		extractText: jest.fn(),
	};
});

const mockCreateEvalAgent = createEvalAgent as jest.MockedFunction<typeof createEvalAgent>;
const mockExtractText = extractText as jest.MockedFunction<typeof extractText>;

function setupAgentMock(responseText: string) {
	const generate = jest.fn().mockResolvedValue({ messages: [] });
	mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
		typeof createEvalAgent
	>);
	mockExtractText.mockReturnValue(responseText);
	return generate;
}

const MINIMAL_WF: WorkflowJSON = {
	name: 'Test AI',
	nodes: [
		{
			id: '1',
			name: 'Manual',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: '2',
			name: 'Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1,
			position: [200, 0],
			parameters: {},
		},
	],
	connections: { Manual: { main: [[{ node: 'Agent' }]] } },
} as unknown as WorkflowJSON;

describe('inferEvalShape', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns parsed shape when LLM produces valid JSON', async () => {
		setupAgentMock(
			JSON.stringify({
				suggestedInputColumns: ['user_query'],
				suggestedOutputColumns: ['agent_response'],
				suggestedMetrics: [
					{
						id: 'correctness',
						name: 'Correctness',
						kind: 'llm-judge',
						description: 'Is the response factually correct?',
						prompt: 'Judge if...',
						cannedMetricKey: 'correctness',
						defaultEnabled: true,
					},
				],
			}),
		);
		const result = await inferEvalShape(MINIMAL_WF);
		expect(result.suggestedInputColumns).toEqual(['user_query']);
		expect(result.suggestedMetrics).toHaveLength(1);
		expect(result.suggestedMetrics[0].kind).toBe('llm-judge');
	});

	it('falls back to DEFAULT_EVAL_SHAPE when LLM output fails validation', async () => {
		setupAgentMock('this is not json');
		const result = await inferEvalShape(MINIMAL_WF);
		expect(result).toEqual(DEFAULT_EVAL_SHAPE);
	});

	it('falls back when JSON parses but schema validation fails', async () => {
		setupAgentMock(JSON.stringify({ wrongShape: true }));
		const result = await inferEvalShape(MINIMAL_WF);
		expect(result).toEqual(DEFAULT_EVAL_SHAPE);
	});

	it('returns fallback when agent.generate throws', async () => {
		const generate = jest.fn().mockRejectedValue(new Error('API down'));
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		const result = await inferEvalShape(MINIMAL_WF);
		expect(result).toEqual(DEFAULT_EVAL_SHAPE);
	});
});
