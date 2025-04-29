import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { EvaluationTrigger, startingRow } from './EvaluationTrigger.node';
import { GoogleSheet } from '../Google/Sheet/v2/helpers/GoogleSheet';
import type {
	ResourceLocator,
	ValueRenderOption,
} from '../Google/Sheet/v2/helpers/GoogleSheets.types';

describe('Evaluation Trigger Node', () => {
	const sheetName = 'Sheet5';
	const spreadsheetId = '1oqFpPgEPTGDw7BPkp1SfPXq3Cb3Hyr1SROtf-Ec4zvA';

	let mockExecuteFunctions = mock<IExecuteFunctions>({
		getInputData: jest.fn().mockReturnValue([{ json: {} }]),
		getNode: jest.fn().mockReturnValue({ typeVersion: 4.6 }),
	});

	beforeEach(() => {
		jest.resetAllMocks();

		mockExecuteFunctions = mock<IExecuteFunctions>({
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNode: jest.fn().mockReturnValue({ typeVersion: 4.6 }),
		});

		jest
			.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet')
			.mockImplementation(async (node: INode, mode: ResourceLocator, value: string) => {
				return { sheetId: 1, title: sheetName };
			});

		jest
			.spyOn(GoogleSheet.prototype, 'getData')
			.mockImplementation(
				async (
					range: string,
					valueRenderMode: ValueRenderOption,
					dateTimeRenderOption?: string,
				) => {
					if (range === `${sheetName}!1:1`) {
						return [['Header1', 'Header2']];
					} else if (range === `${sheetName}!1:1000`) {
						return [
							['Header1', 'Header2'],
							['Value1', 'Value2'],
							['Value3', 'Value4'],
						];
					} else if (range === `${sheetName}!1:2`) {
						return [
							['Header1', 'Header2'],
							['Value1', 'Value2'],
						];
					} else {
						return [];
					}
				},
			);
	});

	test('should return a single row from google sheet', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
				const mockParams: { [key: string]: unknown } = {
					options: {},
					'filtersUI.values': [],
					combineFilters: 'AND',
					documentId: {
						mode: 'id',
						value: spreadsheetId,
					},
					sheetName,
					sheetMode: 'id',
				};
				return mockParams[key] ?? fallbackValue;
			},
		);

		const result = await new EvaluationTrigger().execute.call(mockExecuteFunctions);

		expect(result).toEqual([
			[
				{
					json: {
						row_number: 'row_number',
						Header1: 'Header1',
						Header2: 'Header2',
					},
					pairedItem: {
						item: 0,
					},
				},
				{
					json: {
						_rowsLeft: 2,
					},
					pairedItems: [
						{
							item: 0,
						},
					],
				},
			],
		]);

		expect(startingRow).toBe(2);
	});

	test('should return a single row from google sheet with limit', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
				const mockParams: { [key: string]: unknown } = {
					options: {},
					'filtersUI.values': [],
					combineFilters: 'AND',
					documentId: {
						mode: 'id',
						value: spreadsheetId,
					},
					sheetName,
					sheetMode: 'id',
					limitRows: true,
					maxRows: 1,
				};
				return mockParams[key] ?? fallbackValue;
			},
		);

		const result = await new EvaluationTrigger().execute.call(mockExecuteFunctions, 1);

		expect(result).toEqual([
			[
				{
					json: {
						row_number: 'row_number',
						Header1: 'Header1',
						Header2: 'Header2',
					},
					pairedItem: {
						item: 0,
					},
				},
				{
					json: {
						_rowsLeft: 0,
					},
					pairedItems: [
						{
							item: 0,
						},
					],
				},
			],
		]);

		expect(startingRow).toBe(2);
	});

	test('should return empty when no rows left', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
				const mockParams: { [key: string]: unknown } = {
					options: {},
					'filtersUI.values': [],
					combineFilters: 'AND',
					documentId: {
						mode: 'id',
						value: spreadsheetId,
					},
					sheetName,
					sheetMode: 'id',
					limitRows: true,
					maxRows: 2,
				};
				return mockParams[key] ?? fallbackValue;
			},
		);

		const result1 = await new EvaluationTrigger().execute.call(mockExecuteFunctions, 2);

		expect(result1).toEqual([
			[
				{
					json: {
						row_number: 2,
						Header1: 'Value1',
						Header2: 'Value2',
					},
					pairedItem: {
						item: 0,
					},
				},
				{
					json: {
						_rowsLeft: 0,
					},
					pairedItems: [
						{
							item: 0,
						},
					],
				},
			],
		]);

		expect(startingRow).toBe(3);

		const result2 = await new EvaluationTrigger().execute.call(mockExecuteFunctions);

		expect(result2).toEqual([]);

		expect(startingRow).toBe(1);
	});

	test('should return the sheet with limits applied when test runner is enabled', async () => {
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { requestDataset: true } }]);

		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
				const mockParams: { [key: string]: unknown } = {
					options: {},
					'filtersUI.values': [],
					combineFilters: 'AND',
					documentId: {
						mode: 'id',
						value: spreadsheetId,
					},
					sheetName,
					sheetMode: 'id',
				};
				return mockParams[key] ?? fallbackValue;
			},
		);

		const result = await new EvaluationTrigger().execute.call(mockExecuteFunctions, 1);

		expect(result).toEqual([
			[
				{
					json: {
						row_number: 'row_number',
						Header1: 'Header1',
						Header2: 'Header2',
					},
					pairedItem: {
						item: 0,
					},
				},
				{
					json: {
						row_number: 2,
						Header1: 'Value1',
						Header2: 'Value2',
					},
					pairedItem: {
						item: 0,
					},
				},
				{
					json: {
						row_number: 3,
						Header1: 'Value3',
						Header2: 'Value4',
					},
					pairedItem: {
						item: 0,
					},
				},
			],
		]);

		expect(startingRow).toBe(1);
	});

	test('should return a single row from google sheet with filter', async () => {});
});
