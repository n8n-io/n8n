import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { generateSampleRows } from '../generate-sample-rows.service';

jest.mock('../../../utils/eval-agents', () => {
	const actual = jest.requireActual('../../../utils/eval-agents');
	return { ...actual, createEvalAgent: jest.fn(), extractText: jest.fn() };
});

import { createEvalAgent, extractText } from '../../../utils/eval-agents';

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

const WF: WorkflowJSON = {
	name: 'Test',
	nodes: [
		{
			id: '1',
			name: 'T',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
} as unknown as WorkflowJSON;

describe('generateSampleRows', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns parsed rows when LLM produces valid JSON array', async () => {
		setupAgentMock(
			JSON.stringify([
				{ input: 'q1', expected_output: 'a1' },
				{ input: 'q2', expected_output: 'a2' },
				{ input: 'q3', expected_output: 'a3' },
			]),
		);
		const rows = await generateSampleRows(WF, ['input', 'expected_output'], 3);
		expect(rows).toHaveLength(3);
		expect(rows[0]).toEqual({ input: 'q1', expected_output: 'a1' });
	});

	it('coerces non-string cell values to string', async () => {
		setupAgentMock(JSON.stringify([{ input: 42, expected_output: true }]));
		const rows = await generateSampleRows(WF, ['input', 'expected_output'], 1);
		expect(rows[0]).toEqual({ input: '42', expected_output: 'true' });
	});

	it('returns a single empty row when parsing fails', async () => {
		setupAgentMock('not json');
		const rows = await generateSampleRows(WF, ['input', 'expected_output'], 3);
		expect(rows).toEqual([{ input: '', expected_output: '' }]);
	});

	it('returns a single empty row when agent.generate throws', async () => {
		const generate = jest.fn().mockRejectedValue(new Error('API down'));
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		const rows = await generateSampleRows(WF, ['input', 'expected_output'], 3);
		expect(rows).toEqual([{ input: '', expected_output: '' }]);
	});

	it('fills missing columns with empty strings', async () => {
		setupAgentMock(JSON.stringify([{ input: 'q1' }]));
		const rows = await generateSampleRows(WF, ['input', 'expected_output'], 1);
		expect(rows[0]).toEqual({ input: 'q1', expected_output: '' });
	});
});
