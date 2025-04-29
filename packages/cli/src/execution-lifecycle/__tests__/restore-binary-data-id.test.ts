import { Container } from '@n8n/di';
import { BinaryDataConfig, BinaryDataService } from 'n8n-core';
import type { IRun } from 'n8n-workflow';

import { restoreBinaryDataId } from '@/execution-lifecycle/restore-binary-data-id';
import { mockInstance } from '@test/mocking';

function toIRun(item?: object) {
	return {
		data: {
			resultData: {
				runData: {
					myNode: [
						{
							data: {
								main: [[item]],
							},
						},
					],
				},
			},
		},
	} as unknown as IRun;
}

function getDataId(run: IRun, kind: 'binary' | 'json') {
	// @ts-expect-error The type doesn't have the correct structure
	return run.data.resultData.runData.myNode[0].data.main[0][0][kind].data.id;
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
			const executionId = 'temp';
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

		it('should do nothing if workflow execution mode is not `webhook`', async () => {
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
