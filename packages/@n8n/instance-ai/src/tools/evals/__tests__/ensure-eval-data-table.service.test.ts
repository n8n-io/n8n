import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { mock } from 'jest-mock-extended';

import type { InstanceAiContext } from '../../../types';
import { ensureEvalDataTable } from '../ensure-eval-data-table.service';
import { generateSampleRows } from '../generate-sample-rows.service';

jest.mock('../generate-sample-rows.service', () => ({
	generateSampleRows: jest.fn(),
}));

const mockGenerateSampleRows = generateSampleRows as jest.MockedFunction<typeof generateSampleRows>;

const WF: WorkflowJSON = {
	name: 'Linear AI',
	nodes: [],
	connections: {},
} as unknown as WorkflowJSON;

describe('ensureEvalDataTable', () => {
	beforeEach(() => jest.clearAllMocks());

	it('creates a DataTable with the expected name and string columns', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.dataTableService.create = jest
			.fn()
			.mockResolvedValue({ id: 'dt-1', name: 'x', projectId: 'p1' });
		ctx.dataTableService.insertRows = jest
			.fn()
			.mockResolvedValue({
				insertedCount: 1,
				dataTableId: 'dt-1',
				tableName: 'x',
				projectId: 'p1',
			});
		mockGenerateSampleRows.mockResolvedValue([{ input: 'q', expected_output: 'a' }]);

		const result = await ensureEvalDataTable(ctx, {
			workflowName: 'Linear AI',
			projectId: 'p1',
			columns: ['input', 'expected_output'],
			workflowForSamples: WF,
		});

		expect(result).toEqual({ id: 'dt-1', name: 'x' });
		expect(ctx.dataTableService.create).toHaveBeenCalledWith(
			'Linear AI — eval samples',
			[
				{ name: 'input', type: 'string' },
				{ name: 'expected_output', type: 'string' },
			],
			{ projectId: 'p1' },
		);
	});

	it('omits the options object when projectId is not provided', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.dataTableService.create = jest
			.fn()
			.mockResolvedValue({ id: 'dt-1', name: 'x', projectId: 'p1' });
		ctx.dataTableService.insertRows = jest
			.fn()
			.mockResolvedValue({
				insertedCount: 1,
				dataTableId: 'dt-1',
				tableName: 'x',
				projectId: 'p1',
			});
		mockGenerateSampleRows.mockResolvedValue([{ input: '', expected_output: '' }]);

		await ensureEvalDataTable(ctx, {
			workflowName: 'X',
			columns: ['input', 'expected_output'],
			workflowForSamples: WF,
		});

		expect(ctx.dataTableService.create).toHaveBeenCalledWith(
			'X — eval samples',
			expect.any(Array),
			undefined,
		);
	});

	it('inserts sample rows after creating the DataTable', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.dataTableService.create = jest
			.fn()
			.mockResolvedValue({ id: 'dt-2', name: 'y', projectId: 'p1' });
		ctx.dataTableService.insertRows = jest
			.fn()
			.mockResolvedValue({
				insertedCount: 3,
				dataTableId: 'dt-2',
				tableName: 'y',
				projectId: 'p1',
			});
		const rows = [
			{ input: 'q1', expected_output: 'a1' },
			{ input: 'q2', expected_output: 'a2' },
			{ input: 'q3', expected_output: 'a3' },
		];
		mockGenerateSampleRows.mockResolvedValue(rows);

		await ensureEvalDataTable(ctx, {
			workflowName: 'X',
			projectId: 'p1',
			columns: ['input', 'expected_output'],
			workflowForSamples: WF,
		});

		expect(ctx.dataTableService.insertRows).toHaveBeenCalledWith('dt-2', rows);
	});

	it('propagates errors from dataTableService.create', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.dataTableService.create = jest.fn().mockRejectedValue(new Error('quota exceeded'));

		await expect(
			ensureEvalDataTable(ctx, {
				workflowName: 'X',
				columns: ['input'],
				workflowForSamples: WF,
			}),
		).rejects.toThrow('quota exceeded');
	});
});
