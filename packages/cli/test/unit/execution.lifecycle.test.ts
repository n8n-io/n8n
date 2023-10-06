import config from '@/config';
import { restoreBinaryDataId } from '@/executionLifecycleHooks/restoreBinaryDataId';
import { BinaryDataService } from 'n8n-core';
import { mockInstance } from '../integration/shared/utils/mocking';
import { toSaveSettings } from '@/executionLifecycleHooks/toSaveSettings';
import type { IRun } from 'n8n-workflow';
import type { IWorkflowSettings } from 'n8n-workflow';
import type { DefaultSaveSettings } from '@/executionLifecycleHooks/toSaveSettings';

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

describe('on filesystem mode', () => {
	describe('restoreBinaryDataId()', () => {
		beforeAll(() => {
			config.set('binaryDataManager.mode', 'filesystem');
		});

		afterEach(() => {
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
	});
});

describe('on s3 mode', () => {
	describe('restoreBinaryDataId()', () => {
		beforeAll(() => {
			config.set('binaryDataManager.mode', 's3');
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
	});

	it('should do nothing on itemless case', async () => {
		const executionId = '999';

		const promise = restoreBinaryDataId(toIRun(), executionId);

		await expect(promise).resolves.not.toThrow();

		expect(binaryDataService.rename).not.toHaveBeenCalled();
	});
});

describe('toSaveSettings()', () => {
	const defaults: DefaultSaveSettings = {
		saveDataErrorExecution: 'all',
		saveDataSuccessExecution: 'all',
		saveManualExecutions: true,
	};

	it('should handle saving error executions', () => {
		const workflowSettings: IWorkflowSettings = { saveDataErrorExecution: 'all' };
		const saveSettings = toSaveSettings(defaults, workflowSettings);

		expect(saveSettings.error).toBe(true);

		const _workflowSettings: IWorkflowSettings = { saveDataErrorExecution: 'none' };
		const _saveSettings = toSaveSettings(defaults, _workflowSettings);

		expect(_saveSettings.error).toBe(false);
	});

	it('should handle saving success executions', () => {
		const workflow: IWorkflowSettings = { saveDataSuccessExecution: 'all' };
		const saveSettings = toSaveSettings(defaults, workflow);

		expect(saveSettings.success).toBe(true);

		const _workflowSettings: IWorkflowSettings = { saveDataSuccessExecution: 'none' };
		const _saveSettings = toSaveSettings(defaults, _workflowSettings);

		expect(_saveSettings.success).toBe(false);
	});

	it('should handle saving manual executions', () => {
		const workflow: IWorkflowSettings = { saveManualExecutions: true };
		const saveSettings = toSaveSettings(defaults, workflow);

		expect(saveSettings.manual).toBe(true);

		const _workflowSettings: IWorkflowSettings = { saveManualExecutions: false };
		const _saveSettings = toSaveSettings(defaults, _workflowSettings);

		expect(_saveSettings.manual).toBe(false);
	});

	it('should handle undefined workflow settings', () => {
		const saveSettings = toSaveSettings(defaults);

		expect(saveSettings.error).toBe(true);
		expect(saveSettings.success).toBe(true);
		expect(saveSettings.manual).toBe(true);
	});
});
