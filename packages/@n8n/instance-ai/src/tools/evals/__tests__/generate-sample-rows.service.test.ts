import type { WorkflowJSON } from '@n8n/workflow-sdk';

jest.mock('../../../utils/eval-agents', () => {
	const actual = jest.requireActual('../../../utils/eval-agents') as object;
	return { ...actual, createEvalAgent: jest.fn(), extractText: jest.fn() };
});

import { createEvalAgent, extractText } from '../../../utils/eval-agents';
import { generateSampleRows } from '../generate-sample-rows.service';

const mockCreateEvalAgent = createEvalAgent as jest.MockedFunction<typeof createEvalAgent>;
const mockExtractText = extractText as jest.MockedFunction<typeof extractText>;

function setupAgentMock(responseText: string) {
	const generate = jest.fn().mockResolvedValue({ messages: [] });
	mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
		typeof createEvalAgent
	>);
	mockExtractText.mockReturnValue(responseText);
}

const WF: WorkflowJSON = { name: 'Test', nodes: [], connections: {} } as unknown as WorkflowJSON;

describe('generateSampleRows', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns parsed rows from valid JSON', async () => {
		setupAgentMock(JSON.stringify([{ input: 'q1', expected_output: 'a1' }]));
		const rows = await generateSampleRows(WF, ['input', 'expected_output']);
		expect(rows[0]).toEqual({ input: 'q1', expected_output: 'a1' });
	});

	it('coerces non-string cell values to strings', async () => {
		setupAgentMock(JSON.stringify([{ input: 42, expected_output: true }]));
		const rows = await generateSampleRows(WF, ['input', 'expected_output']);
		expect(rows[0]).toEqual({ input: '42', expected_output: 'true' });
	});

	it('fills missing columns with empty strings', async () => {
		setupAgentMock(JSON.stringify([{ input: 'q1' }]));
		const rows = await generateSampleRows(WF, ['input', 'expected_output']);
		expect(rows[0]).toEqual({ input: 'q1', expected_output: '' });
	});

	it('returns single empty row when parsing fails', async () => {
		setupAgentMock('not json');
		const rows = await generateSampleRows(WF, ['input', 'expected_output']);
		expect(rows).toEqual([{ input: '', expected_output: '' }]);
	});

	it('returns single empty row when agent.generate throws', async () => {
		const generate = jest.fn().mockRejectedValue(new Error('API down'));
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		const rows = await generateSampleRows(WF, ['input', 'expected_output']);
		expect(rows).toEqual([{ input: '', expected_output: '' }]);
	});
});
