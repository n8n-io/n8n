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
	// `jest-mock-extended` auto-stubs every property proxy-style, but the
	// Mastra logger is used via optional chaining (`ctx.logger?.info(...)`)
	// which short-circuits on `undefined` yet throws on "logger exists but
	// .info is not a function". Provide explicit spies so `?.info`/`?.error`
	// resolve to callable jest.fn()s.
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

describe('evalsTool — delegates to eval-setup-agent', () => {
	beforeEach(() => jest.clearAllMocks());

	it('delegates with create-empty (default) and only default-enabled metrics', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1', projectId: 'p1' }, {
			agent: {},
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

	it('link-existing: task references provided DataTable id', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!(
			{
				action: 'propose',
				workflowId: 'w1',
				datasetChoice: 'link-existing',
				existingDataTableId: 'dt-user-123',
			},
			{ agent: {} } as never,
		)) as Record<string, unknown>;

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

	it('link-existing: derives input columns from the existing DataTable schema', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		ctx.dataTableService.getSchema = jest.fn().mockResolvedValue([
			{ id: 'c1', name: 'targetUrl', type: 'string', index: 0 },
			{ id: 'c2', name: 'priceThresholdDollars', type: 'number', index: 1 },
			{ id: 'c3', name: 'expected_output', type: 'string', index: 2 },
		]);
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!(
			{
				action: 'propose',
				workflowId: 'w1',
				datasetChoice: 'link-existing',
				existingDataTableId: 'dt-real',
			},
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		const task = result.task as string;
		expect(task).toContain('- targetUrl');
		expect(task).toContain('- priceThresholdDollars');
		expect(task).toContain('- expected_output');
		expect(task).not.toMatch(/^- input$/m);
	});

	it('later: task tells the sub-agent to leave the dataTableId empty', async () => {
		const ctx = makeCtx(aiWf());
		mockInfer.mockResolvedValue(DEFAULT_EVAL_SHAPE);
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!(
			{ action: 'propose', workflowId: 'w1', datasetChoice: 'later' },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		const task = result.task as string;
		expect(task).toContain('Do not create a DataTable');
		expect(task).toContain('wire it manually later');
	});

	it('emits only metrics whose defaultEnabled is true', async () => {
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
			agent: {},
		} as never)) as Record<string, unknown>;

		const task = result.task as string;
		expect(task).toContain('Metric A');
		expect(task).not.toContain('Metric B');
	});
});
