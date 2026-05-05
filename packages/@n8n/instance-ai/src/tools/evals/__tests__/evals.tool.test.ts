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
	ctx.dataTableService.create = jest.fn();
	ctx.dataTableService.insertRows = jest.fn();
	// `jest-mock-extended` proxies every property, including optional Sets,
	// which makes `(ctx.consentedEditWorkflowIds ??= new Set())` short-circuit
	// onto the proxy instead of installing a real Set. Reset to `undefined`
	// so the lazy-init in the tool can take effect.
	ctx.consentedEditWorkflowIds = undefined;
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

	it('returns skipped when a root agent reads another node JSON directly', async () => {
		const wf = {
			name: 'Reads Trigger',
			nodes: [
				{
					id: '1',
					name: 'Telegram Trigger',
					type: 'n8n-nodes-base.telegramTrigger',
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
					parameters: { text: "={{ $('Telegram Trigger').item.json.message.text }}" },
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
			reason: expect.stringMatching(/topology-only/i) as unknown,
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

	it('approved: delegates empty DataTable creation to eval-setup without synthetic rows', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1', projectId: 'p1' }, {
			agent: {
				resumeData: {
					approved: true,
					enabledMetricIds: ['correctness'],
				},
			},
		} as never)) as Record<string, unknown>;

		expect(ctx.dataTableService.create).not.toHaveBeenCalled();
		expect(ctx.dataTableService.insertRows).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			success: true,
			shouldDelegateToEvalSetupAgent: true,
			workflowId: 'w1',
			projectId: 'p1',
		});
		const task = result.task as string;
		expect(task).toContain('Create an empty DataTable');
		expect(task).toContain('Do not insert rows');
		expect(task).toContain('- input');
		expect(task).toContain('- expected_output');
	});

	it('approved: records the workflow as consented so the eval-setup sub-agent skips re-confirmation', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);

		await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: { resumeData: { approved: true } },
		} as never);

		expect(ctx.consentedEditWorkflowIds?.has('w1')).toBe(true);
	});

	it('declined: does not record consent', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);

		await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never);

		expect(ctx.consentedEditWorkflowIds?.has('w1') ?? false).toBe(false);
	});

	it('approved: still releases the proposalCache entry when downstream work throws', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);

		// Phase 1 — populate the cache via a real suspend.
		const suspend = jest.fn().mockResolvedValue(undefined);
		await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: { suspend },
		} as never);
		expect(suspend).toHaveBeenCalledTimes(1);

		// Phase 2 — make refetch throw so the try-block bails partway through.
		(ctx.workflowService.getAsWorkflowJSON as jest.Mock).mockRejectedValueOnce(
			new Error('refetch failed'),
		);
		await expect(
			tool.execute!({ action: 'propose', workflowId: 'w1' }, {
				agent: { resumeData: { approved: true } },
			} as never),
		).rejects.toThrow('refetch failed');

		// Re-entering phase 1 must NOT find a stale cache entry — it should
		// re-infer from scratch.
		mockInfer.mockClear();
		await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: { suspend: jest.fn().mockResolvedValue(undefined) },
		} as never);
		expect(mockInfer).toHaveBeenCalledTimes(1);
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
			dataTableId: 'dt-user-123',
		});
		const task = result.task as string;
		expect(task).toContain('dt-user-123');
		expect(task).toContain('already exists');
		expect(task).toContain('do not modify its rows or schema');
	});

	it('approved + link-existing: derives input columns from the existing DataTable schema', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		ctx.dataTableService.getSchema = jest.fn().mockResolvedValue([
			{ id: 'c1', name: 'targetUrl', type: 'string', index: 0 },
			{ id: 'c2', name: 'priceThresholdDollars', type: 'number', index: 1 },
			{ id: 'c3', name: 'expected_output', type: 'string', index: 2 },
		]);
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {
				resumeData: {
					approved: true,
					datasetChoice: 'link-existing',
					existingDataTableId: 'dt-real',
					enabledMetricIds: ['correctness'],
				},
			},
		} as never)) as Record<string, unknown>;

		const task = result.task as string;
		expect(task).toContain('- targetUrl');
		expect(task).toContain('- priceThresholdDollars');
		expect(task).toContain('- expected_output');
		expect(task).not.toMatch(/^- input$/m);
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
					enabledMetricIds: ['b'],
				},
			},
		} as never)) as Record<string, unknown>;

		const task = result.task as string;
		expect(task).toContain('Metric B');
		expect(task).not.toContain('Metric A');
	});

	it.each([{ enabledMetricIds: undefined }, { enabledMetricIds: [] }])(
		'falls back to default metrics when enabledMetricIds is $enabledMetricIds',
		async ({ enabledMetricIds }) => {
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
					{
						id: 'b',
						name: 'Metric B',
						kind: 'exact-match',
						description: 'd',
						defaultEnabled: false,
					},
				],
			});
			const tool = createEvalsTool(ctx);

			const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
				agent: {
					resumeData: {
						approved: true,
						...(enabledMetricIds !== undefined ? { enabledMetricIds } : {}),
					},
				},
			} as never)) as Record<string, unknown>;

			const task = result.task as string;
			expect(task).toContain('Metric A');
			expect(task).not.toContain('Metric B');
		},
	);
});
