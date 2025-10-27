import { mock } from 'jest-mock-extended';
import type {
	IExecuteData,
	INode,
	INodeExecutionData,
	ITaskDataConnectionsSource,
} from 'n8n-workflow';

import type { DataRequestResponse, InputDataChunkDefinition } from '@/runner-types';

import { DataRequestResponseReconstruct } from '../data-request-response-reconstruct';

describe('DataRequestResponseReconstruct', () => {
	const reconstruct = new DataRequestResponseReconstruct();

	describe('reconstructConnectionInputItems', () => {
		it('should return all input items if no chunk is provided', () => {
			const inputData: DataRequestResponse['inputData'] = {
				main: [[{ json: { key: 'value' } }]],
			};

			const result = reconstruct.reconstructConnectionInputItems(inputData);

			expect(result).toEqual([{ json: { key: 'value' } }]);
		});

		it('should reconstruct sparse array when chunk is provided', () => {
			const inputData: DataRequestResponse['inputData'] = {
				main: [[{ json: { key: 'chunked' } }]],
			};
			const chunk: InputDataChunkDefinition = { startIndex: 2, count: 1 };

			const result = reconstruct.reconstructConnectionInputItems(inputData, chunk);

			expect(result).toEqual([undefined, undefined, { json: { key: 'chunked' } }, undefined]);
		});

		it('should handle empty input data gracefully', () => {
			const inputData: DataRequestResponse['inputData'] = { main: [[]] };
			const chunk: InputDataChunkDefinition = { startIndex: 1, count: 1 };

			const result = reconstruct.reconstructConnectionInputItems(inputData, chunk);

			expect(result).toEqual([undefined]);
		});
	});

	describe('reconstructExecuteData', () => {
		it('should reconstruct execute data with the provided input items', () => {
			const node = mock<INode>();
			const connectionInputSource = mock<ITaskDataConnectionsSource>();
			const response = mock<DataRequestResponse>({
				inputData: { main: [[]] },
				node,
				connectionInputSource,
			});
			const inputItems: INodeExecutionData[] = [{ json: { key: 'reconstructed' } }];

			const result = reconstruct.reconstructExecuteData(response, inputItems);

			expect(result).toEqual<IExecuteData>({
				data: {
					main: [inputItems],
				},
				node: response.node,
				source: response.connectionInputSource,
			});
		});

		it('should handle empty input items gracefully', () => {
			const node = mock<INode>();
			const connectionInputSource = mock<ITaskDataConnectionsSource>();
			const inputItems: INodeExecutionData[] = [];
			const response = mock<DataRequestResponse>({
				inputData: { main: [[{ json: { key: 'value' } }]] },
				node,
				connectionInputSource,
			});

			const result = reconstruct.reconstructExecuteData(response, inputItems);

			expect(result).toEqual<IExecuteData>({
				data: {
					main: [inputItems],
				},
				node: response.node,
				source: response.connectionInputSource,
			});
		});
	});
});
