import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';

import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import { EvaluationTrigger } from '../EvaluationTrigger/EvaluationTrigger.node.ee';
import * as utils from '../utils/evaluationTriggerUtils';

describe('Evaluation Trigger Node', () => {
	const sheetName = 'Sheet5';
	const spreadsheetId = '1oqFpPgEPTGDw7BPkp1SfPXq3Cb3Hyr1SROtf-Ec4zvA';

	let mockExecuteFunctions = mock<IExecuteFunctions>({
		getInputData: jest.fn().mockReturnValue([{ json: {} }]),
		getNode: jest.fn().mockReturnValue({ typeVersion: 4.6 }),
	});

	let mockDataTable: { getManyRowsAndCount: jest.Mock; getColumns: jest.Mock };

	describe('execute', () => {
		describe('without filters', () => {
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

			test('credential test for googleApi should be in methods', async () => {
				const evaluationTrigger = new EvaluationTrigger();
				expect(evaluationTrigger.methods.credentialTest.googleApiCredentialTest).toBeDefined();
			});

			test('should return a single row from google sheet', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'googleSheets',
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
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
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
			});

			test('should return the next row from google sheet', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{
						json: {
							row_number: 2,
							Header1: 'Value1',
							Header2: 'Value2',
							_rowsLeft: 1,
						},
						pairedItem: {
							item: 0,
							input: undefined,
						},
					},
				]);
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'googleSheets',
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
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
					},
				);

				const result = await new EvaluationTrigger().execute.call(mockExecuteFunctions);

				expect(result).toEqual([
					[
						{
							json: {
								row_number: 3,
								Header1: 'Value3',
								Header2: 'Value4',
								_rowsLeft: 0,
							},
							pairedItem: {
								item: 0,
							},
						},
					],
				]);
			});

			test('should return the first row from google sheet if no rows left', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{
						json: {
							row_number: 3,
							Header1: 'Value3',
							Header2: 'Value4',
							_rowsLeft: 0,
						},
						pairedItem: {
							item: 0,
							input: undefined,
						},
					},
				]);
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'googleSheets',
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
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
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
			});

			test('should return a single row from google sheet with limit', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'googleSheets',
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
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
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

		describe('with filters', () => {
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
							source: 'googleSheets',
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
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
					},
				);

				jest.spyOn(utils, 'getRowsLeft').mockResolvedValue(0);

				const evaluationTrigger = new EvaluationTrigger();

				const result = await evaluationTrigger.execute.call(mockExecuteFunctions);

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

	describe('customOperations.dataset.getRows', () => {
		describe('Data tables', () => {
			beforeEach(() => {
				jest.resetAllMocks();
				mockDataTable = {
					getManyRowsAndCount: jest.fn().mockResolvedValue({
						data: [
							{ id: 1, field1: 'value1', field2: 'value2' },
							{ id: 2, field1: 'value3', field2: 'value4' },
						],
					}),
					getColumns: jest.fn().mockResolvedValue([
						{ name: 'field1', type: 'string' },
						{ name: 'field2', type: 'string' },
					]),
				};

				mockExecuteFunctions = mockDeep<IExecuteFunctions>({
					getNode: jest.fn().mockReturnValue({ typeVersion: 4.7 }),
					helpers: {
						getDataTableProxy: jest.fn().mockResolvedValue(mockDataTable),
					},
				});
			});

			test('should return the rows with limits applied, without filters', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'dataTable',
							limitRows: true,
							maxRows: 2,
							dataTableId: 'mockDataTableId',
						};
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
					},
				);

				const result = await new EvaluationTrigger().customOperations.dataset.getRows.call(
					mockExecuteFunctions,
				);

				expect(mockDataTable.getManyRowsAndCount).toHaveBeenCalledWith({
					skip: 0,
					take: 2,
					filter: { filters: [], type: 'or' },
				});

				expect(result).toEqual([
					[
						{
							json: {
								id: 1,
								row_id: 1,
								row_number: 0,
								field1: 'value1',
								field2: 'value2',
							},
							pairedItem: {
								item: 0,
							},
						},
						{
							json: {
								id: 2,
								row_id: 2,
								row_number: 1,
								field1: 'value3',
								field2: 'value4',
							},
							pairedItem: {
								item: 0,
							},
						},
					],
				]);
			});

			test('should return the rows with limits applied, with filters', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'dataTable',
							limitRows: true,
							maxRows: 2,
							dataTableId: 'mockDataTableId',
							'filters.conditions': [
								{
									keyName: 'field1',
									condition: 'like',
									keyValue: '1',
								},
								{
									keyName: 'field2',
									condition: 'eq',
									keyValue: 'value4',
								},
							],
						};
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
					},
				);

				await new EvaluationTrigger().customOperations.dataset.getRows.call(mockExecuteFunctions);

				expect(mockDataTable.getManyRowsAndCount).toHaveBeenCalledWith({
					skip: 0,
					take: 2,
					filter: {
						filters: [
							{
								columnName: 'field1',
								condition: 'like',
								value: '1',
							},
							{
								columnName: 'field2',
								condition: 'eq',
								value: 'value4',
							},
						],
						type: 'or',
					},
				});
			});
		});

		describe('Google Sheets', () => {
			beforeEach(() => {
				jest.resetAllMocks();

				mockExecuteFunctions = mock<IExecuteFunctions>({
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

			test('should return the sheet with limits applied, without filters', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'googleSheets',
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
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
					},
				);

				const result = await new EvaluationTrigger().customOperations.dataset.getRows.call(
					mockExecuteFunctions,
				);

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
			});

			test('should return all relevant rows from google sheet using filters', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);

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
							source: 'googleSheets',
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
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
					},
				);

				jest.spyOn(utils, 'getRowsLeft').mockResolvedValue(0);

				const evaluationTrigger = new EvaluationTrigger();

				const result =
					await evaluationTrigger.customOperations.dataset.getRows.call(mockExecuteFunctions);

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
		});
	});
});
