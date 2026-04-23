import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'jest-mock-extended';

import type { InstanceAiContext } from '../../../types';
import { applyEvalSetup } from '../apply-eval-setup.service';
import { createEvalsTool } from '../evals.tool';
import { inferEvalShape, DEFAULT_EVAL_SHAPE } from '../infer-eval-shape.service';

jest.mock('../infer-eval-shape.service', () => ({
	inferEvalShape: jest.fn(),
	DEFAULT_EVAL_SHAPE: {
		suggestedInputColumns: ['input'],
		suggestedOutputColumns: ['expected_output'],
		suggestedMetrics: [
			{
				id: 'correctness',
				name: 'Correctness',
				kind: 'llm-judge',
				description: 'd',
				prompt: 'p',
				defaultEnabled: true,
			},
		],
	},
}));

jest.mock('../apply-eval-setup.service', () => ({
	applyEvalSetup: jest.fn(),
}));

const mockInfer = inferEvalShape as jest.MockedFunction<typeof inferEvalShape>;
const mockApply = applyEvalSetup as jest.MockedFunction<typeof applyEvalSetup>;

function aiWf(): WorkflowJSON {
	return {
		name: 'AI Flow',
		nodes: [
			{
				id: '1',
				name: 'T',
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
		connections: {},
	} as unknown as WorkflowJSON;
}

function makeCtx(wf: WorkflowJSON): InstanceAiContext {
	const ctx = mock<InstanceAiContext>();
	ctx.workflowService.getAsWorkflowJSON = jest.fn().mockResolvedValue(wf);
	return ctx;
}

describe('evalsTool — propose', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns skipped when the workflow has no AI nodes', async () => {
		const wf = {
			name: 'Plain',
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
		const ctx = makeCtx(wf);
		const tool = createEvalsTool(ctx);

		const result: unknown = await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {},
		} as never);

		expect(result).toMatchObject({ skipped: true });
		expect(mockInfer).not.toHaveBeenCalled();
	});

	it('returns skipped when EvaluationTrigger already exists', async () => {
		const wf = {
			name: 'Already',
			nodes: [
				{
					id: '1',
					name: 'T',
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
				{
					id: '3',
					name: 'EvalT',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					position: [0, -200],
					parameters: {},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;
		const ctx = makeCtx(wf);
		const tool = createEvalsTool(ctx);

		const result: unknown = await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {},
		} as never);

		expect(result).toMatchObject({
			skipped: true,
			reason: expect.stringMatching(/already/i) as unknown,
		});
	});

	it('suspends with proposal payload when workflow has AI nodes and no existing eval setup', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const suspend = jest.fn().mockImplementation(async () => {
			await new Promise(() => {});
		});
		const tool = createEvalsTool(ctx);

		void tool.execute!({ action: 'propose', workflowId: 'w1' }, { agent: { suspend } } as never);

		await new Promise(process.nextTick);
		expect(suspend).toHaveBeenCalledTimes(1);
		const calls = suspend.mock.calls as unknown[][];
		const payload = calls[0][0];
		expect(payload).toMatchObject({
			workflowId: 'w1',
			detectedAiNodes: ['Agent'],
			suggestedMetrics: expect.any(Array) as unknown,
		});
	});

	it('returns deferred:true when user declines', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);
		const result: unknown = await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never);
		expect(result).toMatchObject({ success: true, deferred: true });
	});

	it('calls applyEvalSetup when user approves and returns the result', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		mockApply.mockResolvedValue({
			success: true,
			evalTriggerNodeName: 'EvaluationTrigger',
			dataTableId: 'dt-1',
		});
		const tool = createEvalsTool(ctx);

		const result: unknown = await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {
				resumeData: {
					approved: true,
					datasetChoice: 'generate',
					enabledMetricIds: ['correctness'],
				},
			},
		} as never);

		expect(mockApply).toHaveBeenCalled();
		expect(result).toMatchObject({ success: true, dataTableId: 'dt-1' });
	});
});
