'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.saveExecutionProgress = saveExecutionProgress;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
async function saveExecutionProgress(workflowId, executionId, nodeName, data, executionData) {
	const logger = di_1.Container.get(backend_common_1.Logger);
	const executionRepository = di_1.Container.get(db_1.ExecutionRepository);
	const errorReporter = di_1.Container.get(n8n_core_1.ErrorReporter);
	try {
		logger.debug(`Save execution progress to database for execution ID ${executionId} `, {
			executionId,
			nodeName,
		});
		const fullExecutionData = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		if (!fullExecutionData) {
			return;
		}
		if (fullExecutionData.finished) {
			return;
		}
		fullExecutionData.data ??= {
			startData: {},
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};
		const { runData } = fullExecutionData.data.resultData;
		(runData[nodeName] ??= []).push(data);
		fullExecutionData.data.executionData = executionData.executionData;
		fullExecutionData.data.resultData.lastNodeExecuted = nodeName;
		if (fullExecutionData.status !== 'canceled') {
			fullExecutionData.status = 'running';
		}
		await executionRepository.updateExistingExecution(executionId, fullExecutionData);
	} catch (e) {
		const error = e instanceof Error ? e : new Error(`${e}`);
		errorReporter.error(error);
		logger.error(
			`Failed saving execution progress to database for execution ID ${executionId} (hookFunctionsSaveProgress, nodeExecuteAfter)`,
			{ error, executionId, workflowId },
		);
	}
}
//# sourceMappingURL=save-execution-progress.js.map
