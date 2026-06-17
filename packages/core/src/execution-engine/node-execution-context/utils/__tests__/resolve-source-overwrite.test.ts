import type { IExecuteData, INodeExecutionData, ISourceData } from 'n8n-workflow';

import { resolveSourceOverwrite } from '../resolve-source-overwrite';

describe('resolveSourceOverwrite', () => {
	describe('should return null when', () => {
		test('preserveSourceOverwrite is false', () => {
			const item: INodeExecutionData = {
				json: { data: 'test' },
				pairedItem: {
					item: 0,
					sourceOverwrite: {
						previousNode: 'Node1',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				},
			};

			const executionData: IExecuteData = {
				data: { main: [[item]] },
				source: { main: [{ previousNode: 'Node0', previousNodeOutput: 0, previousNodeRun: 0 }] },
				node: {
					id: '123',
					name: 'CurrentNode',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				metadata: {
					preserveSourceOverwrite: false,
				},
			};

			const result = resolveSourceOverwrite(item, executionData);
			expect(result).toBeNull();
		});

		test('preserveSourceOverwrite is not set', () => {
			const item: INodeExecutionData = {
				json: { data: 'test' },
				pairedItem: {
					item: 0,
					sourceOverwrite: {
						previousNode: 'Node1',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				},
			};

			const executionData: IExecuteData = {
				data: { main: [[item]] },
				source: { main: [{ previousNode: 'Node0', previousNodeOutput: 0, previousNodeRun: 0 }] },
				node: {
					id: '123',
					name: 'CurrentNode',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			};

			const result = resolveSourceOverwrite(item, executionData);
			expect(result).toBeNull();
		});

		test('metadata is not set', () => {
			const item: INodeExecutionData = {
				json: { data: 'test' },
			};

			const executionData: IExecuteData = {
				data: { main: [[item]] },
				source: { main: [{ previousNode: 'Node0', previousNodeOutput: 0, previousNodeRun: 0 }] },
				node: {
					id: '123',
					name: 'CurrentNode',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			};

			const result = resolveSourceOverwrite(item, executionData);
			expect(result).toBeNull();
		});

		test('preserveSourceOverwrite is true but no sourceOverwrite data exists', () => {
			const item: INodeExecutionData = {
				json: { data: 'test' },
				pairedItem: { item: 0 },
			};

			const executionData: IExecuteData = {
				data: { main: [[item]] },
				source: { main: [{ previousNode: 'Node0', previousNodeOutput: 0, previousNodeRun: 0 }] },
				node: {
					id: '123',
					name: 'CurrentNode',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				metadata: {
					preserveSourceOverwrite: true,
				},
			};

			const result = resolveSourceOverwrite(item, executionData);
			expect(result).toBeNull();
		});

		test('pairedItem is not an object', () => {
			const item: INodeExecutionData = {
				json: { data: 'test' },
				pairedItem: 0,
			};

			const executionData: IExecuteData = {
				data: { main: [[item]] },
				source: { main: [{ previousNode: 'Node0', previousNodeOutput: 0, previousNodeRun: 0 }] },
				node: {
					id: '123',
					name: 'CurrentNode',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				metadata: {
					preserveSourceOverwrite: true,
				},
			};

			const result = resolveSourceOverwrite(item, executionData);
			expect(result).toBeNull();
		});
	});

	describe('should return preservedSourceOverwrite when', () => {
		test('it is set in metadata', () => {
			const preservedSourceData: ISourceData = {
				previousNode: 'PreservedNode',
				previousNodeOutput: 1,
				previousNodeRun: 2,
			};

			const item: INodeExecutionData = {
				json: { data: 'test' },
				pairedItem: {
					item: 0,
					sourceOverwrite: {
						previousNode: 'DifferentNode',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				},
			};

			const executionData: IExecuteData = {
				data: { main: [[item]] },
				source: { main: [{ previousNode: 'Node0', previousNodeOutput: 0, previousNodeRun: 0 }] },
				node: {
					id: '123',
					name: 'CurrentNode',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				metadata: {
					preserveSourceOverwrite: true,
					preservedSourceOverwrite: preservedSourceData,
				},
			};

			const result = resolveSourceOverwrite(item, executionData);
			expect(result).toEqual(preservedSourceData);
		});

		test('it is set in metadata even without sourceOverwrite in pairedItem', () => {
			const preservedSourceData: ISourceData = {
				previousNode: 'PreservedNode',
				previousNodeOutput: 1,
				previousNodeRun: 2,
			};

			const item: INodeExecutionData = {
				json: { data: 'test' },
				pairedItem: { item: 0 },
			};

			const executionData: IExecuteData = {
				data: { main: [[item]] },
				source: { main: [{ previousNode: 'Node0', previousNodeOutput: 0, previousNodeRun: 0 }] },
				node: {
					id: '123',
					name: 'CurrentNode',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				metadata: {
					preserveSourceOverwrite: true,
					preservedSourceOverwrite: preservedSourceData,
				},
			};

			const result = resolveSourceOverwrite(item, executionData);
			expect(result).toEqual(preservedSourceData);
		});
	});

	describe('should return sourceOverwrite from pairedItem when', () => {
		test('preserveSourceOverwrite is true and preservedSourceOverwrite is not set', () => {
			const sourceOverwriteData: ISourceData = {
				previousNode: 'SourceNode',
				previousNodeOutput: 1,
				previousNodeRun: 1,
			};

			const item: INodeExecutionData = {
				json: { data: 'test' },
				pairedItem: {
					item: 0,
					sourceOverwrite: sourceOverwriteData,
				},
			};

			const executionData: IExecuteData = {
				data: { main: [[item]] },
				source: { main: [{ previousNode: 'Node0', previousNodeOutput: 0, previousNodeRun: 0 }] },
				node: {
					id: '123',
					name: 'CurrentNode',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				metadata: {
					preserveSourceOverwrite: true,
				},
			};

			const result = resolveSourceOverwrite(item, executionData);
			expect(result).toEqual(sourceOverwriteData);
		});
	});

	describe('should prioritize preservedSourceOverwrite over pairedItem.sourceOverwrite', () => {
		test('when both are present', () => {
			const preservedSourceData: ISourceData = {
				previousNode: 'PreservedNode',
				previousNodeOutput: 2,
				previousNodeRun: 3,
			};

			const sourceOverwriteData: ISourceData = {
				previousNode: 'PairedItemNode',
				previousNodeOutput: 1,
				previousNodeRun: 1,
			};

			const item: INodeExecutionData = {
				json: { data: 'test' },
				pairedItem: {
					item: 0,
					sourceOverwrite: sourceOverwriteData,
				},
			};

			const executionData: IExecuteData = {
				data: { main: [[item]] },
				source: { main: [{ previousNode: 'Node0', previousNodeOutput: 0, previousNodeRun: 0 }] },
				node: {
					id: '123',
					name: 'CurrentNode',
					type: 'test',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				metadata: {
					preserveSourceOverwrite: true,
					preservedSourceOverwrite: preservedSourceData,
				},
			};

			const result = resolveSourceOverwrite(item, executionData);
			// Should return preservedSourceOverwrite, not pairedItem.sourceOverwrite
			expect(result).toEqual(preservedSourceData);
			expect(result).not.toEqual(sourceOverwriteData);
		});
	});
});
