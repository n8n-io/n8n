import { mock, mockDeep } from 'vitest-mock-extended';
import type {
	IDataObject,
	IHttpRequestOptions,
	INodeProperties,
	INodeParameters,
	IExecuteFunctions,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import { EvaluationTrigger } from '../EvaluationTrigger/EvaluationTrigger.node.ee';
import * as utils from '../utils/evaluationTriggerUtils';
import type { LangfuseDatasetItem } from '../utils/langfuse';
import type { Mock } from 'vitest';

type HttpRequest = (credential: string, options: IHttpRequestOptions) => Promise<unknown>;

describe('Evaluation Trigger Node', () => {
	const sheetName = 'Sheet5';
	const spreadsheetId = '1oqFpPgEPTGDw7BPkp1SfPXq3Cb3Hyr1SROtf-Ec4zvA';

	let mockExecuteFunctions = mock<IExecuteFunctions>({
		getInputData: vi.fn().mockReturnValue([{ json: {} }]),
		getNode: vi.fn().mockReturnValue({ typeVersion: 4.6 }),
	});

	let mockDataTable: { getManyRowsAndCount: Mock; getColumns: Mock };

	describe('execute', () => {
		describe('without filters', () => {
			beforeEach(() => {
				vi.resetAllMocks();

				mockExecuteFunctions = mock<IExecuteFunctions>({
					getInputData: vi.fn().mockReturnValue([{ json: {} }]),
					getNode: vi.fn().mockReturnValue({ typeVersion: 4.6 }),
				});

				vi.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet').mockImplementation(async () => {
					return { sheetId: 1, title: sheetName };
				});

				// Mocks getResults() and getRowsLeft()
				vi.spyOn(GoogleSheet.prototype, 'getData').mockImplementation(async (range: string) => {
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
				vi.resetAllMocks();

				mockExecuteFunctions = mock<IExecuteFunctions>({
					getInputData: vi.fn().mockReturnValue([{ json: {} }]),
					getNode: vi.fn().mockReturnValue({ typeVersion: 4.6 }),
				});

				vi.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet').mockImplementation(async () => {
					return { sheetId: 1, title: sheetName };
				});
			});

			test('should return a single row from google sheet using filter', async () => {
				vi.spyOn(GoogleSheet.prototype, 'getData')
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

				vi.spyOn(utils, 'getRowsLeft').mockResolvedValue(0);

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

		describe('Data tables with filters', () => {
			beforeEach(() => {
				vi.resetAllMocks();
				mockDataTable = {
					getManyRowsAndCount: vi.fn(),
					getColumns: vi.fn().mockResolvedValue([{ name: 'processed', type: 'number' }]),
				};

				mockExecuteFunctions = mockDeep<IExecuteFunctions>({
					getNode: vi.fn().mockReturnValue({ typeVersion: 4.7 }),
					helpers: {
						getDataTableProxy: vi.fn().mockResolvedValue(mockDataTable),
					},
				});
			});

			test('should process rows sequentially with filters when dataset changes', async () => {
				// Simulate the user's scenario: 5 rows with processed=1, updating to processed=2 after each execution
				// With each execution, one row is processed and thus no longer matches the filter
				mockDataTable.getManyRowsAndCount
					.mockResolvedValueOnce({
						data: [{ id: 1, processed: 1 }],
						count: 5,
					})
					.mockResolvedValueOnce({
						data: [{ id: 2, processed: 1 }],
						count: 4,
					})
					.mockResolvedValueOnce({
						data: [{ id: 3, processed: 1 }],
						count: 3,
					});

				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'dataTable',
							limitRows: false,
							dataTableId: 'mockDataTableId',
							'filters.conditions': [
								{
									keyName: 'processed',
									condition: 'eq',
									keyValue: '1',
								},
							],
							matchType: 'anyCondition',
						};
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
					},
				);

				const evaluationTrigger = new EvaluationTrigger();

				// First execution - no previous data
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				const result1 = await evaluationTrigger.execute.call(mockExecuteFunctions);

				expect(result1[0][0].json.row_id).toBe(1);
				expect(result1[0][0].json.row_number).toBe(0);
				expect(result1[0][0].json._rowsLeft).toBe(4);

				// Verify first call used user filter only (no id filter yet)
				expect(mockDataTable.getManyRowsAndCount).toHaveBeenNthCalledWith(1, {
					skip: 0,
					take: 1,
					filter: {
						type: 'or',
						filters: [
							{
								columnName: 'processed',
								condition: 'eq',
								value: '1',
							},
						],
					},
				});

				// Second execution - previous row was id=1
				mockExecuteFunctions.getInputData.mockReturnValue(result1[0]);
				const result2 = await evaluationTrigger.execute.call(mockExecuteFunctions);

				expect(result2[0][0].json.row_id).toBe(2);
				expect(result2[0][0].json.row_number).toBe(1);

				// Verify second call includes id > 1 filter
				expect(mockDataTable.getManyRowsAndCount).toHaveBeenNthCalledWith(2, {
					skip: 0,
					take: 1,
					filter: {
						type: 'and',
						filters: [
							{
								columnName: 'processed',
								condition: 'eq',
								value: '1',
							},
							{
								columnName: 'id',
								condition: 'gt',
								value: 1,
							},
						],
					},
				});

				// Third execution - previous row was id=2
				mockExecuteFunctions.getInputData.mockReturnValue(result2[0]);
				const result3 = await evaluationTrigger.execute.call(mockExecuteFunctions);

				expect(result3[0][0].json.row_id).toBe(3);
				expect(result3[0][0].json.row_number).toBe(2);

				// Verify third call includes id > 2 filter
				expect(mockDataTable.getManyRowsAndCount).toHaveBeenNthCalledWith(3, {
					skip: 0,
					take: 1,
					filter: {
						type: 'and',
						filters: [
							{
								columnName: 'processed',
								condition: 'eq',
								value: '1',
							},
							{
								columnName: 'id',
								condition: 'gt',
								value: 2,
							},
						],
					},
				});
			});

			test('should stop after maxRows when the table has more matching rows', async () => {
				mockDataTable.getManyRowsAndCount
					.mockResolvedValueOnce({ data: [{ id: 1 }], count: 5 })
					.mockResolvedValueOnce({ data: [{ id: 2 }], count: 4 })
					.mockResolvedValueOnce({ data: [{ id: 3 }], count: 3 });

				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'dataTable',
							limitRows: true,
							maxRows: 3,
							dataTableId: 'mockDataTableId',
							'filters.conditions': [],
							matchType: 'anyCondition',
						};
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
					},
				);

				const evaluationTrigger = new EvaluationTrigger();

				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				const result1 = await evaluationTrigger.execute.call(mockExecuteFunctions);
				expect(result1[0][0].json._rowsLeft).toBe(2);

				mockExecuteFunctions.getInputData.mockReturnValue(result1[0]);
				const result2 = await evaluationTrigger.execute.call(mockExecuteFunctions);
				expect(result2[0][0].json._rowsLeft).toBe(1);

				mockExecuteFunctions.getInputData.mockReturnValue(result2[0]);
				const result3 = await evaluationTrigger.execute.call(mockExecuteFunctions);
				expect(result3[0][0].json._rowsLeft).toBe(0);
			});

			test('should stop early when the table runs out before maxRows', async () => {
				mockDataTable.getManyRowsAndCount
					.mockResolvedValueOnce({ data: [{ id: 1 }], count: 2 })
					.mockResolvedValueOnce({ data: [{ id: 2 }], count: 1 });

				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
						const mockParams: { [key: string]: unknown } = {
							source: 'dataTable',
							limitRows: true,
							maxRows: 10,
							dataTableId: 'mockDataTableId',
							'filters.conditions': [],
							matchType: 'anyCondition',
						};
						return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
					},
				);

				const evaluationTrigger = new EvaluationTrigger();

				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				const result1 = await evaluationTrigger.execute.call(mockExecuteFunctions);
				expect(result1[0][0].json._rowsLeft).toBe(1);

				mockExecuteFunctions.getInputData.mockReturnValue(result1[0]);
				const result2 = await evaluationTrigger.execute.call(mockExecuteFunctions);
				expect(result2[0][0].json._rowsLeft).toBe(0);
			});
		});
	});

	describe('customOperations.dataset.getRows', () => {
		describe('Data tables', () => {
			beforeEach(() => {
				vi.resetAllMocks();
				mockDataTable = {
					getManyRowsAndCount: vi.fn().mockResolvedValue({
						data: [
							{ id: 1, field1: 'value1', field2: 'value2' },
							{ id: 2, field1: 'value3', field2: 'value4' },
						],
					}),
					getColumns: vi.fn().mockResolvedValue([
						{ name: 'field1', type: 'string' },
						{ name: 'field2', type: 'string' },
					]),
				};

				mockExecuteFunctions = mockDeep<IExecuteFunctions>({
					getNode: vi.fn().mockReturnValue({ typeVersion: 4.7 }),
					helpers: {
						getDataTableProxy: vi.fn().mockResolvedValue(mockDataTable),
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
				vi.resetAllMocks();

				mockExecuteFunctions = mock<IExecuteFunctions>({
					getNode: vi.fn().mockReturnValue({ typeVersion: 4.6 }),
				});

				vi.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet').mockImplementation(async () => {
					return { sheetId: 1, title: sheetName };
				});

				// Mocks getResults() and getRowsLeft()
				vi.spyOn(GoogleSheet.prototype, 'getData').mockImplementation(async (range: string) => {
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

				vi.spyOn(GoogleSheet.prototype, 'getData')
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

				vi.spyOn(utils, 'getRowsLeft').mockResolvedValue(0);

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

	describe('source visibility', () => {
		const description = new EvaluationTrigger().description;

		const visibleNames = (typeVersion: number, parameters: INodeParameters) => {
			const values = NodeHelpers.getNodeParameters(
				description.properties,
				parameters,
				true,
				false,
				{ typeVersion },
				description,
			) as INodeParameters;

			return description.properties
				.filter((property: INodeProperties) =>
					NodeHelpers.displayParameter(values, property, { typeVersion }, description),
				)
				.map((property) => property.name);
		};

		const sheetsParameters = ['notice', 'credentials', 'authentication', 'documentId', 'sheetName'];
		const langfuseParameters = ['langfuseDataset', 'langfuseDatasetVersion', 'langfuseOptions'];

		test('4.6 defaults to Google Sheets and shows the Sheets params only', () => {
			const names = visibleNames(4.6, {});

			expect(names).toEqual(expect.arrayContaining(sheetsParameters));
			expect(names).toEqual(expect.arrayContaining(['filtersUI']));
			for (const name of [...langfuseParameters, 'dataTableId']) {
				expect(names).not.toContain(name);
			}
		});

		test('4.7 defaults to Data table and hides the Sheets and Langfuse params', () => {
			const names = visibleNames(4.7, {});

			expect(names).toContain('dataTableId');
			for (const name of [...sheetsParameters, 'filtersUI', ...langfuseParameters]) {
				expect(names).not.toContain(name);
			}
		});

		test('4.7 with Google Sheets shows the Sheets params', () => {
			const names = visibleNames(4.7, { source: 'googleSheets' });

			expect(names).toEqual(expect.arrayContaining([...sheetsParameters, 'filtersUI']));
			expect(names).not.toContain('dataTableId');
			expect(names).not.toContain('langfuseDataset');
		});

		test.each([4.6, 4.7])('%s with Langfuse hides the Sheets and Data table params', (version) => {
			const names = visibleNames(version, { source: 'langfuse' });

			expect(names).toEqual(expect.arrayContaining(langfuseParameters));
			for (const name of [...sheetsParameters, 'filtersUI', 'dataTableId', 'filterRows']) {
				expect(names).not.toContain(name);
			}
			expect(names).toEqual(expect.arrayContaining(['limitRows']));
		});

		test('offers the three sources on the trigger', () => {
			const picker = description.properties.find((property) => property.name === 'source');

			expect(picker?.options?.map((option) => (option as { value: string }).value)).toEqual([
				'dataTable',
				'googleSheets',
				'langfuse',
			]);
		});

		test('declares the langfuseApi credential for the Langfuse source', () => {
			expect(description.credentials).toContainEqual({
				name: 'langfuseApi',
				required: true,
				displayOptions: { show: { source: ['langfuse'] } },
			});
		});

		test('registers the Langfuse dataset list search', () => {
			const dataset = description.properties.find(
				(property) => property.name === 'langfuseDataset',
			);
			const listMode = dataset?.modes?.find((mode) => mode.name === 'list');

			expect(listMode?.typeOptions).toMatchObject({
				searchListMethod: 'langfuseDatasetSearch',
				searchable: true,
			});
			expect(new EvaluationTrigger().methods.listSearch.langfuseDatasetSearch).toBeDefined();
		});

		test('does not change the Evaluation node source picker', async () => {
			const { Evaluation } = await import('../Evaluation/Evaluation.node.ee');
			const options = new Evaluation().description.properties
				.filter((property) => property.name === 'source')
				.flatMap((property) => property.options ?? [])
				.map((option) => (option as { value: string }).value);

			expect(new Set(options)).toEqual(new Set(['dataTable', 'googleSheets']));
		});
	});

	describe('Langfuse source', () => {
		type ServedItem = LangfuseDatasetItem & { createdAt: string };

		const BASE_CREATED_AT = Date.UTC(2026, 0, 1);

		const rawItems = (n: number, extra: Array<Partial<LangfuseDatasetItem>> = []): ServedItem[] =>
			Array.from({ length: n }, (_, i) => ({
				id: `item-${i}`,
				createdAt: new Date(BASE_CREATED_AT - i * 1000).toISOString(),
				status: 'ACTIVE' as const,
				input: { question: `q${i}` },
				expectedOutput: `a${i}`,
				metadata: { n: i },
				...extra[i],
			}));

		const archived = (id: string): Partial<LangfuseDatasetItem> => ({ id, status: 'ARCHIVED' });

		const withArchived = (pattern: string): ServedItem[] =>
			rawItems(pattern.length).map((entry, i) =>
				pattern[i] === 'x' ? { ...entry, status: 'ARCHIVED' as const } : entry,
			);

		const isRlc = (value: unknown): value is { __rl: true; value: unknown } =>
			typeof value === 'object' && value !== null && '__rl' in value;

		let request: Mock<HttpRequest>;
		let params: Record<string, unknown>;

		const mockLangfuse = (items: ServedItem[], includeArchived = true) => {
			request.mockImplementation(async (_credential, options) => {
				if (options.url.includes('/v2/datasets/')) {
					const name = decodeURIComponent(options.url.split('/v2/datasets/')[1]);
					return { id: name === 'my-dataset' ? 'ds-1' : `ds-${name}`, name };
				}
				const { page, limit, version } = options.qs as {
					page: number;
					limit: number;
					version?: string;
				};
				const list = items
					.filter((entry) => includeArchived || entry.status !== 'ARCHIVED')
					.filter((entry) => !version || Date.parse(entry.createdAt) <= Date.parse(version))
					.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
				return {
					data: list.slice((page - 1) * limit, page * limit),
					meta: {
						page,
						limit,
						totalItems: list.length,
						totalPages: Math.ceil(list.length / limit),
					},
				};
			});
		};

		const itemCalls = () =>
			request.mock.calls
				.map((call) => call[1])
				.filter((options) => options.url.endsWith('/dataset-items'));

		const datasetCalls = () =>
			request.mock.calls.filter((call) => call[1].url.includes('/v2/datasets/'));

		beforeEach(() => {
			vi.resetAllMocks();
			request = vi.fn<HttpRequest>();
			params = {
				source: 'langfuse',
				langfuseDataset: { __rl: true, mode: 'list', value: 'my-dataset' },
				langfuseDatasetVersion: '',
				langfuseOptions: {},
				limitRows: false,
			};

			mockExecuteFunctions = mockDeep<IExecuteFunctions>({
				getNode: vi.fn().mockReturnValue({ typeVersion: 4.7, name: 'Evaluation Trigger' }),
				getInputData: vi.fn().mockReturnValue([{ json: {} }]),
				getCredentials: vi.fn().mockResolvedValue({ host: 'https://langfuse.example.com' }),
				helpers: { httpRequestWithAuthentication: request },
			});
			mockExecuteFunctions.getNodeParameter.mockImplementation(((
				key: string,
				_: number,
				fallbackValue?: unknown,
				options?: { extractValue?: boolean },
			) => {
				const value = key in params ? params[key] : fallbackValue;
				return options?.extractValue && isRlc(value) ? value.value : value;
			}) as never);
		});

		const run = async (previous?: Record<string, unknown>) => {
			mockExecuteFunctions.getInputData.mockReturnValue([
				{ json: (previous ?? {}) as IDataObject },
			]);
			return await new EvaluationTrigger().execute.call(mockExecuteFunctions);
		};

		const runAll = async (limit = 50) => {
			const rows: Array<Record<string, any>> = [];
			let previous: Record<string, unknown> | undefined;
			for (let i = 0; i < limit; i++) {
				const [[row]] = await run(previous);
				rows.push(row.json);
				if (row.json._rowsLeft === 0) return rows;
				previous = row.json;
			}
			throw new Error('manual loop did not terminate');
		};

		const getRows = async () =>
			await new EvaluationTrigger().customOperations.dataset.getRows.call(mockExecuteFunctions);

		const summarize = (rows: Array<Record<string, any>>) =>
			rows.map((row) => [row.row_number, row._langfuse.itemId]);

		describe('execute', () => {
			test('returns the first row with the row contract and _rowsLeft', async () => {
				mockLangfuse(rawItems(3));

				const [[row]] = await run();

				expect(row.json).toEqual({
					question: 'q0',
					input: { question: 'q0' },
					expectedOutput: 'a0',
					metadata: { n: 0 },
					row_number: 0,
					_rowsLeft: 2,
					_langfuse: {
						datasetId: 'ds-1',
						datasetName: 'my-dataset',
						itemId: 'item-0',
						datasetVersion: null,
						fetchedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
						expectedOutput: 'a0',
						position: 0,
					},
				});
				expect(itemCalls()[0].qs).toEqual({
					datasetName: 'my-dataset',
					page: 1,
					limit: 1,
					version: (row.json._langfuse as { fetchedAt: string }).fetchedAt,
				});
			});

			test('reads the dataset name from the resource locator value', async () => {
				mockLangfuse(rawItems(1));

				await run();

				expect(datasetCalls()[0][1].url).toMatch(/\/v2\/datasets\/my-dataset$/);
				expect(itemCalls()[0].qs?.datasetName).toBe('my-dataset');
			});

			test('walks the whole dataset and ends on the last row', async () => {
				mockLangfuse(rawItems(4));

				const rows = await runAll();

				expect(summarize(rows)).toEqual([
					[0, 'item-0'],
					[1, 'item-1'],
					[2, 'item-2'],
					[3, 'item-3'],
				]);
				expect(rows.map((row) => row._rowsLeft)).toEqual([3, 2, 1, 0]);
			});

			test('fetches the dataset once, then reuses the ids carried by the previous row', async () => {
				mockLangfuse(rawItems(3));

				await runAll();

				expect(datasetCalls()).toHaveLength(1);
			});

			test('treats a carried row of another dataset as a fresh start', async () => {
				mockLangfuse(rawItems(3));
				params.langfuseDataset = { __rl: true, mode: 'name', value: 'other' };

				const [[row]] = await run({
					row_number: 4,
					_rowsLeft: 2,
					_langfuse: {
						datasetId: 'ds-1',
						datasetName: 'my-dataset',
						position: 7,
						fetchedAt: '2020-01-01T00:00:00.000Z',
					},
				});

				expect(datasetCalls()).toHaveLength(1);
				expect(row.json.row_number).toBe(0);
				expect(row.json._langfuse).toMatchObject({
					datasetId: 'ds-other',
					datasetName: 'other',
					itemId: 'item-0',
					position: 0,
					datasetVersion: null,
				});
				expect(itemCalls()[0].qs?.page).toBe(1);
				expect(
					itemCalls().some((options) => options.qs?.version === '2020-01-01T00:00:00.000Z'),
				).toBe(false);
				expect((row.json._langfuse as { fetchedAt: string }).fetchedAt).not.toBe(
					'2020-01-01T00:00:00.000Z',
				);
			});

			test('falls back to row_number when the previous row carries no position', async () => {
				mockLangfuse(rawItems(5));

				const [[row]] = await run({
					row_number: 1,
					_rowsLeft: 3,
					_langfuse: {
						datasetId: 'ds-1',
						datasetName: 'my-dataset',
						fetchedAt: '2026-06-01T00:00:00.000Z',
					},
				});

				expect(row.json.row_number).toBe(2);
				expect((row.json._langfuse as { itemId: string }).itemId).toBe('item-2');
				expect(itemCalls()[0].qs).toMatchObject({ page: 3, limit: 1 });
			});

			test('restarts from the first row when the previous run had no rows left', async () => {
				mockLangfuse(rawItems(3));

				const [[row]] = await run({ row_number: 2, _rowsLeft: 0 });

				expect(row.json.row_number).toBe(0);
			});

			test('throws No row found when the dataset is exhausted', async () => {
				mockLangfuse(rawItems(2));

				await expect(
					run({
						row_number: 5,
						_rowsLeft: 1,
						_langfuse: {
							datasetId: 'ds-1',
							datasetName: 'my-dataset',
							fetchedAt: '2026-06-01T00:00:00.000Z',
						},
					}),
				).rejects.toThrow('No row found');
			});

			test('throws No row found for an empty dataset', async () => {
				mockLangfuse([]);

				await expect(run()).rejects.toThrow('No row found');
			});

			describe.each([
				['archived items included in totalItems', true],
				['archived items filtered out by the server', false],
			])('with %s', (_label, includeArchived) => {
				test.each([
					['trailing archived items', 'ooxx'],
					['a single trailing archived item', 'ox'],
					['leading archived items', 'xxoo'],
					['archived items in the middle', 'xoxxoxo'],
					['only archived items before the last row', 'oxxxo'],
					['more than a page of trailing archived items', 'o' + 'x'.repeat(120)],
				])('ends cleanly and matches getRows row for row: %s', async (_name, pattern) => {
					mockLangfuse(withArchived(pattern), includeArchived);

					const rows = await runAll();
					const fromGetRows = (await getRows())![0].map((row) => row.json);

					expect(summarize(rows)).toEqual(summarize(fromGetRows));
					expect(rows.at(-1)?._rowsLeft).toBe(0);
					expect(rows.slice(0, -1).every((row) => (row._rowsLeft as number) > 0)).toBe(true);
				});

				test('counts only active items for maxRows, like getRows', async () => {
					mockLangfuse(withArchived('xoxoxoo'), includeArchived);
					params.limitRows = true;
					params.maxRows = 2;

					const rows = await runAll();
					const fromGetRows = (await getRows())![0].map((row) => row.json);

					expect(summarize(rows)).toEqual([
						[0, 'item-1'],
						[1, 'item-3'],
					]);
					expect(summarize(rows)).toEqual(summarize(fromGetRows));
					expect(rows.at(-1)?._rowsLeft).toBe(0);
				});

				test('a dataset of only archived items has no rows', async () => {
					mockLangfuse(withArchived('xxx'), includeArchived);

					await expect(run()).rejects.toThrow('No row found');
				});
			});

			test('honours maxRows when limitRows is on', async () => {
				mockLangfuse(rawItems(10));
				params.limitRows = true;
				params.maxRows = 2;

				const rows = await runAll();

				expect(rows.map((row) => row._rowsLeft)).toEqual([1, 0]);
			});

			describe('stable paging', () => {
				test('every request of every iteration is pinned to the first fetchedAt', async () => {
					mockLangfuse(rawItems(3));

					const [[first]] = await run();
					const firstFetchedAt = (first.json._langfuse as { fetchedAt: string }).fetchedAt;
					const callsAfterFirst = itemCalls().length;

					expect(itemCalls().every((options) => options.qs?.version === firstFetchedAt)).toBe(true);

					const [[second]] = await run(first.json);

					const laterCalls = itemCalls().slice(callsAfterFirst);
					expect(laterCalls.length).toBeGreaterThan(0);
					expect(laterCalls.every((options) => options.qs?.version === firstFetchedAt)).toBe(true);
					expect(second.json._langfuse).toMatchObject({
						fetchedAt: firstFetchedAt,
						datasetVersion: null,
					});
				});

				test.each([true, false])(
					'an item added between iterations is neither duplicated nor skipped (archived included: %s)',
					async (includeArchived) => {
						const items = rawItems(3);
						mockLangfuse(items, includeArchived);

						const [[first]] = await run();
						items.push({
							id: 'late',
							status: 'ACTIVE',
							createdAt: new Date(Date.now() + 60_000).toISOString(),
							input: { question: 'late' },
						});

						const rows = [first.json];
						let previous = first.json;
						while (previous._rowsLeft !== 0) {
							const [[next]] = await run(previous);
							rows.push(next.json);
							previous = next.json;
						}

						expect(rows.map((row) => (row._langfuse as { itemId: string }).itemId)).toEqual([
							'item-0',
							'item-1',
							'item-2',
						]);
						expect(rows.map((row) => row.row_number)).toEqual([0, 1, 2]);
					},
				);

				test('a user-pinned version wins over the carried fetchedAt', async () => {
					mockLangfuse(rawItems(3));
					params.langfuseDatasetVersion = '2026-01-21T14:35:42Z';

					const [[first]] = await run();
					const [[second]] = await run(first.json);

					expect(itemCalls().every((o) => o.qs?.version === '2026-01-21T14:35:42.000Z')).toBe(true);
					expect(second.json._langfuse).toMatchObject({
						datasetVersion: '2026-01-21T14:35:42.000Z',
						fetchedAt: (first.json._langfuse as { fetchedAt: string }).fetchedAt,
					});
				});

				test('a restart takes a new fetchedAt and pins to it', async () => {
					mockLangfuse(rawItems(2));
					const [[last]] = await run({
						row_number: 1,
						_rowsLeft: 0,
						_langfuse: {
							datasetId: 'ds-1',
							datasetName: 'my-dataset',
							fetchedAt: '2020-01-01T00:00:00.000Z',
							position: 1,
						},
					});

					const fetchedAt = (last.json._langfuse as { fetchedAt: string }).fetchedAt;
					expect(last.json.row_number).toBe(0);
					expect(fetchedAt).not.toBe('2020-01-01T00:00:00.000Z');
					expect(itemCalls().every((options) => options.qs?.version === fetchedAt)).toBe(true);
				});
			});

			test('pins the dataset version on every item request', async () => {
				mockLangfuse(rawItems(2));
				params.langfuseDatasetVersion = '2026-01-21T14:35:42Z';

				const [[row]] = await run();

				expect(itemCalls().every((o) => o.qs?.version === '2026-01-21T14:35:42.000Z')).toBe(true);
				expect((row.json._langfuse as { datasetVersion: string }).datasetVersion).toBe(
					'2026-01-21T14:35:42.000Z',
				);
			});

			test('throws on an invalid dataset version before calling Langfuse', async () => {
				mockLangfuse(rawItems(2));
				params.langfuseDatasetVersion = 'last tuesday';

				await expect(run()).rejects.toThrow('Invalid dataset version "last tuesday"');
				expect(request).not.toHaveBeenCalled();
			});

			test('does not flatten the input when flattenInput is off', async () => {
				mockLangfuse(rawItems(1));
				params.langfuseOptions = { flattenInput: false };

				const [[row]] = await run();

				expect(row.json).not.toHaveProperty('question');
				expect(row.json.input).toEqual({ question: 'q0' });
			});

			test('never lets flattened input keys override reserved keys', async () => {
				mockLangfuse(
					rawItems(1, [
						{
							input: {
								input: 'x',
								expectedOutput: 'x',
								metadata: 'x',
								row_number: 99,
								_rowsLeft: 99,
								_langfuse: 'x',
								safe: 'kept',
							},
						},
					]),
				);

				const [[row]] = await run();

				expect(row.json.safe).toBe('kept');
				expect(row.json.row_number).toBe(0);
				expect(row.json._rowsLeft).toBe(0);
				expect(row.json.expectedOutput).toBe('a0');
				expect(row.json.metadata).toEqual({ n: 0 });
				expect((row.json._langfuse as { itemId: string }).itemId).toBe('item-0');
				expect((row.json.input as { input: string }).input).toBe('x');
			});

			test('exposes the expected output under the configured field and raw in _langfuse', async () => {
				mockLangfuse(rawItems(1, [{ expectedOutput: { criteria: 'be nice' } }]));
				params.langfuseOptions = { expectedOutputField: 'criteria' };

				const [[row]] = await run();

				expect(row.json.criteria).toEqual({ criteria: 'be nice' });
				expect(row.json).not.toHaveProperty('expectedOutput');
				expect((row.json._langfuse as { expectedOutput: unknown }).expectedOutput).toEqual({
					criteria: 'be nice',
				});
			});

			test('omits metadata when includeMetadata is off', async () => {
				mockLangfuse(rawItems(1));
				params.langfuseOptions = { includeMetadata: false };

				const [[row]] = await run();

				expect(row.json).not.toHaveProperty('metadata');
			});

			test('encodes dataset names containing a slash', async () => {
				mockLangfuse(rawItems(1));
				params.langfuseDataset = { __rl: true, mode: 'name', value: 'team/support qa' };

				await run();

				expect(request.mock.calls[0][1].url).toBe(
					'https://langfuse.example.com/api/public/v2/datasets/team%2Fsupport%20qa',
				);
			});

			test.each(['input', 'metadata', 'row_number', '_rowsLeft', '_langfuse', '', '   '])(
				'rejects the expected output field %p before calling Langfuse',
				async (expectedOutputField) => {
					mockLangfuse(rawItems(1));
					params.langfuseOptions = { expectedOutputField };

					await expect(run()).rejects.toThrow('Invalid expected output field');
					expect(request).not.toHaveBeenCalled();
				},
			);
		});

		describe('customOperations.dataset.getRows', () => {
			test('returns every item with exactly the row contract and one shared fetchedAt', async () => {
				mockLangfuse(rawItems(2));
				params.langfuseDatasetVersion = '2026-01-21T14:35:42Z';

				const result = await getRows();

				const fetchedAt = (result![0][0].json._langfuse as { fetchedAt: string }).fetchedAt;
				expect(fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
				expect(result).toEqual([
					[0, 1].map((i) => ({
						json: {
							question: `q${i}`,
							input: { question: `q${i}` },
							expectedOutput: `a${i}`,
							metadata: { n: i },
							row_number: i,
							_langfuse: {
								datasetId: 'ds-1',
								datasetName: 'my-dataset',
								itemId: `item-${i}`,
								datasetVersion: '2026-01-21T14:35:42.000Z',
								fetchedAt,
								expectedOutput: `a${i}`,
							},
						},
						pairedItem: { item: 0 },
					})),
				]);
				expect(Object.keys(result![0][0].json)).toEqual([
					'question',
					'input',
					'expectedOutput',
					'metadata',
					'row_number',
					'_langfuse',
				]);
			});

			test('drops archived items and numbers rows over the remaining list', async () => {
				mockLangfuse(rawItems(3, [{}, archived('item-1')]));

				const result = await getRows();

				expect(result![0].map((row) => row.json.row_number)).toEqual([0, 1]);
				expect(result![0].map((row) => (row.json._langfuse as { itemId: string }).itemId)).toEqual([
					'item-0',
					'item-2',
				]);
			});

			test('caps the rows at maxRows when limitRows is on', async () => {
				mockLangfuse(rawItems(10));
				params.limitRows = true;
				params.maxRows = 3;

				const result = await getRows();

				expect(result![0]).toHaveLength(3);
			});

			test('pages through large datasets', async () => {
				mockLangfuse(rawItems(120));

				const result = await getRows();

				expect(result![0]).toHaveLength(120);
				expect(itemCalls().map((options) => options.qs?.page)).toEqual([1, 2, 3]);
				expect(itemCalls().every((options) => options.qs?.limit === 50)).toBe(true);
			});

			test('returns no rows for an empty dataset', async () => {
				mockLangfuse([]);

				expect(await getRows()).toEqual([[]]);
			});

			test('pins every item request to the fetch time when no version is set', async () => {
				mockLangfuse(rawItems(120));

				const result = await getRows();

				const { fetchedAt } = result![0][0].json._langfuse as { fetchedAt: string };
				expect(itemCalls()).toHaveLength(3);
				expect(itemCalls().every((options) => options.qs?.version === fetchedAt)).toBe(true);
			});

			test('pins every item request to the user-pinned version', async () => {
				mockLangfuse(rawItems(120));
				params.langfuseDatasetVersion = '2026-01-21T14:35:42Z';

				await getRows();

				expect(itemCalls()).toHaveLength(3);
				expect(itemCalls().every((o) => o.qs?.version === '2026-01-21T14:35:42.000Z')).toBe(true);
			});

			test('refuses to call a host the credential does not allow', async () => {
				mockLangfuse(rawItems(1));
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					host: 'https://langfuse.example.com',
					allowedHttpRequestDomains: 'domains',
					allowedDomains: 'other.example.com',
				});

				await expect(getRows()).rejects.toThrow('Domain not allowed');
				await expect(run()).rejects.toThrow('Domain not allowed');
				expect(request).not.toHaveBeenCalled();
			});

			test('rejects an invalid dataset version', async () => {
				mockLangfuse(rawItems(1));
				params.langfuseDatasetVersion = 'nope';

				await expect(getRows()).rejects.toThrow('Invalid dataset version "nope"');
			});

			test('applies the renamed expected-output field and flatten option', async () => {
				mockLangfuse(rawItems(1, [{ expectedOutput: 'good' }]));
				params.langfuseOptions = {
					expectedOutputField: 'criteria',
					flattenInput: false,
					includeMetadata: false,
				};

				const result = await getRows();

				expect(Object.keys(result![0][0].json)).toEqual([
					'input',
					'criteria',
					'row_number',
					'_langfuse',
				]);
			});

			test.each(['input', 'metadata', 'row_number', '_rowsLeft', '_langfuse', '', '   '])(
				'rejects the expected output field %p before calling Langfuse',
				async (expectedOutputField) => {
					mockLangfuse(rawItems(1));
					params.langfuseOptions = { expectedOutputField };

					await expect(getRows()).rejects.toThrow('Invalid expected output field');
					expect(request).not.toHaveBeenCalled();
				},
			);
		});
	});
});
