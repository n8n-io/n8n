import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'jest-mock-extended';

import type { InstanceAiContext } from '../../../types';
import { applyEvalSetup } from '../apply-eval-setup.service';
import { generateSampleRows } from '../generate-sample-rows.service';

jest.mock('../generate-sample-rows.service', () => ({
	generateSampleRows: jest.fn(),
}));
const mockGenerateSampleRows = generateSampleRows as jest.MockedFunction<typeof generateSampleRows>;

function makeContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	const ctx = mock<InstanceAiContext>();
	Object.assign(ctx, overrides);
	return ctx;
}

function makeLinearWf(): WorkflowJSON {
	return {
		name: 'Linear AI',
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
		connections: { T: { main: [[{ node: 'Agent' }]] } },
	} as unknown as WorkflowJSON;
}

function makeTwoTerminalWf(): WorkflowJSON {
	return {
		name: 'Branched AI',
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
				name: 'IF',
				type: 'n8n-nodes-base.if',
				typeVersion: 1,
				position: [200, 0],
				parameters: {},
			},
			{
				id: '3',
				name: 'A',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [400, -100],
				parameters: {},
			},
			{
				id: '4',
				name: 'B',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [400, 100],
				parameters: {},
			},
		],
		connections: {
			T: { main: [[{ node: 'IF' }]] },
			IF: { main: [[{ node: 'A' }], [{ node: 'B' }]] },
		},
	} as unknown as WorkflowJSON;
}

const PROPOSAL = {
	suggestedInputColumns: ['input'],
	suggestedOutputColumns: ['expected_output'],
	suggestedMetrics: [
		{
			id: 'correctness',
			name: 'Correctness',
			kind: 'llm-judge' as const,
			description: 'd',
			prompt: 'p',
			cannedMetricKey: 'correctness',
			defaultEnabled: true,
		},
	],
};

describe('applyEvalSetup — linear workflow, datasetChoice="later"', () => {
	it('patches the workflow with evalTrigger + setOutputs + setMetrics when one terminal', async () => {
		const wf = makeLinearWf();
		let saved: WorkflowJSON | null = null;
		const ctx = makeContext();
		ctx.workflowService.getAsWorkflowJSON = jest.fn().mockResolvedValue(wf);
		ctx.workflowService.updateFromWorkflowJSON = jest.fn(
			async (_id: string, json: WorkflowJSON) => {
				await Promise.resolve();
				saved = json;
			},
		) as unknown as typeof ctx.workflowService.updateFromWorkflowJSON;

		const result = await applyEvalSetup(ctx, {
			workflowId: 'w1',
			userChoice: { datasetChoice: 'later', enabledMetricIds: ['correctness'] },
			proposal: PROPOSAL,
		});

		expect(result.success).toBe(true);
		expect(saved).not.toBeNull();
		const savedJson = saved!;
		const names = savedJson.nodes.map((n) => n.name);
		expect(names).toContain('EvaluationTrigger');
		expect(names).toContain('EvaluationSetOutputs');
		expect(names).toContain('EvaluationSetMetrics');
		expect(savedJson.connections.EvaluationTrigger).toEqual({
			main: [[{ node: 'Agent', type: 'main', index: 0 }]],
		});
		expect(savedJson.connections.Agent).toEqual({
			main: [[{ node: 'EvaluationSetOutputs', type: 'main', index: 0 }]],
		});
		expect(savedJson.connections.EvaluationSetOutputs).toEqual({
			main: [[{ node: 'EvaluationSetMetrics', type: 'main', index: 0 }]],
		});
	});
});

describe('applyEvalSetup — two terminals', () => {
	it('inserts a Merge node and attaches setOutputs/setMetrics after it', async () => {
		const wf = makeTwoTerminalWf();
		let saved: WorkflowJSON | null = null;
		const ctx = makeContext();
		ctx.workflowService.getAsWorkflowJSON = jest.fn().mockResolvedValue(wf);
		ctx.workflowService.updateFromWorkflowJSON = jest.fn(
			async (_id: string, json: WorkflowJSON) => {
				await Promise.resolve();
				saved = json;
			},
		) as unknown as typeof ctx.workflowService.updateFromWorkflowJSON;

		const result = await applyEvalSetup(ctx, {
			workflowId: 'w1',
			userChoice: { datasetChoice: 'later', enabledMetricIds: ['correctness'] },
			proposal: PROPOSAL,
		});

		expect(result.success).toBe(true);
		const savedJson = saved!;
		const names = savedJson.nodes.map((n) => n.name);
		expect(names).toContain('EvalMerge');
		expect(savedJson.connections.A).toEqual({
			main: [[{ node: 'EvalMerge', type: 'main', index: 0 }]],
		});
		expect(savedJson.connections.B).toEqual({
			main: [[{ node: 'EvalMerge', type: 'main', index: 1 }]],
		});
		expect(savedJson.connections.EvalMerge).toEqual({
			main: [[{ node: 'EvaluationSetOutputs', type: 'main', index: 0 }]],
		});
	});
});

describe('applyEvalSetup — datasetChoice="link-existing"', () => {
	it('uses the provided dataTableId without creating a new one', async () => {
		const wf = makeLinearWf();
		let saved: WorkflowJSON | null = null;
		const ctx = makeContext();
		ctx.workflowService.getAsWorkflowJSON = jest.fn().mockResolvedValue(wf);
		ctx.workflowService.updateFromWorkflowJSON = jest.fn(
			async (_id: string, json: WorkflowJSON) => {
				await Promise.resolve();
				saved = json;
			},
		) as unknown as typeof ctx.workflowService.updateFromWorkflowJSON;
		ctx.dataTableService.create = jest.fn();

		const result = await applyEvalSetup(ctx, {
			workflowId: 'w1',
			userChoice: {
				datasetChoice: 'link-existing',
				existingDataTableId: 'dt-123',
				enabledMetricIds: ['correctness'],
			},
			proposal: PROPOSAL,
		});

		expect(result.success).toBe(true);
		expect(ctx.dataTableService.create).not.toHaveBeenCalled();
		const evalTrigger = saved!.nodes.find((n) => n.name === 'EvaluationTrigger')!;
		expect((evalTrigger.parameters as Record<string, unknown>).dataTableId).toEqual({
			mode: 'id',
			value: 'dt-123',
		});
	});
});

describe('applyEvalSetup — datasetChoice="generate"', () => {
	it('creates DataTable, generates rows, inserts them, and links via dataTableId', async () => {
		const wf = makeLinearWf();
		const ctx = makeContext();
		ctx.workflowService.getAsWorkflowJSON = jest.fn().mockResolvedValue(wf);
		ctx.workflowService.updateFromWorkflowJSON = jest.fn().mockResolvedValue(undefined);
		ctx.dataTableService.create = jest.fn().mockResolvedValue({
			id: 'dt-new',
			name: 'Linear AI — eval samples',
			projectId: 'p1',
		});
		ctx.dataTableService.insertRows = jest.fn().mockResolvedValue({
			insertedCount: 3,
			dataTableId: 'dt-new',
			tableName: 'x',
			projectId: 'p1',
		});
		mockGenerateSampleRows.mockResolvedValue([
			{ input: 'q1', expected_output: 'a1' },
			{ input: 'q2', expected_output: 'a2' },
			{ input: 'q3', expected_output: 'a3' },
		]);

		const result = await applyEvalSetup(ctx, {
			workflowId: 'w1',
			projectId: 'p1',
			userChoice: { datasetChoice: 'generate', enabledMetricIds: ['correctness'] },
			proposal: PROPOSAL,
		});

		expect(result.success).toBe(true);
		expect(result.dataTableId).toBe('dt-new');
		expect(ctx.dataTableService.create).toHaveBeenCalledWith(
			'Linear AI — eval samples',
			expect.arrayContaining([
				{ name: 'input', type: 'string' },
				{ name: 'expected_output', type: 'string' },
			]),
			{ projectId: 'p1' },
		);
		expect(ctx.dataTableService.insertRows).toHaveBeenCalledWith('dt-new', expect.any(Array));
	});

	it('rolls back the created DataTable when workflow save fails', async () => {
		const wf = makeLinearWf();
		const ctx = makeContext();
		ctx.workflowService.getAsWorkflowJSON = jest.fn().mockResolvedValue(wf);
		ctx.workflowService.updateFromWorkflowJSON = jest
			.fn()
			.mockRejectedValue(new Error('save failed'));
		ctx.dataTableService.create = jest
			.fn()
			.mockResolvedValue({ id: 'dt-new', name: 'x', projectId: 'p1' });
		ctx.dataTableService.insertRows = jest.fn().mockResolvedValue({
			insertedCount: 1,
			dataTableId: 'dt-new',
			tableName: 'x',
			projectId: 'p1',
		});
		ctx.dataTableService.delete = jest.fn().mockResolvedValue(undefined);
		mockGenerateSampleRows.mockResolvedValue([{ input: '', expected_output: '' }]);

		const result = await applyEvalSetup(ctx, {
			workflowId: 'w1',
			userChoice: { datasetChoice: 'generate', enabledMetricIds: ['correctness'] },
			proposal: PROPOSAL,
		});

		expect(result.success).toBe(false);
		expect(ctx.dataTableService.delete).toHaveBeenCalledWith('dt-new');
	});
});

describe('applyEvalSetup — error paths', () => {
	it('returns error when workflow has no main trigger', async () => {
		const ctx = makeContext();
		ctx.workflowService.getAsWorkflowJSON = jest.fn().mockResolvedValue({
			name: 'No trigger',
			nodes: [
				{
					id: '1',
					name: 'A',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON);

		const result = await applyEvalSetup(ctx, {
			workflowId: 'w1',
			userChoice: { datasetChoice: 'later', enabledMetricIds: [] },
			proposal: PROPOSAL,
		});

		expect(result.success).toBe(false);
		expect(result.errors?.[0]).toMatch(/no main trigger/i);
	});

	it('returns error when no valid terminals are found', async () => {
		const ctx = makeContext();
		ctx.workflowService.getAsWorkflowJSON = jest.fn().mockResolvedValue({
			name: 'Stop workflow',
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
					name: 'Err',
					type: 'n8n-nodes-base.stopAndError',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
			],
			connections: { T: { main: [[{ node: 'Err' }]] } },
		} as unknown as WorkflowJSON);

		const result = await applyEvalSetup(ctx, {
			workflowId: 'w1',
			userChoice: { datasetChoice: 'later', enabledMetricIds: [] },
			proposal: PROPOSAL,
		});

		expect(result.success).toBe(false);
		expect(result.errors?.[0]).toMatch(/attach eval capture/i);
	});
});
