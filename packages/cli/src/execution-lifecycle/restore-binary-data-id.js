'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.restoreBinaryDataId = restoreBinaryDataId;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
async function restoreBinaryDataId(run, executionId, workflowExecutionMode) {
	if (
		workflowExecutionMode !== 'webhook' ||
		di_1.Container.get(n8n_core_1.BinaryDataConfig).mode === 'default'
	) {
		return;
	}
	try {
		const { runData } = run.data.resultData;
		const promises = Object.keys(runData).map(async (nodeName) => {
			const binaryDataId = runData[nodeName]?.[0]?.data?.main?.[0]?.[0]?.binary?.data?.id;
			if (!binaryDataId) return;
			const [mode, fileId] = binaryDataId.split(':');
			const isMissingExecutionId = fileId.includes('/temp/');
			if (!isMissingExecutionId) return;
			const correctFileId = fileId.replace('temp', executionId);
			await di_1.Container.get(n8n_core_1.BinaryDataService).rename(fileId, correctFileId);
			const correctBinaryDataId = `${mode}:${correctFileId}`;
			run.data.resultData.runData[nodeName][0].data.main[0][0].binary.data.id = correctBinaryDataId;
		});
		await Promise.all(promises);
	} catch (e) {
		const error = e instanceof Error ? e : new Error(`${e}`);
		const logger = di_1.Container.get(backend_common_1.Logger);
		if (error.message.includes('ENOENT')) {
			logger.warn('Failed to restore binary data ID - No such file or dir', {
				executionId,
				error,
			});
			return;
		}
		logger.error('Failed to restore binary data ID - Unknown error', { executionId, error });
	}
}
//# sourceMappingURL=restore-binary-data-id.js.map
