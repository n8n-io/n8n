import type { IRunExecutionData } from 'n8n-workflow';

import { compressExecutionData, decompressExecutionData } from '../compression.utils';

describe('Compression Utils', () => {
	const sampleExecutionData: IRunExecutionData = {
		startData: {},
		resultData: {
			runData: {
				testNode: [
					{
						json: { test: 'data' },
						binary: {},
						pairedItem: { item: 0 },
					},
				],
			},
		},
		executionData: {
			contextData: {},
			metadata: {},
			nodeExecutionStack: [],
			waitingExecution: {},
			waitingExecutionSource: {},
		},
	};

	describe('compressExecutionData', () => {
		it('should compress execution data successfully', async () => {
			const compressed = await compressExecutionData(sampleExecutionData);

			expect(compressed).toBeInstanceOf(Buffer);
			expect(compressed.length).toBeGreaterThan(0);
		});

		it('should handle empty execution data', async () => {
			const emptyData: IRunExecutionData = {
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const compressed = await compressExecutionData(emptyData);

			expect(compressed).toBeInstanceOf(Buffer);
			expect(compressed.length).toBeGreaterThan(0);
		});
	});

	describe('decompressExecutionData', () => {
		it('should decompress execution data successfully', async () => {
			const compressed = await compressExecutionData(sampleExecutionData);
			const decompressed = await decompressExecutionData(compressed);

			expect(decompressed).toEqual(sampleExecutionData);
		});

		it('should handle round-trip compression/decompression', async () => {
			const original = sampleExecutionData;
			const compressed = await compressExecutionData(original);
			const decompressed = await decompressExecutionData(compressed);

			expect(decompressed).toEqual(original);
		});
	});

	describe('error handling', () => {
		it('should throw error for invalid buffer', async () => {
			const invalidBuffer = Buffer.from('invalid-gzip-data');

			await expect(decompressExecutionData(invalidBuffer)).rejects.toThrow(
				'Failed to decompress execution data',
			);
		});
	});
});
