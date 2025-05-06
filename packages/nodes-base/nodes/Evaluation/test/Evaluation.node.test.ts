import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import { Evaluation } from '../Evaluation/Evaluation.node';

describe('Test Evaluation', () => {
	const sheetName = 'Sheet5';
	const spreadsheetId = '1oqFpPgEPTGDw7BPkp1SfPXq3Cb3Hyr1SROtf-Ec4zvA';

	const mockExecuteFunctions = mock<IExecuteFunctions>({});

	beforeEach(() => {
		(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
		(mockExecuteFunctions.getNode as jest.Mock).mockReturnValue({ typeVersion: 4.6 });
		(mockExecuteFunctions.getParentNodes as jest.Mock).mockReturnValue([
			{ type: 'n8n-nodes-base.evaluationTrigger', name: 'Evaluation' },
		]);
		(mockExecuteFunctions.evaluateExpression as jest.Mock).mockReturnValue({
			row_number: 23,
			foo: 1,
			bar: 2,
			_rowsLeft: 2,
		});
	});

	afterEach(() => jest.clearAllMocks());

	describe('Test Evaluation Node', () => {
		jest.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet').mockImplementation(async () => {
			return { sheetId: 1, title: sheetName };
		});

		jest.spyOn(GoogleSheet.prototype, 'updateRows').mockImplementation(async () => {
			return { sheetId: 1, title: sheetName };
		});

		jest.spyOn(GoogleSheet.prototype, 'batchUpdate').mockImplementation(async () => {
			return { sheetId: 1, title: sheetName };
		});

		test('should update rows and return input data for existing headers', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
					const mockParams: { [key: string]: unknown } = {
						'outputs.values': [{ outputName: 'foo', outputValue: 'clam' }],
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

			await new Evaluation().execute.call(mockExecuteFunctions);

			expect(GoogleSheet.prototype.updateRows).toHaveBeenCalledWith(
				sheetName,
				[['foo', 'bar']],
				'RAW',
				1,
			);

			expect(GoogleSheet.prototype.batchUpdate).toHaveBeenCalledWith(
				[
					{
						range: 'Sheet5!A23',
						values: [['clam']],
					},
				],
				'RAW',
			);
		});

		test('should return empty when there is no parent evaluation trigger', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
					const mockParams: { [key: string]: unknown } = {
						'outputs.values': [{ outputName: 'bob', outputValue: 'clam' }],
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
			mockExecuteFunctions.getParentNodes.mockReturnValue([]);

			const result = await new Evaluation().execute.call(mockExecuteFunctions);

			expect(result).toEqual([]);

			expect(GoogleSheet.prototype.updateRows).not.toBeCalled();

			expect(GoogleSheet.prototype.batchUpdate).not.toBeCalled();
		});

		test('should update rows and return input data for new headers', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
					const mockParams: { [key: string]: unknown } = {
						'outputs.values': [{ outputName: 'bob', outputValue: 'clam' }],
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

			await new Evaluation().execute.call(mockExecuteFunctions);

			expect(GoogleSheet.prototype.updateRows).toHaveBeenCalledWith(
				sheetName,
				[['foo', 'bar', 'bob']],
				'RAW',
				1,
			);

			expect(GoogleSheet.prototype.batchUpdate).toHaveBeenCalledWith(
				[
					{
						range: 'Sheet5!C23',
						values: [['clam']],
					},
				],
				'RAW',
			);
		});
	});
});
