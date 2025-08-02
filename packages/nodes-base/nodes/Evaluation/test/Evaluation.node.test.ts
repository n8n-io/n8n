import { mock } from 'jest-mock-extended';
import {
	NodeOperationError,
	type AssignmentCollectionValue,
	type IExecuteFunctions,
	type INodeTypes,
	type NodeParameterValueType,
} from 'n8n-workflow';

import { GoogleSheet } from '../../Google/Sheet/v2/helpers/GoogleSheet';
import { Evaluation } from '../Evaluation/Evaluation.node.ee';

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

	describe('Test Evaluation Node for Set Output', () => {
		jest.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet').mockImplementation(async () => {
			return { sheetId: 1, title: sheetName };
		});

		jest.spyOn(GoogleSheet.prototype, 'updateRows').mockImplementation(async () => {
			return { sheetId: 1, title: sheetName };
		});

		jest.spyOn(GoogleSheet.prototype, 'batchUpdate').mockImplementation(async () => {
			return { sheetId: 1, title: sheetName };
		});

		test('credential test for googleApi should be in methods', async () => {
			const evaluationNode = new Evaluation();
			expect(evaluationNode.methods.credentialTest.googleApiCredentialTest).toBeDefined();
		});

		test('should throw error if output values is empty', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
					const mockParams: { [key: string]: unknown } = {
						'outputs.values': [],
						documentId: {
							mode: 'id',
							value: spreadsheetId,
						},
						sheetName,
						sheetMode: 'id',
						operation: 'setOutputs',
					};
					return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
				},
			);

			await expect(new Evaluation().execute.call(mockExecuteFunctions)).rejects.toThrow(
				'No outputs to set',
			);

			expect(GoogleSheet.prototype.updateRows).not.toBeCalled();

			expect(GoogleSheet.prototype.batchUpdate).not.toBeCalled();
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
						operation: 'setOutputs',
					};
					return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
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
						operation: 'setOutputs',
					};
					return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
				},
			);
			mockExecuteFunctions.getParentNodes.mockReturnValue([]);

			const result = await new Evaluation().execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: {} }]]);

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
						operation: 'setOutputs',
					};
					return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
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

	describe('Test Evaluation Node for Set Metrics', () => {
		const nodeTypes = mock<INodeTypes>();
		const evaluationMetricsNode = new Evaluation();

		let mockExecuteFunction: IExecuteFunctions;

		function getMockExecuteFunction(metrics: AssignmentCollectionValue['assignments']) {
			return {
				getInputData: jest.fn().mockReturnValue([{}]),

				getNodeParameter: jest.fn((param: string, _: number) => {
					if (param === 'metrics') {
						return { assignments: metrics };
					}
					if (param === 'operation') {
						return 'setMetrics';
					}
					if (param === 'metric') {
						return 'customMetrics';
					}
					return param;
				}),

				getNode: jest.fn().mockReturnValue({
					typeVersion: 1,
				}),
			} as unknown as IExecuteFunctions;
		}

		beforeAll(() => {
			mockExecuteFunction = getMockExecuteFunction([
				{
					id: '1',
					name: 'Accuracy',
					value: 0.95,
					type: 'number',
				},
				{
					id: '2',
					name: 'Latency',
					value: 100,
					type: 'number',
				},
			]);
			nodeTypes.getByName.mockReturnValue(evaluationMetricsNode);
			jest.clearAllMocks();
		});

		describe('execute', () => {
			it('should output the defined metrics', async () => {
				const result = await evaluationMetricsNode.execute.call(mockExecuteFunction);

				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(1);

				const outputItem = result[0][0].json;
				expect(outputItem).toEqual({
					Accuracy: 0.95,
					Latency: 100,
				});
			});

			it('should handle no metrics defined', async () => {
				mockExecuteFunction = getMockExecuteFunction([]);
				const result = await evaluationMetricsNode.execute.call(mockExecuteFunction);

				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toEqual({});
			});

			it('should convert string values to numbers', async () => {
				const mockExecuteWithStringValues = getMockExecuteFunction([
					{
						id: '1',
						name: 'Accuracy',
						value: '0.95',
						type: 'number',
					},
					{
						id: '2',
						name: 'Latency',
						value: '100',
						type: 'number',
					},
				]);

				const result = await evaluationMetricsNode.execute.call(mockExecuteWithStringValues);

				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(1);

				const outputItem = result[0][0].json;
				expect(outputItem).toEqual({
					Accuracy: 0.95,
					Latency: 100,
				});
			});

			it('should throw error for non-numeric string values', async () => {
				const mockExecuteWithInvalidValue = getMockExecuteFunction([
					{
						id: '1',
						name: 'Accuracy',
						value: 'not-a-number',
						type: 'number',
					},
				]);

				await expect(
					evaluationMetricsNode.execute.call(mockExecuteWithInvalidValue),
				).rejects.toThrow(NodeOperationError);
			});
		});
	});

	describe('Test Evaluation Node for Check If Evaluating', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(mockExecuteFunctions.getNode as jest.Mock).mockReturnValue({ typeVersion: 4.6 });
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(key: string, _: number, fallbackValue?: string | number | boolean | object) => {
					const mockParams: { [key: string]: unknown } = {
						operation: 'checkIfEvaluating',
					};
					return (mockParams[key] ?? fallbackValue) as NodeParameterValueType;
				},
			);
		});

		afterEach(() => jest.clearAllMocks());

		test('should return output in normal branch if normal execution', async () => {
			(mockExecuteFunctions.getParentNodes as jest.Mock).mockReturnValue([]);
			const result = await new Evaluation().execute.call(mockExecuteFunctions);
			expect(result).toEqual([[], [{ json: {} }]]);
		});

		test('should return output in evaluation branch if evaluation execution', async () => {
			(mockExecuteFunctions.getParentNodes as jest.Mock).mockReturnValue([
				{ type: 'n8n-nodes-base.evaluationTrigger', name: 'Evaluation' },
			]);

			const result = await new Evaluation().execute.call(mockExecuteFunctions);
			expect(result).toEqual([[{ json: {} }], []]);
		});
	});
});
