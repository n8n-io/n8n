'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.determineFinalExecutionStatus = determineFinalExecutionStatus;
exports.prepareExecutionDataForDbUpdate = prepareExecutionDataForDbUpdate;
exports.updateExistingExecution = updateExistingExecution;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const pick_1 = __importDefault(require('lodash/pick'));
const n8n_workflow_1 = require('n8n-workflow');
const execution_metadata_service_1 = require('@/services/execution-metadata.service');
const utils_1 = require('@/utils');
function determineFinalExecutionStatus(runData) {
	const workflowHasCrashed = runData.status === 'crashed';
	const workflowWasCanceled = runData.status === 'canceled';
	const workflowHasFailed = runData.status === 'error';
	const workflowDidSucceed =
		!runData.data.resultData?.error &&
		!workflowHasCrashed &&
		!workflowWasCanceled &&
		!workflowHasFailed;
	let workflowStatusFinal = workflowDidSucceed ? 'success' : 'error';
	if (workflowHasCrashed) workflowStatusFinal = 'crashed';
	if (workflowWasCanceled) workflowStatusFinal = 'canceled';
	if (runData.waitTill) workflowStatusFinal = 'waiting';
	return workflowStatusFinal;
}
function prepareExecutionDataForDbUpdate(parameters) {
	const { runData, workflowData, workflowStatusFinal, retryOf } = parameters;
	const pristineWorkflowData = (0, pick_1.default)(workflowData, [
		'id',
		'name',
		'active',
		'isArchived',
		'createdAt',
		'updatedAt',
		'nodes',
		'connections',
		'settings',
		'staticData',
		'pinData',
	]);
	const fullExecutionData = {
		data: runData.data,
		mode: runData.mode,
		finished: runData.finished ? runData.finished : false,
		startedAt: runData.startedAt,
		stoppedAt: runData.stoppedAt,
		workflowData: pristineWorkflowData,
		waitTill: runData.waitTill,
		status: workflowStatusFinal,
		workflowId: pristineWorkflowData.id,
	};
	if (retryOf !== undefined) {
		fullExecutionData.retryOf = retryOf.toString();
	}
	const workflowId = workflowData.id;
	if ((0, utils_1.isWorkflowIdValid)(workflowId)) {
		fullExecutionData.workflowId = workflowId;
	}
	return fullExecutionData;
}
async function updateExistingExecution(parameters) {
	const logger = di_1.Container.get(backend_common_1.Logger);
	const { executionId, workflowId, executionData } = parameters;
	logger.debug(`Save execution data to database for execution ID ${executionId}`, {
		executionId,
		workflowId,
		finished: executionData.finished,
		stoppedAt: executionData.stoppedAt,
	});
	await di_1.Container.get(db_1.ExecutionRepository).updateExistingExecution(
		executionId,
		executionData,
	);
	try {
		if (executionData.data?.resultData.metadata) {
			await di_1.Container.get(execution_metadata_service_1.ExecutionMetadataService).save(
				executionId,
				executionData.data.resultData.metadata,
			);
		}
	} catch (e) {
		const error = (0, n8n_workflow_1.ensureError)(e);
		logger.error(`Failed to save metadata for execution ID ${executionId}`, { error });
	}
	if (executionData.finished === true && executionData.retryOf !== undefined) {
		await di_1.Container.get(db_1.ExecutionRepository).updateExistingExecution(
			executionData.retryOf,
			{
				retrySuccessId: executionId,
			},
		);
	}
}
//# sourceMappingURL=shared-hook-functions.js.map
