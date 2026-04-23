import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'jest-mock-extended';

import type { InstanceAiContext } from '../../../types';
import { ensureEvalDataTable } from '../ensure-eval-data-table.service';
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
				cannedMetricKey: 'correctness',
				defaultEnabled: true,
			},
		],
	},
}));

jest.mock('../ensure-eval-data-table.service', () => ({
	ensureEvalDataTable: jest.fn(),
}));

const mockInfer = inferEvalShape as jest.MockedFunction<typeof inferEvalShape>;
const mockEnsureDataTable = ensureEvalDataTable as jest.MockedFunction<typeof ensureEvalDataTable>;

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

describe('evalsTool — propose gate checks', () => {
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

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {},
		} as never)) as Record<string, unknown>;

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

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		expect(result).toMatchObject({
			skipped: true,
			reason: expect.stringMatching(/already/i) as unknown,
		});
	});
});

describe('evalsTool — phase 1 suspend', () => {
	beforeEach(() => jest.clearAllMocks());

	it('suspends with proposal payload when workflow has AI nodes and no existing eval setup', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const suspend = jest.fn().mockImplementation(async () => await new Promise(() => {}));
		const tool = createEvalsTool(ctx);

		void tool.execute!({ action: 'propose', workflowId: 'w1' }, { agent: { suspend } } as never);

		await new Promise(process.nextTick);
		expect(suspend).toHaveBeenCalledTimes(1);
		const payload = (suspend.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
		expect(payload).toMatchObject({
			workflowId: 'w1',
			detectedAiNodes: ['Agent'],
			suggestedMetrics: expect.any(Array) as unknown,
		});
	});
});

describe('evalsTool — phase 2 resume', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns deferred:true when user declines', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);
		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never)) as Record<string, unknown>;
		expect(result).toMatchObject({ success: true, deferred: true });
		expect(mockEnsureDataTable).not.toHaveBeenCalled();
	});

	it('approve + generate: creates DataTable, returns builder task with dataTableId', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		mockEnsureDataTable.mockResolvedValue({ id: 'dt-1', name: 'AI Flow — eval samples' });
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1', projectId: 'p1' }, {
			agent: {
				resumeData: {
					approved: true,
					datasetChoice: 'generate',
					enabledMetricIds: ['correctness'],
				},
			},
		} as never)) as Record<string, unknown>;

		expect(mockEnsureDataTable).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({
			success: true,
			shouldDelegateToBuilder: true,
			workflowId: 'w1',
			dataTableId: 'dt-1',
		});
		const builderTask = (result as { builderTask: string }).builderTask;
		expect(builderTask).toContain('dt-1');
		expect(builderTask).toContain('Agent');
		expect(builderTask).toContain('checkIfEvaluating');
	});

	it('approve + link-existing: does not create DataTable, uses provided id in builder task', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {
				resumeData: {
					approved: true,
					datasetChoice: 'link-existing',
					existingDataTableId: 'dt-user-123',
					enabledMetricIds: ['correctness'],
				},
			},
		} as never)) as Record<string, unknown>;

		expect(mockEnsureDataTable).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			success: true,
			shouldDelegateToBuilder: true,
			dataTableId: 'dt-user-123',
		});
		const builderTask = (result as { builderTask: string }).builderTask;
		expect(builderTask).toContain('dt-user-123');
	});

	it('approve + later: omits dataTableId, builder task tells builder to leave it empty', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {
				resumeData: {
					approved: true,
					datasetChoice: 'later',
					enabledMetricIds: ['correctness'],
				},
			},
		} as never)) as Record<string, unknown>;

		expect(mockEnsureDataTable).not.toHaveBeenCalled();
		expect(result).toMatchObject({ success: true, shouldDelegateToBuilder: true });
		expect(result).not.toHaveProperty('dataTableId');
		const builderTask = (result as { builderTask: string }).builderTask;
		expect(builderTask).toContain('Leave the `evaluationTrigger` dataTableId empty');
	});

	it('filters builder task metrics by enabledMetricIds from resume data', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue({
			suggestedInputColumns: ['input'],
			suggestedOutputColumns: ['expected_output'],
			suggestedMetrics: [
				{
					id: 'a',
					name: 'Metric A',
					kind: 'llm-judge',
					description: 'd',
					prompt: 'p',
					defaultEnabled: true,
				},
				{ id: 'b', name: 'Metric B', kind: 'exact-match', description: 'd', defaultEnabled: false },
			],
		});
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {
				resumeData: {
					approved: true,
					datasetChoice: 'later',
					enabledMetricIds: ['b'],
				},
			},
		} as never)) as Record<string, unknown>;

		const builderTask = (result as { builderTask: string }).builderTask;
		expect(builderTask).toContain('Metric B');
		expect(builderTask).not.toContain('Metric A');
	});
});
