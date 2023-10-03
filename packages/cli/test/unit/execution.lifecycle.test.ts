import { restoreBinaryDataId } from '@/executionLifecycleHooks/restoreBinaryDataId';
import { BinaryDataService } from 'n8n-core';
import { mockInstance } from '../integration/shared/utils/mocking';
import type { IRun } from 'n8n-workflow';

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
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return run.data.resultData.runData.myNode[0].data.main[0][0][kind].data.id;
}

describe('restoreBinaryDataId()', () => {
	const binaryDataService = mockInstance(BinaryDataService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should restore if binary data ID is missing execution ID', async () => {
		const executionId = '999';
		const incorrectFileId = 'a5c3f1ed-9d59-4155-bc68-9a370b3c51f6';
		const run = toIRun({
			binary: {
				data: { id: `filesystem:${incorrectFileId}` },
			},
		});

		await restoreBinaryDataId(run, executionId);

		const correctFileId = `${executionId}${incorrectFileId}`;
		const correctBinaryDataId = `filesystem:${correctFileId}`;

		expect(binaryDataService.rename).toHaveBeenCalledWith(incorrectFileId, correctFileId);
		expect(getDataId(run, 'binary')).toBe(correctBinaryDataId);
	});

	it('should do nothing if binary data ID is not missing execution ID', async () => {
		const executionId = '999';
		const fileId = `${executionId}a5c3f1ed-9d59-4155-bc68-9a370b3c51f6`;
		const binaryDataId = `filesystem:${fileId}`;
		const run = toIRun({
			binary: {
				data: {
					id: binaryDataId,
				},
			},
		});

		await restoreBinaryDataId(run, executionId);

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

		await restoreBinaryDataId(run, executionId);

		expect(binaryDataService.rename).not.toHaveBeenCalled();
		expect(getDataId(run, 'json')).toBe(dataId);
	});

	it('should do nothing on itemless case', async () => {
		const executionId = '999';

		const promise = restoreBinaryDataId(toIRun(), executionId);

		await expect(promise).resolves.not.toThrow();

		expect(binaryDataService.rename).not.toHaveBeenCalled();
	});
});
