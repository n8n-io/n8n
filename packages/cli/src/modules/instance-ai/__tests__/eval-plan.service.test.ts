import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { IWorkflowBase } from 'n8n-workflow';

import { EvalPlanService } from '../eval-plan.service';

const mockGenerate = jest.fn();

// Mock the @n8n/instance-ai eval-agent factory so no real LLM is hit and no
// environment API key is required. The mock intentionally only captures the
// first argument to `generate` — we don't assert on `providerOptions` /
// maxTokens here because that's an SDK-passthrough detail, not a behavioural
// contract worth pinning in unit tests.
jest.mock('@n8n/instance-ai', () => ({
	createEvalAgent: () => ({
		structuredOutput: () => ({
			generate: async (prompt: string) => await mockGenerate(prompt),
		}),
	}),
}));

describe('EvalPlanService', () => {
	const logger = mock<Logger>();
	let service: EvalPlanService;

	const workflow = {
		id: 'wf-1',
		nodes: [{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', parameters: {} }],
		connections: {},
	} as unknown as IWorkflowBase;

	beforeEach(() => {
		mockGenerate.mockReset();
		service = new EvalPlanService(logger);
	});

	it('returns the structured plan when the agent produces a valid output', async () => {
		const plan = {
			datasetRows: [{ q: 'hi' }],
			nodePlacements: [{ kind: 'trigger' as const, config: {} }],
		};
		mockGenerate.mockResolvedValue({ structuredOutput: plan });

		const result = await service.generatePlan(workflow, 'be polite');

		expect(result).toEqual(plan);
	});

	it('returns an empty plan and logs a warning when the agent throws', async () => {
		mockGenerate.mockRejectedValue(new Error('llm blew up'));

		const result = await service.generatePlan(workflow, 'be polite');

		expect(result).toEqual({ datasetRows: [], nodePlacements: [] });
		expect(logger.warn).toHaveBeenCalledWith(
			'eval-plan generation failed',
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});

	it('returns an empty plan and logs a warning when the agent returns nothing structured', async () => {
		mockGenerate.mockResolvedValue({ structuredOutput: undefined });

		const result = await service.generatePlan(workflow, 'be polite');

		expect(result).toEqual({ datasetRows: [], nodePlacements: [] });
		expect(logger.warn).toHaveBeenCalledWith('eval-plan agent returned no structured output');
	});

	it('returns an empty plan and logs a warning when the structured output fails schema validation', async () => {
		mockGenerate.mockResolvedValue({
			structuredOutput: {
				datasetRows: 'not an array',
				nodePlacements: [],
			},
		});

		const result = await service.generatePlan(workflow, 'be polite');

		expect(result).toEqual({ datasetRows: [], nodePlacements: [] });
		expect(logger.warn).toHaveBeenCalledWith(
			'eval-plan output failed schema validation',
			expect.objectContaining({ error: expect.anything() }),
		);
	});

	it('returns a fresh empty-plan object each call (not a shared mutable reference)', async () => {
		mockGenerate.mockResolvedValue({ structuredOutput: undefined });

		const first = await service.generatePlan(workflow, 'be polite');
		const second = await service.generatePlan(workflow, 'be polite');

		expect(first).not.toBe(second);
	});
});
