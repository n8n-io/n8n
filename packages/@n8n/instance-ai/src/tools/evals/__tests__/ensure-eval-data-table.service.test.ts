import { mock } from 'jest-mock-extended';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { ensureEvalDataTable } from '../ensure-eval-data-table.service';

jest.mock('../generate-sample-rows.service', () => ({ generateSampleRows: jest.fn() }));
import { generateSampleRows } from '../generate-sample-rows.service';
const mockGenerateSampleRows = generateSampleRows as jest.MockedFunction<typeof generateSampleRows>;

const WF: WorkflowJSON = { name: 'Test', nodes: [], connections: {} } as unknown as WorkflowJSON;

describe('ensureEvalDataTable', () => {
	beforeEach(() => jest.clearAllMocks());

	it('creates a DataTable with expected name and string columns', async () => {
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
			workflowName: 'My WF',
			projectId: 'p1',
			columns: ['input', 'expected_output'],
			workflowForSamples: WF,
		});

		expect(result).toEqual({ id: 'dt-1', name: 'x' });
		expect(ctx.dataTableService.create).toHaveBeenCalledWith(
			'My WF — eval samples',
			[
				{ name: 'input', type: 'string' },
				{ name: 'expected_output', type: 'string' },
			],
			{ projectId: 'p1' },
		);
	});

	it('inserts the generated rows', async () => {
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
		];
		mockGenerateSampleRows.mockResolvedValue(rows);

		await ensureEvalDataTable(ctx, {
			workflowName: 'My WF',
			projectId: 'p1',
			columns: ['input', 'expected_output'],
			workflowForSamples: WF,
		});

		expect(ctx.dataTableService.insertRows).toHaveBeenCalledWith('dt-2', rows);
	});
});
