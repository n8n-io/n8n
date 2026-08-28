import type { IExecuteFunctions } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { setInputs, setOutputs } from '../utils/evaluationUtils';

vi.mock('../utils/evaluationTriggerUtils', () => ({
	getGoogleSheet: vi.fn(),
	getSheet: vi.fn(),
}));

import { getGoogleSheet, getSheet } from '../utils/evaluationTriggerUtils';

import { mockDeep } from 'vitest-mock-extended';

describe('setInputs', () => {
	const mockThis = (options: Partial<any> = {}) =>
		mockDeep<IExecuteFunctions>({
			getNode: vi.fn().mockReturnValue({ name: 'EvalNode' }),
			getParentNodes: vi
				.fn()
				.mockReturnValue([{ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' }]),
			evaluateExpression: vi.fn().mockReturnValue(true),
			getNodeParameter: vi.fn().mockReturnValue([
				{ inputName: 'foo', inputValue: 'bar' },
				{ inputName: 'baz', inputValue: 'qux' },
			]),
			getInputData: vi.fn().mockReturnValue([{ json: { test: 1 } }]),
			addExecutionHints: vi.fn(),
			getMode: vi.fn().mockReturnValue('evaluation'),
			...options,
		});

	it('should return input data with evaluationData when inputs are provided', () => {
		const context = mockThis();
		const result = setInputs.call(context);
		expect(result).toHaveLength(1);
		expect(result[0][0].evaluationData).toEqual({ foo: 'bar', baz: 'qux' });
	});

	it('should throw UserError if no input fields are provided', () => {
		const context = mockThis({
			getNodeParameter: vi.fn().mockReturnValue([]),
		});
		expect(() => setInputs.call(context)).toThrow(UserError);
	});

	it('should add execution hints and return input data if not started from evaluation trigger', () => {
		const context = mockThis({
			getParentNodes: vi.fn().mockReturnValue([]),
			getInputData: vi.fn().mockReturnValue([{ json: { test: 2 } }]),
		});
		const result = setInputs.call(context);
		expect(context.addExecutionHints).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('No inputs were set'),
			}),
		);
		expect(result).toEqual([[{ json: { test: 2 } }]]);
	});

	it('should add execution hints and return input data if evalTriggerOutput is falsy', () => {
		const context = mockThis({
			evaluateExpression: vi.fn().mockReturnValue(undefined),
			getInputData: vi.fn().mockReturnValue([{ json: { test: 3 } }]),
		});
		const result = setInputs.call(context);
		expect(context.addExecutionHints).toHaveBeenCalled();
		expect(result).toEqual([[{ json: { test: 3 } }]]);
	});
});

describe('setOutputs', () => {
	describe('common', () => {
		const mockThis = (options: Partial<IExecuteFunctions> = {}) =>
			mockDeep<IExecuteFunctions>({
				getNode: vi.fn().mockReturnValue({ name: 'EvalNode' }),
				getParentNodes: vi
					.fn()
					.mockReturnValue([{ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' }]),
				evaluateExpression: vi.fn().mockImplementation((expr: string) => {
					if (expr.includes('isExecuted')) return true;
					if (expr.includes('first().json')) return { row_id: 1, inputField: 'inputValue' };
					return true;
				}),
				getNodeParameter: vi.fn().mockImplementation((param: string) => {
					if (param === 'outputs.values') {
						return [{ outputName: 'result', outputValue: 'success' }];
					}
				}),
				getInputData: vi.fn().mockReturnValue([{ json: { test: 1 } }]),
				addExecutionHints: vi.fn(),
				getMode: vi.fn().mockReturnValue('evaluation'),
				...options,
			});

		it('should throw UserError if no output fields are provided', async () => {
			const context = mockThis({
				getNodeParameter: vi.fn().mockReturnValue([]),
			});
			await expect(setOutputs.call(context)).rejects.toThrow(UserError);
			await expect(setOutputs.call(context)).rejects.toThrow('No outputs to set');
		});

		it('should add execution hints and return input data if not started from evaluation trigger', async () => {
			const context = mockThis({
				getParentNodes: vi.fn().mockReturnValue([]),
				getInputData: vi.fn().mockReturnValue([{ json: { test: 2 } }]),
			});
			const result = await setOutputs.call(context);

			expect(context.addExecutionHints).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining("execution didn't start from an evaluation trigger"),
				}),
			);
			expect(result).toEqual([[{ json: { test: 2 } }]]);
			expect(getGoogleSheet).not.toHaveBeenCalled();
		});

		it('should add execution hints and return input data if evalTriggerOutput is falsy', async () => {
			const context = mockThis({
				evaluateExpression: vi.fn().mockImplementation((expr: string) => {
					if (expr.includes('isExecuted')) return false;
					return true;
				}),
				getInputData: vi.fn().mockReturnValue([{ json: { test: 3 } }]),
			});
			const result = await setOutputs.call(context);

			expect(context.addExecutionHints).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining("execution didn't start from an evaluation trigger"),
				}),
			);
			expect(result).toEqual([[{ json: { test: 3 } }]]);
		});
	});

	describe('Data tables', () => {
		const outputValues = [
			{ outputName: 'result', outputValue: 'success' },
			{ outputName: 'score', outputValue: 95 },
			{ outputName: 'active', outputValue: true },
			{ outputName: 'timestamp', outputValue: new Date('2025-09-18T12:34:56Z') },
			{ outputName: 'data', outputValue: { key: 'value' } },
		];

		const mockDataTable = {
			updateRows: vi.fn(),
			getColumns: vi.fn().mockReturnValue(outputValues.map((o) => ({ name: o.outputName }))),
			addColumn: vi.fn(),
		};

		const mockThis = (options: Partial<IExecuteFunctions> = {}) =>
			mockDeep<IExecuteFunctions>({
				getNode: vi.fn().mockReturnValue({ name: 'EvalNode' }),
				getParentNodes: vi
					.fn()
					.mockReturnValue([{ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' }]),
				evaluateExpression: vi.fn().mockImplementation((expr: string) => {
					if (expr.includes('isExecuted')) return true;
					if (expr.includes('first().json')) return { row_id: 1, inputField: 'inputValue' };
					return true;
				}),
				getNodeParameter: vi.fn().mockImplementation((param: string) => {
					if (param === 'outputs.values') {
						return outputValues;
					} else if (param === 'source') {
						return 'dataTable';
					} else if (param === 'dataTableId') {
						return 'mockDataTableId';
					}
				}),
				getInputData: vi.fn().mockReturnValue([{ json: { test: 1 } }]),
				addExecutionHints: vi.fn(),
				getMode: vi.fn().mockReturnValue('evaluation'),
				helpers: {
					getDataTableProxy: vi.fn().mockResolvedValue(mockDataTable),
				},
				...options,
			});

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should set outputs to Data table and return evaluation data', async () => {
			const context = mockThis();
			const result = await setOutputs.call(context);

			expect(mockDataTable.getColumns).toHaveBeenCalled();
			expect(mockDataTable.addColumn).not.toHaveBeenCalled();
			expect(mockDataTable.updateRows).toHaveBeenCalledWith({
				filter: {
					type: 'and',
					filters: [
						{
							columnName: 'id',
							condition: 'eq',
							value: 1,
						},
					],
				},
				data: {
					result: 'success',
					score: 95,
					active: true,
					timestamp: new Date('2025-09-18T12:34:56'),
					data: '{"key":"value"}',
				},
			});

			expect(result).toHaveLength(1);
			expect(result[0][0].evaluationData).toEqual({
				result: 'success',
				score: 95,
				active: true,
				timestamp: new Date('2025-09-18T12:34:56'),
				data: { key: 'value' },
			});
		});

		it('should set outputs to Data table, correct subsequent row', async () => {
			const context = mockThis({
				evaluateExpression: vi.fn().mockImplementation((expr: string) => {
					if (expr.includes('isExecuted')) return true;
					if (expr.includes('first().json')) return { row_id: 3, inputField: 'inputValue' };
					return true;
				}),
			});
			await setOutputs.call(context);

			expect(mockDataTable.updateRows).toHaveBeenCalledWith(
				expect.objectContaining({
					filter: {
						type: 'and',
						filters: [
							{
								columnName: 'id',
								condition: 'eq',
								value: 3,
							},
						],
					},
				}),
			);
		});

		it("should create columns if they don't exist, string", async () => {
			const context = mockThis({
				getNodeParameter: vi.fn().mockImplementation((param: string) => {
					if (param === 'outputs.values') {
						return [...outputValues, { outputName: 'new_column', outputValue: 'new_value' }];
					} else if (param === 'source') {
						return 'dataTable';
					} else if (param === 'dataTableId') {
						return 'mockDataTableId';
					}
				}),
			});
			const result = await setOutputs.call(context);

			expect(mockDataTable.getColumns).toHaveBeenCalled();
			expect(mockDataTable.addColumn).toHaveBeenCalledWith({
				name: 'new_column',
				type: 'string',
			});
			expect(mockDataTable.updateRows).toHaveBeenCalledWith({
				filter: {
					type: 'and',
					filters: [
						{
							columnName: 'id',
							condition: 'eq',
							value: 1,
						},
					],
				},
				data: {
					result: 'success',
					score: 95,
					active: true,
					timestamp: new Date('2025-09-18T12:34:56'),
					data: '{"key":"value"}',
					new_column: 'new_value',
				},
			});

			expect(result).toHaveLength(1);
			expect(result[0][0].evaluationData).toEqual({
				result: 'success',
				score: 95,
				active: true,
				timestamp: new Date('2025-09-18T12:34:56'),
				data: { key: 'value' },
				new_column: 'new_value',
			});
		});

		it("should create columns if they don't exist, number", async () => {
			const context = mockThis({
				getNodeParameter: vi.fn().mockImplementation((param: string) => {
					if (param === 'outputs.values') {
						return [...outputValues, { outputName: 'new_column', outputValue: 123.45 }];
					} else if (param === 'source') {
						return 'dataTable';
					} else if (param === 'dataTableId') {
						return 'mockDataTableId';
					}
				}),
			});
			await setOutputs.call(context);

			expect(mockDataTable.addColumn).toHaveBeenCalledWith({
				name: 'new_column',
				type: 'number',
			});
		});

		it("should create columns if they don't exist, boolean", async () => {
			const context = mockThis({
				getNodeParameter: vi.fn().mockImplementation((param: string) => {
					if (param === 'outputs.values') {
						return [...outputValues, { outputName: 'new_column', outputValue: true }];
					} else if (param === 'source') {
						return 'dataTable';
					} else if (param === 'dataTableId') {
						return 'mockDataTableId';
					}
				}),
			});
			await setOutputs.call(context);

			expect(mockDataTable.addColumn).toHaveBeenCalledWith({
				name: 'new_column',
				type: 'boolean',
			});
		});

		it("should create columns if they don't exist, date", async () => {
			const context = mockThis({
				getNodeParameter: vi.fn().mockImplementation((param: string) => {
					if (param === 'outputs.values') {
						return [...outputValues, { outputName: 'new_column', outputValue: new Date() }];
					} else if (param === 'source') {
						return 'dataTable';
					} else if (param === 'dataTableId') {
						return 'mockDataTableId';
					}
				}),
			});
			await setOutputs.call(context);

			expect(mockDataTable.addColumn).toHaveBeenCalledWith({
				name: 'new_column',
				type: 'date',
			});
		});

		it("should create columns if they don't exist, null", async () => {
			const context = mockThis({
				getNodeParameter: vi.fn().mockImplementation((param: string) => {
					if (param === 'outputs.values') {
						return [...outputValues, { outputName: 'new_column', outputValue: null }];
					} else if (param === 'source') {
						return 'dataTable';
					} else if (param === 'dataTableId') {
						return 'mockDataTableId';
					}
				}),
			});
			await setOutputs.call(context);

			expect(mockDataTable.addColumn).toHaveBeenCalledWith({
				name: 'new_column',
				type: 'string',
			});
		});
	});

	describe('Google Sheets', () => {
		const mockGoogleSheetInstance = {
			updateRows: vi.fn(),
			prepareDataForUpdatingByRowNumber: vi.fn().mockReturnValue({
				updateData: [{ range: 'Sheet1!A2:C2', values: [['foo', 'bar']] }],
			}),
			batchUpdate: vi.fn(),
		};

		const mockSheet = {
			title: 'Sheet1',
		};

		const mockThis = (options: Partial<any> = {}) =>
			mockDeep<IExecuteFunctions>({
				getNode: vi.fn().mockReturnValue({ name: 'EvalNode' }),
				getParentNodes: vi
					.fn()
					.mockReturnValue([{ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' }]),
				evaluateExpression: vi.fn().mockImplementation((expr) => {
					if (expr.includes('isExecuted')) return true;
					if (expr.includes('first().json')) return { row_number: 2, inputField: 'inputValue' };
					return true;
				}),
				getNodeParameter: vi.fn().mockImplementation((param: string) => {
					if (param === 'outputs.values') {
						return [
							{ outputName: 'result', outputValue: 'success' },
							{ outputName: 'score', outputValue: '95' },
						];
					} else if (param === 'source') {
						return 'googleSheets';
					}
				}),
				getInputData: vi.fn().mockReturnValue([{ json: { test: 1 } }]),
				addExecutionHints: vi.fn(),
				getMode: vi.fn().mockReturnValue('evaluation'),
				...options,
			});

		beforeEach(() => {
			vi.clearAllMocks();
			(getGoogleSheet as Mock).mockReturnValue(mockGoogleSheetInstance);
			(getSheet as Mock).mockResolvedValue(mockSheet);
		});

		it('should set outputs to Google Sheet and return evaluation data', async () => {
			const context = mockThis();
			const result = await setOutputs.call(context);

			expect(getGoogleSheet).toHaveBeenCalled();
			expect(getSheet).toHaveBeenCalledWith(mockGoogleSheetInstance);
			expect(mockGoogleSheetInstance.updateRows).toHaveBeenCalledWith(
				'Sheet1',
				[['inputField', 'result', 'score']],
				'RAW',
				1,
			);
			expect(mockGoogleSheetInstance.prepareDataForUpdatingByRowNumber).toHaveBeenCalledWith(
				[{ row_number: 2, result: 'success', score: '95' }],
				'Sheet1!A:Z',
				[['inputField', 'result', 'score']],
			);
			expect(mockGoogleSheetInstance.batchUpdate).toHaveBeenCalledWith(
				[{ range: 'Sheet1!A2:C2', values: [['foo', 'bar']] }],
				'RAW',
			);
			expect(result).toHaveLength(1);
			expect(result[0][0].evaluationData).toEqual({ result: 'success', score: '95' });
		});

		it('should handle row_number as string "row_number" by using 1', async () => {
			const context = mockThis({
				evaluateExpression: vi.fn().mockImplementation((expr) => {
					if (expr.includes('isExecuted')) return true;
					if (expr.includes('first().json'))
						return { row_number: 'row_number', inputField: 'inputValue' };
					return true;
				}),
			});
			const result = await setOutputs.call(context);

			expect(mockGoogleSheetInstance.prepareDataForUpdatingByRowNumber).toHaveBeenCalledWith(
				[{ row_number: 1, result: 'success', score: '95' }],
				'Sheet1!A:Z',
				[['inputField', 'result', 'score']],
			);
			expect(result).toHaveLength(1);
		});

		it('should add new column names that are not in existing columns', async () => {
			const context = mockThis({
				evaluateExpression: vi.fn().mockImplementation((expr) => {
					if (expr.includes('isExecuted')) return true;
					if (expr.includes('first().json')) return { row_number: 2, existingCol: 'value' };
					return true;
				}),
				getNodeParameter: vi.fn().mockImplementation((param) => {
					if (param === 'outputs.values') {
						return [{ outputName: 'newCol', outputValue: 'newValue' }];
					} else if (param === 'source') {
						return 'googleSheets';
					}
				}),
			});
			const result = await setOutputs.call(context);

			expect(mockGoogleSheetInstance.updateRows).toHaveBeenCalledWith(
				'Sheet1',
				[['existingCol', 'newCol']],
				'RAW',
				1,
			);
			expect(result).toHaveLength(1);
		});
	});
});
