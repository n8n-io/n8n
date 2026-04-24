import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'jest-mock-extended';

import type { InstanceAiContext } from '../../../types';
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

const mockInfer = inferEvalShape as jest.MockedFunction<typeof inferEvalShape>;

jest.mock('../ensure-eval-data-table.service', () => ({ ensureEvalDataTable: jest.fn() }));
import { ensureEvalDataTable } from '../ensure-eval-data-table.service';
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
	// `jest-mock-extended` auto-stubs every property proxy-style, but the
	// Mastra logger is used via optional chaining (`ctx.logger?.info(...)`)
	// which short-circuits on `undefined` yet throws on "logger exists but
	// .info is not a function". Provide explicit spies so `?.info`/`?.error`
	// resolve to callable jest.fn()s during the phase 2 resume tests.
	ctx.logger = {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
	} as never;
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

describe('evalsTool — phase 2 resume (v3: delegate to eval-setup-agent)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns deferred:true when user declines', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);
		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never)) as Record<string, unknown>;
		expect(result).toMatchObject({ success: true, deferred: true });
	});

	it('approved + generate: calls ensureEvalDataTable, returns dataTableId, task uses link-existing wording', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		mockEnsureDataTable.mockResolvedValue({ id: 'dt-new', name: 'AI Flow — eval samples' });
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
			shouldDelegateToEvalSetupAgent: true,
			workflowId: 'w1',
			projectId: 'p1',
			dataTableId: 'dt-new',
		});
		const task = result.task as string;
		expect(task).toContain('dt-new');
		expect(task).toContain('already created and populated');
	});

	it('approved + link-existing: task references provided DataTable id', async () => {
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

		expect(result).toMatchObject({
			success: true,
			shouldDelegateToEvalSetupAgent: true,
		});
		const task = result.task as string;
		expect(task).toContain('dt-user-123');
		expect(task).toContain('already created and populated');
	});

	it('approved + later: task tells sub-agent to leave dataTableId empty', async () => {
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

		expect(result).toMatchObject({ success: true, shouldDelegateToEvalSetupAgent: true });
		const task = result.task as string;
		expect(task).toContain('Do not create a DataTable');
	});

	it('filters metrics in the task by enabledMetricIds', async () => {
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

		const task = result.task as string;
		expect(task).toContain('Metric B');
		expect(task).not.toContain('Metric A');
	});
});
