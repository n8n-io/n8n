import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import { EvaluationTrigger, startingRow } from '../EvaluationTrigger/EvaluationTrigger.node.ee';
import * as utils from '../utils/evaluationTriggerUtils';

describe('Evaluation Trigger Node', () => {
	const sheetName = 'Sheet5';
	const spreadsheetId = '1oqFpPgEPTGDw7BPkp1SfPXq3Cb3Hyr1SROtf-Ec4zvA';

	let mockExecuteFunctions = mock<IExecuteFunctions>({
		getInputData: jest.fn().mockReturnValue([{ json: {} }]),
		getNode: jest.fn().mockReturnValue({ typeVersion: 4.6 }),
	});

	describe('Without filters', () => {
		beforeEach(() => {
			jest.resetAllMocks();

			mockExecuteFunctions = mock<IExecuteFunctions>({
				getInputData: jest.fn().mockReturnValue([{ json: {} }]),
				getNode: jest.fn().mockReturnValue({ typeVersion: 4.6 }),
			});

			jest.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet').mockImplementation(async () => {
				return { sheetId: 1, title: sheetName };
			});

			// Mocks getResults() and getRowsLeft()
			jest.spyOn(GoogleSheet.prototype, 'getData').mockImplementation(async (range: string) => {
				if (range === `${sheetName}!1:1`) {
					return [['Header1', 'Header2']];
				} else if (range === `${sheetName}!2:1000`) {
					return [
						['Header1', 'Header2'],
						['Value1', 'Value2'],
						['Value3', 'Value4'],
					];
				} else if (range === `${sheetName}!2:2`) {
					// getRowsLeft with limit
					return [];
				} else if (range === sheetName) {
					return [
						['Header1', 'Header2'],
						['Value1', 'Value2'],
						['Value3', 'Value4'],
					];
				} else {
					return [];
				}
			});
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
							row_number: 2,
							Header1: 'Value1',
							Header2: 'Value2',
							_rowsLeft: 2,
						},
						pairedItem: {
							item: 0,
						},
					},
				],
			]);

			expect(startingRow).toBe(3);
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

			const result = await new EvaluationTrigger().execute.call(mockExecuteFunctions, 2);

			expect(result).toEqual([
				[
					{
						json: {
							row_number: 2,
							Header1: 'Value1',
							Header2: 'Value2',
							_rowsLeft: 0,
						},
						pairedItem: {
							item: 0,
						},
					},
				],
			]);

			expect(startingRow).toBe(2);
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
						limitRows: true,
						maxRows: 2,
					};
					return mockParams[key] ?? fallbackValue;
				},
			);

			const result = await new EvaluationTrigger().execute.call(mockExecuteFunctions, 2);

			expect(result).toEqual([
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

			expect(startingRow).toBe(2);
		});
	});

	describe('With filters', () => {
		beforeEach(() => {
			jest.resetAllMocks();

			mockExecuteFunctions = mock<IExecuteFunctions>({
				getInputData: jest.fn().mockReturnValue([{ json: {} }]),
				getNode: jest.fn().mockReturnValue({ typeVersion: 4.6 }),
			});

			jest.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet').mockImplementation(async () => {
				return { sheetId: 1, title: sheetName };
			});
		});

		test('should return all relevant rows from google sheet using filter and test runner enabled', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: { requestDataset: true } }]);

			jest
				.spyOn(GoogleSheet.prototype, 'getData')
				.mockResolvedValueOnce([
					// operationResult
					['Header1', 'Header2'],
					['Value1', 'Value2'],
					['Value3', 'Value4'],
					['Value1', 'Value4'],
				])
				.mockResolvedValueOnce([
					// rowsLeft
					['Header1', 'Header2'],
					['Value1', 'Value2'],
					['Value3', 'Value4'],
					['Value1', 'Value4'],
				]);

			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
					const mockParams: { [key: string]: unknown } = {
						'filtersUI.values': [{ lookupColumn: 'Header1', lookupValue: 'Value1' }],
						options: {},
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

			jest.spyOn(utils, 'getRowsLeft').mockResolvedValue(0);

			const evaluationTrigger = new EvaluationTrigger();

			const result = await evaluationTrigger.execute.call(mockExecuteFunctions, 1);

			expect(result).toEqual([
				[
					{
						json: { row_number: 2, Header1: 'Value1', Header2: 'Value2' },
						pairedItem: {
							item: 0,
						},
					},
					{
						json: { row_number: 4, Header1: 'Value1', Header2: 'Value4' },
						pairedItem: {
							item: 0,
						},
					},
				],
			]);
		});

		test('should return a single row from google sheet using filter', async () => {
			jest
				.spyOn(GoogleSheet.prototype, 'getData')
				.mockResolvedValueOnce([
					// operationResult
					['Header1', 'Header2'],
					['Value1', 'Value2'],
					['Value3', 'Value4'],
				])
				.mockResolvedValueOnce([
					// rowsLeft
					['Header1', 'Header2'],
					['Value1', 'Value2'],
					['Value3', 'Value4'],
				]);

			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
					const mockParams: { [key: string]: unknown } = {
						limitRows: true,
						maxRows: 2,
						'filtersUI.values': [{ lookupColumn: 'Header1', lookupValue: 'Value1' }],
						options: {},
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

			jest.spyOn(utils, 'getRowsLeft').mockResolvedValue(0);

			const evaluationTrigger = new EvaluationTrigger();

			const result = await evaluationTrigger.execute.call(mockExecuteFunctions, 1);

			expect(result).toEqual([
				[
					{
						json: {
							row_number: 2,
							Header1: 'Value1',
							Header2: 'Value2',
							_rowsLeft: 0,
						},
						pairedItem: {
							item: 0,
						},
					},
				],
			]);
		});
	});
});
