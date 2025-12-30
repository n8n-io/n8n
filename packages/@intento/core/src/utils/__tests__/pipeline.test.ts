/* eslint-disable @typescript-eslint/naming-convention */
import type { ExecuteContext } from 'n8n-core';
import type { IDataObject, INodeExecutionData, ITaskData } from 'n8n-workflow';

import type { IFunctions } from 'types/*';

import { Pipeline } from '../pipeline';

/**
 * Creates a mock IFunctions object that can be cast to ExecuteContext.
 * This enables testing of the internal runExecutionData access pattern.
 *
 * @param runData - Optional map of node names to their task data arrays
 * @returns Mock IFunctions castable to ExecuteContext
 */
function createMockFunctions(runData?: Record<string, ITaskData[]>): IFunctions & Partial<ExecuteContext> {
	return {
		runExecutionData: runData
			? {
					resultData: {
						runData,
					},
				}
			: undefined,
	} as IFunctions & Partial<ExecuteContext>;
}

/**
 * Creates an ITaskData object with the specified output data.
 * Mimics the structure created by n8n during node execution.
 *
 * @param output - Array of execution data items for main[0] branch
 * @returns Complete ITaskData with main[0] populated
 */
function createTaskData(output: INodeExecutionData[]): ITaskData {
	return {
		startTime: Date.now(),
		executionTime: 100,
		executionStatus: 'success',
		source: [],
		data: {
			main: [output],
		},
		executionIndex: 0,
	};
}

/**
 * Creates an INodeExecutionData object with the given JSON payload.
 *
 * @param json - JSON object to wrap in execution data
 * @returns INodeExecutionData with json property set
 */
function createExecutionData(json: IDataObject): INodeExecutionData {
	return { json };
}

describe('Pipeline', () => {
	describe('readPipeline', () => {
		describe('Basic Logic', () => {
			it('should return empty object when runData is empty', () => {
				const functions = createMockFunctions({});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({});
			});

			it('should return single node output when node has single execution', () => {
				const nodeOutput = [createExecutionData({ id: 1 })];
				const functions = createMockFunctions({
					'Node A': [createTaskData(nodeOutput)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Node A': nodeOutput,
				});
			});

			it('should return multiple nodes with their outputs', () => {
				const outputA = [createExecutionData({ a: 1 })];
				const outputB = [createExecutionData({ b: 2 })];
				const outputC = [createExecutionData({ c: 3 })];

				const functions = createMockFunctions({
					'Node A': [createTaskData(outputA)],
					'Node B': [createTaskData(outputB)],
					'Node C': [createTaskData(outputC)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Node A': outputA,
					'Node B': outputB,
					'Node C': outputC,
				});
			});

			it('should return latest execution when node has multiple runs', () => {
				const output1 = [createExecutionData({ iter: 1 })];
				const output2 = [createExecutionData({ iter: 2 })];
				const output3 = [createExecutionData({ iter: 3 })];

				const functions = createMockFunctions({
					'Loop Node': [createTaskData(output1), createTaskData(output2), createTaskData(output3)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Loop Node': output3,
				});
			});

			it('should return only main[0] when node has multiple output branches', () => {
				const primaryBranch = [createExecutionData({ branch: 'primary' })];
				const secondaryBranch = [createExecutionData({ branch: 'secondary' })];

				const taskData: ITaskData = {
					startTime: Date.now(),
					executionTime: 100,
					executionStatus: 'success',
					source: [],
					data: {
						main: [primaryBranch, secondaryBranch],
					},
					executionIndex: 0,
				};

				const functions = createMockFunctions({
					'Split Node': [taskData],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Split Node': primaryBranch,
				});
			});

			it('should return all items when main[0] contains multiple items', () => {
				const batchOutput = [createExecutionData({ id: 1 }), createExecutionData({ id: 2 }), createExecutionData({ id: 3 })];

				const functions = createMockFunctions({
					'Batch Node': [createTaskData(batchOutput)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Batch Node': batchOutput,
				});
			});

			it('should return Record<string, INodeExecutionData[]> type', () => {
				const output = [createExecutionData({ test: 'data' })];
				const functions = createMockFunctions({
					'Test Node': [createTaskData(output)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(typeof result).toBe('object');
				expect(Array.isArray(result['Test Node'])).toBe(true);
				expect(result['Test Node']).toEqual(output);
			});
		});

		describe('Edge Cases', () => {
			it('should return empty object when runExecutionData is undefined', () => {
				const functions = {
					runExecutionData: undefined,
				} as IFunctions & Partial<ExecuteContext>;

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({});
			});

			it('should return empty object when resultData is undefined', () => {
				const functions = {
					runExecutionData: {
						resultData: undefined,
					},
				} as unknown as IFunctions & Partial<ExecuteContext>;

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({});
			});

			it('should return empty object when runData property is undefined', () => {
				const functions = {
					runExecutionData: {
						resultData: {
							runData: undefined,
						},
					},
				} as unknown as IFunctions & Partial<ExecuteContext>;

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({});
			});

			it('should exclude node when taskDataArray is empty', () => {
				const validOutput = [createExecutionData({ valid: true })];

				const functions = createMockFunctions({
					'Empty Node': [],
					'Valid Node': [createTaskData(validOutput)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Valid Node': validOutput,
				});
				expect(result['Empty Node']).toBeUndefined();
			});

			it('should exclude node when data property is missing', () => {
				const validOutput = [createExecutionData({ valid: true })];

				const taskDataWithoutData: ITaskData = {
					startTime: Date.now(),
					executionTime: 100,
					executionStatus: 'error',
					source: [],
					data: undefined as unknown as ITaskData['data'],
					executionIndex: 0,
				};

				const functions = createMockFunctions({
					'No Data': [taskDataWithoutData],
					'Valid Node': [createTaskData(validOutput)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Valid Node': validOutput,
				});
				expect(result['No Data']).toBeUndefined();
			});

			it('should exclude node when main property is missing', () => {
				const validOutput = [createExecutionData({ valid: true })];

				const taskDataWithoutMain: ITaskData = {
					startTime: Date.now(),
					executionTime: 100,
					executionStatus: 'error',
					source: [],
					data: {
						main: undefined as unknown as Array<INodeExecutionData[] | null>,
					},
					executionIndex: 0,
				};
				const functions = createMockFunctions({
					'No Main': [taskDataWithoutMain],
					'Valid Node': [createTaskData(validOutput)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Valid Node': validOutput,
				});
				expect(result['No Main']).toBeUndefined();
			});

			it('should exclude node when main array is empty', () => {
				const validOutput = [createExecutionData({ valid: true })];

				const taskDataWithEmptyMain: ITaskData = {
					startTime: Date.now(),
					executionTime: 100,
					executionStatus: 'success',
					source: [],
					data: {
						main: [],
					},
					executionIndex: 0,
				};

				const functions = createMockFunctions({
					'Empty Main': [taskDataWithEmptyMain],
					'Valid Node': [createTaskData(validOutput)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Valid Node': validOutput,
				});
				expect(result['Empty Main']).toBeUndefined();
			});

			it('should exclude node when main[0] is null', () => {
				const validOutput = [createExecutionData({ valid: true })];

				const taskDataWithNullMain: ITaskData = {
					startTime: Date.now(),
					executionTime: 100,
					executionStatus: 'error',
					source: [],
					data: {
						main: [null as unknown as INodeExecutionData[]],
					},
					executionIndex: 0,
				};

				const functions = createMockFunctions({
					'Null Output': [taskDataWithNullMain],
					'Valid Node': [createTaskData(validOutput)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Valid Node': validOutput,
				});
				expect(result['Null Output']).toBeUndefined();
			});
		});

		describe('Error Handling', () => {
			it('should return only successful nodes when mixed with failures', () => {
				const success1Output = [createExecutionData({ node: 'success1' })];
				const success2Output = [createExecutionData({ node: 'success2' })];

				const failedTaskData: ITaskData = {
					startTime: Date.now(),
					executionTime: 50,
					executionStatus: 'error',
					source: [],
					data: undefined as unknown as ITaskData['data'],
					executionIndex: 0,
				};

				const functions = createMockFunctions({
					'Success 1': [createTaskData(success1Output)],
					Failed: [failedTaskData],
					'Success 2': [createTaskData(success2Output)],
					Pending: [],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					'Success 1': success1Output,
					'Success 2': success2Output,
				});
				expect(result['Failed']).toBeUndefined();
				expect(result['Pending']).toBeUndefined();
			});

			it('should handle type cast from IFunctions to ExecuteContext', () => {
				const output = [createExecutionData({ test: 'cast' })];
				const mockFunctions = createMockFunctions({
					'Cast Test': [createTaskData(output)],
				});

				expect(() => {
					const result = Pipeline.readPipeline(mockFunctions as IFunctions);
					expect(result['Cast Test']).toEqual(output);
				}).not.toThrow();
			});

			it('should handle complex real-world workflow scenario', () => {
				const triggerOutput = [createExecutionData({ trigger: 'start' })];
				const transform1Output = [
					createExecutionData({ step: 'transform1', item: 1 }),
					createExecutionData({ step: 'transform1', item: 2 }),
				];
				const loopOutputs = [
					[createExecutionData({ iter: 1 })],
					[createExecutionData({ iter: 2 })],
					[createExecutionData({ iter: 3, item: 1 }), createExecutionData({ iter: 3, item: 2 })],
				];
				const transform2Output = [
					createExecutionData({ step: 'transform2', item: 1 }),
					createExecutionData({ step: 'transform2', item: 2 }),
				];
				const finalOutput = [createExecutionData({ final: 'aggregated' })];

				const functions = createMockFunctions({
					Trigger: [createTaskData(triggerOutput)],
					'Transform 1': [createTaskData(transform1Output)],
					Loop: [createTaskData(loopOutputs[0]), createTaskData(loopOutputs[1]), createTaskData(loopOutputs[2])],
					'Transform 2': [createTaskData(transform2Output)],
					Output: [createTaskData(finalOutput)],
				});

				const result = Pipeline.readPipeline(functions as IFunctions);

				expect(result).toEqual({
					Trigger: triggerOutput,
					'Transform 1': transform1Output,
					Loop: loopOutputs[2],
					'Transform 2': transform2Output,
					Output: finalOutput,
				});
				expect(Object.keys(result)).toHaveLength(5);
			});
		});
	});
});
