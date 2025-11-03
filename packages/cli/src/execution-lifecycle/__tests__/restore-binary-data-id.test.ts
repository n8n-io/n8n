import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { BinaryDataConfig, BinaryDataService } from 'n8n-core';
import type { INodeExecutionData, IRun, ITaskData, ITaskDataConnections } from 'n8n-workflow';

import {
	replaceTempExecutionId,
	restoreBinaryDataId,
} from '@/execution-lifecycle/restore-binary-data-id';

function toIRunWithMultipleNodes(nodes: Record<string, object | undefined>): IRun {
	return Object.entries(nodes).reduce<IRun>(
		(acc, [nodeName, item]) => {
			acc.data.resultData.runData[nodeName] = [
				{
					data: {
						main: [[item as unknown as INodeExecutionData]],
					} as ITaskDataConnections,
				} as ITaskData,
			];

			return acc;
		},
		{
			data: {
				resultData: {
					runData: {},
				},
			},
		} as IRun,
	);
}

function toIRun(item?: object, nodeName = 'myNode') {
	return toIRunWithMultipleNodes({ [nodeName]: item });
}

function getDataId(
	run: IRun,
	kind: 'binary' | 'json',
	nodeName = 'myNode',
	dataKey: string = 'data',
) {
	const data = run.data.resultData.runData[nodeName][0]?.data?.main[0]?.[0]?.[kind]?.[dataKey];

	return typeof data === 'object' && data !== null && 'id' in data ? data.id : undefined;
}

const binaryDataService = mockInstance(BinaryDataService);

for (const mode of ['filesystem', 's3'] as const) {
	describe(`on ${mode} mode`, () => {
		beforeAll(() => {
			Container.get(BinaryDataConfig).mode = mode;
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should restore if binary data ID is missing execution ID', async () => {
			const workflowId = '6HYhhKmJch2cYxGj';
			const executionId = '999';
			const binaryDataFileUuid = 'a5c3f1ed-9d59-4155-bc68-9a370b3c51f6';

			const incorrectFileId = `workflows/${workflowId}/executions/temp/binary_data/${binaryDataFileUuid}`;

			const run = toIRun({
				binary: {
					data: { id: `s3:${incorrectFileId}` },
				},
			});

			await restoreBinaryDataId(run, executionId, 'webhook');

			const correctFileId = incorrectFileId.replace('temp', executionId);
			const correctBinaryDataId = `s3:${correctFileId}`;

			expect(binaryDataService.rename).toHaveBeenCalledWith(incorrectFileId, correctFileId);
			expect(getDataId(run, 'binary')).toBe(correctBinaryDataId);
		});

		it('should do nothing if binary data ID is not missing execution ID', async () => {
			const workflowId = '6HYhhKmJch2cYxGj';
			const executionId = '999';
			const binaryDataFileUuid = 'a5c3f1ed-9d59-4155-bc68-9a370b3c51f6';

			const fileId = `workflows/${workflowId}/executions/${executionId}/binary_data/${binaryDataFileUuid}`;

			const binaryDataId = `s3:${fileId}`;

			const run = toIRun({
				binary: {
					data: {
						id: binaryDataId,
					},
				},
			});

			await restoreBinaryDataId(run, executionId, 'webhook');

			expect(binaryDataService.rename).not.toHaveBeenCalled();
			expect(getDataId(run, 'binary')).toBe(binaryDataId);
		});

		it('should do nothing if no binary data ID', async () => {
			const executionId = '999';
			const dataId = '123';

			const run = toIRun({
				json: {
					data: { id: dataId },
				},
			});

			await restoreBinaryDataId(run, executionId, 'webhook');

			expect(binaryDataService.rename).not.toHaveBeenCalled();
			expect(getDataId(run, 'json')).toBe(dataId);
		});

		it('should do nothing on itemless case', async () => {
			const executionId = '999';

			const promise = restoreBinaryDataId(toIRun(), executionId, 'webhook');

			await expect(promise).resolves.not.toThrow();

			expect(binaryDataService.rename).not.toHaveBeenCalled();
		});

		it('should do nothing if data is undefined', async () => {
			const executionId = '999';

			const run = toIRun({
				json: {
					data: undefined,
				},
			});

			const promise = restoreBinaryDataId(run, executionId, 'webhook');

			await expect(promise).resolves.not.toThrow();

			expect(binaryDataService.rename).not.toHaveBeenCalled();
		});

		it('should do nothing if workflow execution mode is not `webhook` or `chat`', async () => {
			const executionId = '999';

			const run = toIRun({
				json: {
					data: undefined,
				},
			});

			const promise = restoreBinaryDataId(run, executionId, 'internal');

			await expect(promise).resolves.not.toThrow();

			expect(binaryDataService.rename).not.toHaveBeenCalled();
		});

		it('should work with `chat` execution mode', async () => {
			const workflowId = '6HYhhKmJch2cYxGj';
			const executionId = '999';
			const binaryDataFileUuid = 'a5c3f1ed-9d59-4155-bc68-9a370b3c51f6';

			const incorrectFileId = `workflows/${workflowId}/executions/temp/binary_data/${binaryDataFileUuid}`;

			const run = toIRun({
				binary: {
					data0: { id: `s3:${incorrectFileId}` },
				},
			});

			await restoreBinaryDataId(run, executionId, 'chat');

			const correctFileId = incorrectFileId.replace('temp', executionId);
			const correctBinaryDataId = `s3:${correctFileId}`;

			expect(binaryDataService.rename).toHaveBeenCalledWith(incorrectFileId, correctFileId);
			expect(getDataId(run, 'binary', 'myNode', 'data0')).toBe(correctBinaryDataId);
		});

		it('should handle multiple binary fields (data0, data1, etc.)', async () => {
			const workflowId = '6HYhhKmJch2cYxGj';
			const executionId = '999';
			const binaryDataFileUuid1 = 'a5c3f1ed-9d59-4155-bc68-9a370b3c51f6';
			const binaryDataFileUuid2 = 'b6d4g2fe-0e60-5266-cd79-0b481c4d62g7';

			const incorrectFileId1 = `workflows/${workflowId}/executions/temp/binary_data/${binaryDataFileUuid1}`;
			const incorrectFileId2 = `workflows/${workflowId}/executions/temp/binary_data/${binaryDataFileUuid2}`;

			const run = toIRun({
				binary: {
					data0: { id: `s3:${incorrectFileId1}` },
					data1: { id: `s3:${incorrectFileId2}` },
				},
			});

			await restoreBinaryDataId(run, executionId, 'chat');

			const correctFileId1 = incorrectFileId1.replace('temp', executionId);
			const correctFileId2 = incorrectFileId2.replace('temp', executionId);

			expect(binaryDataService.rename).toHaveBeenCalledTimes(2);
			expect(binaryDataService.rename).toHaveBeenCalledWith(incorrectFileId1, correctFileId1);
			expect(binaryDataService.rename).toHaveBeenCalledWith(incorrectFileId2, correctFileId2);
			expect(getDataId(run, 'binary', 'myNode', 'data0')).toBe(`s3:${correctFileId1}`);
			expect(getDataId(run, 'binary', 'myNode', 'data1')).toBe(`s3:${correctFileId2}`);
		});

		it('should not rename the same file twice when it appears in multiple nodes', async () => {
			const workflowId = '6HYhhKmJch2cYxGj';
			const executionId = '999';
			const binaryDataFileUuid = 'a5c3f1ed-9d59-4155-bc68-9a370b3c51f6';

			const incorrectFileId = `workflows/${workflowId}/executions/temp/binary_data/${binaryDataFileUuid}`;

			const run = toIRunWithMultipleNodes({
				triggerNode: {
					binary: {
						data0: { id: `s3:${incorrectFileId}` },
					},
				},
				mergeNode: {
					binary: {
						data0: { id: `s3:${incorrectFileId}` },
					},
				},
			});

			await restoreBinaryDataId(run, executionId, 'chat');

			const correctFileId = incorrectFileId.replace('temp', executionId);
			const correctBinaryDataId = `s3:${correctFileId}`;

			// Should only rename once, even though it appears in two nodes
			expect(binaryDataService.rename).toHaveBeenCalledTimes(1);
			expect(binaryDataService.rename).toHaveBeenCalledWith(incorrectFileId, correctFileId);

			// Both nodes should have updated references
			expect(getDataId(run, 'binary', 'triggerNode', 'data0')).toBe(correctBinaryDataId);
			expect(getDataId(run, 'binary', 'mergeNode', 'data0')).toBe(correctBinaryDataId);
		});

		it('should ignore error thrown on renaming', async () => {
			const workflowId = '6HYhhKmJch2cYxGj';
			const executionId = 'temp';
			const binaryDataFileUuid = 'a5c3f1ed-9d59-4155-bc68-9a370b3c51f6';

			const incorrectFileId = `workflows/${workflowId}/executions/temp/binary_data/${binaryDataFileUuid}`;

			const run = toIRun({
				binary: {
					data: { id: `s3:${incorrectFileId}` },
				},
			});

			binaryDataService.rename.mockRejectedValueOnce(new Error('ENOENT'));

			const promise = restoreBinaryDataId(run, executionId, 'webhook');

			await expect(promise).resolves.not.toThrow();

			expect(binaryDataService.rename).toHaveBeenCalled();
		});
	});
}

describe('on default mode', () => {
	it('should do nothing', async () => {
		Container.get(BinaryDataConfig).mode = 'default';

		const executionId = '999';

		const run = toIRun({
			json: {
				data: undefined,
			},
		});

		const promise = restoreBinaryDataId(run, executionId, 'internal');

		await expect(promise).resolves.not.toThrow();

		expect(binaryDataService.rename).not.toHaveBeenCalled();
	});
});

describe('replaceTempExecutionId', () => {
	it('should replace temp execution ID with actual execution ID', () => {
		const originalId = 'filesystem-v2:workflows/w0/executions/temp/binary_data/b0';

		const result = replaceTempExecutionId('e0', originalId);

		expect(result).toEqual({
			originalFileId: 'workflows/w0/executions/temp/binary_data/b0',
			resolvedFileId: 'workflows/w0/executions/e0/binary_data/b0',
			resolvedId: 'filesystem-v2:workflows/w0/executions/e0/binary_data/b0',
		});
	});

	it('should return undefined when binary data already has a real execution ID', () => {
		const originalId = 'filesystem-v2:workflows/w0/executions/e0/binary_data/b0';

		const result = replaceTempExecutionId('e0', originalId);

		expect(result).toBeUndefined();
	});
});
