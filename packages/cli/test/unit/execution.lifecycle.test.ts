import { restoreBinaryDataId } from '@/executionLifecycleHooks/restoreBinaryDataId';
import { BinaryDataService } from 'n8n-core';
import { mockInstance } from '../integration/shared/utils/mocking';
import { toSaveSettings } from '@/executionLifecycleHooks/toSaveSettings';
import type { IRun } from 'n8n-workflow';
import config from '@/config';

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

const binaryDataService = mockInstance(BinaryDataService);

for (const mode of ['filesystem-v2', 's3'] as const) {
	describe(`on ${mode} mode`, () => {
		describe('restoreBinaryDataId()', () => {
			beforeAll(() => {
				config.set('binaryDataManager.mode', mode);
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

				await restoreBinaryDataId(run, executionId);

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

			it('should do nothing if data is undefined', async () => {
				const executionId = '999';

				const run = toIRun({
					json: {
						data: undefined,
					},
				});

				const promise = restoreBinaryDataId(run, executionId);

				await expect(promise).resolves.not.toThrow();

				expect(binaryDataService.rename).not.toHaveBeenCalled();
			});
		});
	});

	it('should do nothing on itemless case', async () => {
		const executionId = '999';

		const promise = restoreBinaryDataId(toIRun(), executionId);

		await expect(promise).resolves.not.toThrow();

		expect(binaryDataService.rename).not.toHaveBeenCalled();
	});
}

describe('toSaveSettings()', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should set `error` based on workflow settings', () => {
		const saveSettings = toSaveSettings({ saveDataErrorExecution: 'all' });

		expect(saveSettings.error).toBe(true);

		const _saveSettings = toSaveSettings({ saveDataErrorExecution: 'none' });

		expect(_saveSettings.error).toBe(false);
	});

	it('should set `success` based on workflow settings', () => {
		const saveSettings = toSaveSettings({ saveDataSuccessExecution: 'all' });

		expect(saveSettings.success).toBe(true);

		const _saveSettings = toSaveSettings({ saveDataSuccessExecution: 'none' });

		expect(_saveSettings.success).toBe(false);
	});

	it('should set `manual` based on workflow settings', () => {
		const saveSettings = toSaveSettings({ saveManualExecutions: true });

		expect(saveSettings.manual).toBe(true);

		const _saveSettings = toSaveSettings({ saveManualExecutions: false });

		expect(_saveSettings.manual).toBe(false);
	});

	it('should return defaults if no workflow settings', async () => {
		const saveSettings = toSaveSettings();

		expect(saveSettings.error).toBe(true);
		expect(saveSettings.success).toBe(true);
		expect(saveSettings.manual).toBe(true);
	});
});
