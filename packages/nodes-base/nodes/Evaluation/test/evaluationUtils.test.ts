import type { IExecuteFunctions } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { setInputs, setOutputs } from '../utils/evaluationUtils';

jest.mock('../utils/evaluationTriggerUtils', () => ({
	getGoogleSheet: jest.fn(),
	getSheet: jest.fn(),
}));

import { getGoogleSheet, getSheet } from '../utils/evaluationTriggerUtils';

import { mockDeep } from 'jest-mock-extended';

describe('setInputs', () => {
	const mockThis = (options: Partial<any> = {}) =>
		mockDeep<IExecuteFunctions>({
			getNode: jest.fn().mockReturnValue({ name: 'EvalNode' }),
			getParentNodes: jest
				.fn()
				.mockReturnValue([{ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' }]),
			evaluateExpression: jest.fn().mockReturnValue(true),
			getNodeParameter: jest.fn().mockReturnValue([
				{ inputName: 'foo', inputValue: 'bar' },
				{ inputName: 'baz', inputValue: 'qux' },
			]),
			getInputData: jest.fn().mockReturnValue([{ json: { test: 1 } }]),
			addExecutionHints: jest.fn(),
			getMode: jest.fn().mockReturnValue('evaluation'),
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
			getNodeParameter: jest.fn().mockReturnValue([]),
		});
		expect(() => setInputs.call(context)).toThrow(UserError);
	});

	it('should add execution hints and return input data if not started from evaluation trigger', () => {
		const context = mockThis({
			getParentNodes: jest.fn().mockReturnValue([]),
			getInputData: jest.fn().mockReturnValue([{ json: { test: 2 } }]),
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
			evaluateExpression: jest.fn().mockReturnValue(undefined),
			getInputData: jest.fn().mockReturnValue([{ json: { test: 3 } }]),
		});
		const result = setInputs.call(context);
		expect(context.addExecutionHints).toHaveBeenCalled();
		expect(result).toEqual([[{ json: { test: 3 } }]]);
	});
});

describe('setOutputs', () => {
	const mockGoogleSheetInstance = {
		updateRows: jest.fn(),
		prepareDataForUpdatingByRowNumber: jest.fn().mockReturnValue({
			updateData: [{ range: 'Sheet1!A2:C2', values: [['foo', 'bar']] }],
		}),
		batchUpdate: jest.fn(),
	};

	const mockSheet = {
		title: 'Sheet1',
	};

	const mockThis = (options: Partial<any> = {}) =>
		mockDeep<IExecuteFunctions>({
			getNode: jest.fn().mockReturnValue({ name: 'EvalNode' }),
			getParentNodes: jest
				.fn()
				.mockReturnValue([{ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' }]),
			evaluateExpression: jest.fn().mockImplementation((expr) => {
				if (expr.includes('isExecuted')) return true;
				if (expr.includes('first().json')) return { row_number: 2, inputField: 'inputValue' };
				return true;
			}),
			getNodeParameter: jest.fn().mockReturnValue([
				{ outputName: 'result', outputValue: 'success' },
				{ outputName: 'score', outputValue: '95' },
			]),
			getInputData: jest.fn().mockReturnValue([{ json: { test: 1 } }]),
			addExecutionHints: jest.fn(),
			getMode: jest.fn().mockReturnValue('evaluation'),
			...options,
		});

	beforeEach(() => {
		jest.clearAllMocks();
		(getGoogleSheet as jest.Mock).mockReturnValue(mockGoogleSheetInstance);
		(getSheet as jest.Mock).mockResolvedValue(mockSheet);
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

	it('should throw UserError if no output fields are provided', async () => {
		const context = mockThis({
			getNodeParameter: jest.fn().mockReturnValue([]),
		});
		await expect(setOutputs.call(context)).rejects.toThrow(UserError);
		await expect(setOutputs.call(context)).rejects.toThrow('No outputs to set');
	});

	it('should add execution hints and return input data if not started from evaluation trigger', async () => {
		const context = mockThis({
			getParentNodes: jest.fn().mockReturnValue([]),
			getInputData: jest.fn().mockReturnValue([{ json: { test: 2 } }]),
		});
		const result = await setOutputs.call(context);

		expect(context.addExecutionHints).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('No outputs were set'),
			}),
		);
		expect(result).toEqual([[{ json: { test: 2 } }]]);
		expect(getGoogleSheet).not.toHaveBeenCalled();
	});

	it('should add execution hints and return input data if evalTriggerOutput is falsy', async () => {
		const context = mockThis({
			evaluateExpression: jest.fn().mockImplementation((expr) => {
				if (expr.includes('isExecuted')) return false;
				return true;
			}),
			getInputData: jest.fn().mockReturnValue([{ json: { test: 3 } }]),
		});
		const result = await setOutputs.call(context);

		expect(context.addExecutionHints).toHaveBeenCalled();
		expect(result).toEqual([[{ json: { test: 3 } }]]);
		expect(getGoogleSheet).not.toHaveBeenCalled();
	});

	it('should handle row_number as string "row_number" by using 1', async () => {
		const context = mockThis({
			evaluateExpression: jest.fn().mockImplementation((expr) => {
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
			evaluateExpression: jest.fn().mockImplementation((expr) => {
				if (expr.includes('isExecuted')) return true;
				if (expr.includes('first().json')) return { row_number: 2, existingCol: 'value' };
				return true;
			}),
			getNodeParameter: jest
				.fn()
				.mockReturnValue([{ outputName: 'newCol', outputValue: 'newValue' }]),
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
