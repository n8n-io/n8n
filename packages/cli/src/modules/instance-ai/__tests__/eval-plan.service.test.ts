import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { IWorkflowBase } from 'n8n-workflow';

import { EvalPlanService } from '../eval-plan.service';

const mockGenerate = jest.fn();
const mockExtractText = jest.fn();

jest.mock('@n8n/instance-ai', () => ({
	createEvalAgent: () => ({
		generate: async (prompt: string) => await mockGenerate(prompt),
	}),
	extractText: (result: unknown) => mockExtractText(result),
}));

const LLM_NODE_NAME = 'Classify Email';

const workflow = {
	id: 'wf-1',
	nodes: [
		{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', parameters: {} },
		{
			name: LLM_NODE_NAME,
			type: '@n8n/n8n-nodes-langchain.agent',
			parameters: { options: { systemMessage: 'You sort email by topic.' } },
		},
	],
	connections: {},
} as unknown as IWorkflowBase;

describe('EvalPlanService', () => {
	const logger = mock<Logger>();
	let service: EvalPlanService;

	beforeEach(() => {
		mockGenerate.mockReset();
		mockExtractText.mockReset();
		mockGenerate.mockResolvedValue({});
		service = new EvalPlanService(logger);
	});

	it('returns the parsed plan when the agent emits valid JSON with all-string rows', async () => {
		const plan = {
			datasetRows: [
				{ chatInput: 'hi', expected: 'greeting' },
				{ chatInput: 'help', expected: 'support' },
			],
			metrics: [{ name: 'answer_quality', description: 'Did the LLM answer well?' }],
		};
		mockExtractText.mockReturnValue(JSON.stringify(plan));

		const result = await service.generatePlan(workflow, LLM_NODE_NAME, 'be polite');

		expect(result).toEqual(plan);
	});

	it('strips ```json fences before parsing', async () => {
		const plan = {
			datasetRows: [{ chatInput: 'hi' }],
			metrics: [],
		};
		mockExtractText.mockReturnValue(`\`\`\`json\n${JSON.stringify(plan)}\n\`\`\``);

		const result = await service.generatePlan(workflow, LLM_NODE_NAME, undefined);

		expect(result).toEqual(plan);
	});

	it('rejects rows whose values are not strings', async () => {
		// 5 (number) and an object value violate the all-strings constraint.
		mockExtractText.mockReturnValue(
			JSON.stringify({
				datasetRows: [{ total_count: 5, news_json: { title: 'oops' } }],
				metrics: [],
			}),
		);

		const result = await service.generatePlan(workflow, LLM_NODE_NAME, undefined);

		expect(result).toEqual({ datasetRows: [], metrics: [] });
		expect(logger.warn).toHaveBeenCalledWith(
			'eval-plan output failed schema validation',
			expect.objectContaining({ error: expect.anything() }),
		);
	});

	it('returns an empty plan when the LLM node is missing', async () => {
		const result = await service.generatePlan(workflow, 'Not A Real Node', 'whatever');

		expect(result).toEqual({ datasetRows: [], metrics: [] });
		expect(logger.warn).toHaveBeenCalledWith(
			'eval-plan: LLM node not found in workflow',
			expect.objectContaining({ llmNodeName: 'Not A Real Node' }),
		);
		expect(mockGenerate).not.toHaveBeenCalled();
	});

	it('returns an empty plan and logs a warning when the agent throws', async () => {
		mockGenerate.mockRejectedValue(new Error('llm blew up'));

		const result = await service.generatePlan(workflow, LLM_NODE_NAME, 'be polite');

		expect(result).toEqual({ datasetRows: [], metrics: [] });
		expect(logger.warn).toHaveBeenCalledWith(
			'eval-plan generation failed',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});

	it('returns an empty plan and logs a warning when the agent returns no text', async () => {
		mockExtractText.mockReturnValue('');

		const result = await service.generatePlan(workflow, LLM_NODE_NAME, 'be polite');

		expect(result).toEqual({ datasetRows: [], metrics: [] });
		expect(logger.warn).toHaveBeenCalledWith('eval-plan agent returned no text');
	});

	it('returns an empty plan when the JSON is malformed', async () => {
		mockExtractText.mockReturnValue('{ "datasetRows": [{ broken json }] }');

		const result = await service.generatePlan(workflow, LLM_NODE_NAME, 'be polite');

		expect(result).toEqual({ datasetRows: [], metrics: [] });
		expect(logger.warn).toHaveBeenCalledWith(
			'eval-plan agent JSON failed to parse',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});

	it('returns an empty plan when datasetRows is empty', async () => {
		mockExtractText.mockReturnValue(JSON.stringify({ datasetRows: [], metrics: [] }));

		const result = await service.generatePlan(workflow, LLM_NODE_NAME, 'be polite');

		expect(result).toEqual({ datasetRows: [], metrics: [] });
		expect(logger.warn).toHaveBeenCalledWith('eval-plan agent produced an empty dataset');
	});

	it('returns a fresh empty-plan object each call (not a shared mutable reference)', async () => {
		mockExtractText.mockReturnValue('');

		const first = await service.generatePlan(workflow, LLM_NODE_NAME, 'be polite');
		const second = await service.generatePlan(workflow, LLM_NODE_NAME, 'be polite');

		expect(first).not.toBe(second);
	});
});
