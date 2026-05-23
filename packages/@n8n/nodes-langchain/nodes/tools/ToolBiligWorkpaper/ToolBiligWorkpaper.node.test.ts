import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ToolBiligWorkpaper } from './ToolBiligWorkpaper.node';

const workpaperJson = JSON.stringify({
	sheets: {
		Inputs: [
			['Metric', 'Value'],
			['Qualified opportunities', 20],
			['Win rate', 0.25],
			['Average ARR', 12000],
		],
		Summary: [
			['Metric', 'Value'],
			['Expected customers', '=Inputs!B2*Inputs!B3'],
			['Expected ARR', '=B2*Inputs!B4'],
		],
	},
});

describe('ToolBiligWorkpaper', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should sanitize tool name to be LLM API compatible', async () => {
		const node = new ToolBiligWorkpaper();

		const supplyDataResult = await node.supplyData.call(
			mock<ISupplyDataFunctions>({
				getNode: vi.fn(() => mock<INode>({ name: 'Bilig WorkPaper (1)' })),
				getNodeParameter: vi.fn().mockReturnValue(workpaperJson),
			}),
		);

		expect((supplyDataResult.response as { name: string }).name).toBe('Bilig_WorkPaper_1_');
	});

	it('should read a formula-backed range from a configured WorkPaper', async () => {
		const node = new ToolBiligWorkpaper();
		const inputData: INodeExecutionData[] = [
			{
				json: {
					operation: 'read_range',
					range: 'Summary!A1:B3',
				},
			},
		];

		const mockExecute = mock<IExecuteFunctions>({
			getInputData: vi.fn(() => inputData),
			getNode: vi.fn(() => mock<INode>({ name: 'Bilig WorkPaper' })),
			getNodeParameter: vi.fn().mockReturnValue(workpaperJson),
		});

		const result = await node.execute.call(mockExecute);
		const response = JSON.parse(result[0][0].json.response as string);

		expect(response.operation).toBe('read_range');
		expect(response.readback[1][1]).toEqual({
			value: 5,
			formula: '=Inputs!B2*Inputs!B3',
		});
		expect(response.readback[2][1]).toEqual({
			value: 60000,
			formula: '=B2*Inputs!B4',
		});
	});

	it('should update one input cell, recalculate formulas, and return persisted proof', async () => {
		const node = new ToolBiligWorkpaper();
		const inputData: INodeExecutionData[] = [
			{
				json: {
					operation: 'set_cell_and_read',
					sheetName: 'Inputs',
					cell: 'B3',
					value: 0.4,
					range: 'Summary!A1:B3',
				},
			},
		];

		const mockExecute = mock<IExecuteFunctions>({
			getInputData: vi.fn(() => inputData),
			getNode: vi.fn(() => mock<INode>({ name: 'Bilig WorkPaper' })),
			getNodeParameter: vi.fn().mockReturnValue(workpaperJson),
		});

		const result = await node.execute.call(mockExecute);
		const response = JSON.parse(result[0][0].json.response as string);

		expect(response.editedCell).toBe('Inputs!B3');
		expect(response.before[2][1]).toEqual({
			value: 60000,
			formula: '=B2*Inputs!B4',
		});
		expect(response.after[2][1]).toEqual({
			value: 96000,
			formula: '=B2*Inputs!B4',
		});
		expect(response.restoredMatchesAfter).toBe(true);
		expect(typeof response.updatedWorkPaper).toBe('string');
	});

	it('should validate formulas without requiring the configured WorkPaper', async () => {
		const node = new ToolBiligWorkpaper();
		const inputData: INodeExecutionData[] = [
			{
				json: {
					operation: 'validate_formula',
					formula: '=SUM(1, 2)',
				},
			},
		];

		const mockExecute = mock<IExecuteFunctions>({
			getInputData: vi.fn(() => inputData),
			getNode: vi.fn(() => mock<INode>({ name: 'Bilig WorkPaper' })),
			getNodeParameter: vi.fn().mockReturnValue(workpaperJson),
		});

		const result = await node.execute.call(mockExecute);
		const response = JSON.parse(result[0][0].json.response as string);

		expect(response).toMatchObject({
			operation: 'validate_formula',
			formula: '=SUM(1, 2)',
			valid: true,
		});
		expect(response.readback[0][0].value).toBe(3);
	});
});
