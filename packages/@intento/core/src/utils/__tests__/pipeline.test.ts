import { mock } from 'jest-mock-extended';
import type { INodeExecutionData } from 'n8n-workflow';

import type { IFunctions } from 'types/*';

import { Pipeline } from '../pipeline';

/**
 * Tests for Pipeline utility class
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */
describe('Pipeline', () => {
	describe('business logic', () => {
		it('[BL-01] should extract outputs from single executed node', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			const nodeOutput: INodeExecutionData[] = [{ json: { key: 'value' } }];

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							node1: [
								{
									data: {
										main: [nodeOutput],
									},
								},
							],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result).toEqual({
				node1: nodeOutput,
			});
		});

		it('[BL-02] should extract outputs from multiple executed nodes', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			const node1Output: INodeExecutionData[] = [{ json: { data: 'node1' } }];
			const node2Output: INodeExecutionData[] = [{ json: { data: 'node2' } }];
			const node3Output: INodeExecutionData[] = [{ json: { data: 'node3' } }];

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							node1: [{ data: { main: [node1Output] } }],
							node2: [{ data: { main: [node2Output] } }],
							node3: [{ data: { main: [node3Output] } }],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result).toEqual({
				node1: node1Output,
				node2: node2Output,
				node3: node3Output,
			});
			expect(Object.keys(result)).toHaveLength(3);
		});

		it('[BL-03] should return latest run for nodes executed multiple times', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			const firstRun: INodeExecutionData[] = [{ json: { iteration: 1 } }];
			const secondRun: INodeExecutionData[] = [{ json: { iteration: 2 } }];
			const thirdRun: INodeExecutionData[] = [{ json: { iteration: 3 } }];

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							loopNode: [{ data: { main: [firstRun] } }, { data: { main: [secondRun] } }, { data: { main: [thirdRun] } }],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result.loopNode).toEqual(thirdRun);
			expect(result.loopNode).not.toEqual(firstRun);
		});

		it('[BL-04] should only include main[0] output branch', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			const mainBranch0: INodeExecutionData[] = [{ json: { branch: 0 } }];
			const mainBranch1: INodeExecutionData[] = [{ json: { branch: 1 } }];

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							switchNode: [
								{
									data: {
										main: [mainBranch0, mainBranch1],
									},
								},
							],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result.switchNode).toEqual(mainBranch0);
			expect(result.switchNode).not.toEqual(mainBranch1);
		});

		it('[BL-05] should handle nodes with different output structures', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			const validOutput: INodeExecutionData[] = [{ json: { valid: true } }];

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							validNode: [{ data: { main: [validOutput] } }],
							nodeWithoutMain: [{ data: {} }],
							nodeWithEmptyMain: [{ data: { main: [] } }],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result).toEqual({
				validNode: validOutput,
			});
			expect(result.nodeWithoutMain).toBeUndefined();
			expect(result.nodeWithEmptyMain).toBeUndefined();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should return empty object when runExecutionData is undefined', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: undefined,
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result).toEqual({});
		});

		it('[EC-02] should return empty object when resultData is undefined', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					resultData: undefined,
				} as unknown,
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result).toEqual({});
		});

		it('[EC-03] should return empty object when runData is undefined', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					resultData: {
						runData: undefined,
					},
				} as unknown,
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result).toEqual({});
		});

		it('[EC-04] should return empty object when runData is empty', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result).toEqual({});
		});

		it('[EC-05] should skip nodes with empty taskDataArray', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			const validOutput: INodeExecutionData[] = [{ json: { data: 'valid' } }];

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							validNode: [{ data: { main: [validOutput] } }],
							emptyArrayNode: [],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result.validNode).toEqual(validOutput);
			expect(result.emptyArrayNode).toBeUndefined();
		});

		it('[EC-06] should skip nodes without data property', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							nodeWithoutData: [{}],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result.nodeWithoutData).toBeUndefined();
		});

		it('[EC-07] should skip nodes without main property', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							nodeWithoutMain: [{ data: {} }],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result.nodeWithoutMain).toBeUndefined();
		});

		it('[EC-08] should skip nodes without main[0]', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							nodeWithEmptyMain: [{ data: { main: [] } }],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result.nodeWithEmptyMain).toBeUndefined();
		});

		it('[EC-09] should skip nodes with null/undefined in main[0]', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							nodeWithNullMain: [{ data: { main: [null] } }],
							nodeWithUndefinedMain: [{ data: { main: [undefined] } }],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result.nodeWithNullMain).toBeUndefined();
			expect(result.nodeWithUndefinedMain).toBeUndefined();
		});

		it('[EC-10] should handle mixed valid and invalid nodes', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			const validOutput1: INodeExecutionData[] = [{ json: { id: 1 } }];
			const validOutput2: INodeExecutionData[] = [{ json: { id: 2 } }];

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							validnode1: [{ data: { main: [validOutput1] } }],
							nodeWithoutData: [{}],
							validNode2: [{ data: { main: [validOutput2] } }],
							nodeWithEmptyMain: [{ data: { main: [] } }],
							nodeWithNullMain: [{ data: { main: [null] } }],
						},
					},
				},
				writable: true,
			});

			// ACT
			const result = Pipeline.readPipeline(mockFunctions);

			// ASSERT
			expect(result).toEqual({
				validnode1: validOutput1,
				validNode2: validOutput2,
			});
			expect(Object.keys(result)).toHaveLength(2);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should not throw when functions parameter lacks execution context', () => {
			// ARRANGE
			const mockFunctions = {} as IFunctions;

			// ACT & ASSERT
			expect(() => Pipeline.readPipeline(mockFunctions)).not.toThrow();
			const result = Pipeline.readPipeline(mockFunctions);
			expect(result).toEqual({});
		});

		it('[EH-02] should handle deeply nested null/undefined gracefully', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();
			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							deepNullNode: [
								{
									data: {
										main: [null as unknown as INodeExecutionData[]],
									},
								},
							],
						},
					},
				},
				writable: true,
			});

			// ACT & ASSERT
			expect(() => Pipeline.readPipeline(mockFunctions)).not.toThrow();
			const result = Pipeline.readPipeline(mockFunctions);
			expect(result.deepNullNode).toBeUndefined();
		});

		it('[EH-03] should not throw on malformed taskDataArray', () => {
			// ARRANGE
			const mockFunctions = mock<IFunctions>();

			Object.defineProperty(mockFunctions, 'runExecutionData', {
				value: {
					version: 1,
					resultData: {
						runData: {
							malformedNode: [null, undefined, { data: null }] as unknown,
						},
					},
				},
				writable: true,
			});

			// ACT & ASSERT
			expect(() => Pipeline.readPipeline(mockFunctions)).not.toThrow();
			const result = Pipeline.readPipeline(mockFunctions);
			expect(result.malformedNode).toBeUndefined();
		});
	});
});
