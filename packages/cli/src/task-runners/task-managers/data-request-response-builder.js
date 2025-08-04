'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DataRequestResponseBuilder = void 0;
class DataRequestResponseBuilder {
	buildFromTaskData(taskData) {
		return {
			workflow: this.buildWorkflow(taskData.workflow),
			inputData: taskData.inputData,
			connectionInputSource: taskData.executeData?.source ?? null,
			itemIndex: taskData.itemIndex,
			activeNodeName: taskData.activeNodeName,
			contextNodeName: taskData.contextNodeName,
			defaultReturnRunIndex: taskData.defaultReturnRunIndex,
			mode: taskData.mode,
			envProviderState: taskData.envProviderState,
			node: taskData.node,
			runExecutionData: this.buildRunExecutionData(taskData.runExecutionData),
			runIndex: taskData.runIndex,
			selfData: taskData.selfData,
			siblingParameters: taskData.siblingParameters,
			additionalData: this.buildAdditionalData(taskData.additionalData),
		};
	}
	buildAdditionalData(additionalData) {
		return {
			formWaitingBaseUrl: additionalData.formWaitingBaseUrl,
			instanceBaseUrl: additionalData.instanceBaseUrl,
			restApiUrl: additionalData.restApiUrl,
			variables: additionalData.variables,
			webhookBaseUrl: additionalData.webhookBaseUrl,
			webhookTestBaseUrl: additionalData.webhookTestBaseUrl,
			webhookWaitingBaseUrl: additionalData.webhookWaitingBaseUrl,
			currentNodeParameters: additionalData.currentNodeParameters,
			executionId: additionalData.executionId,
			executionTimeoutTimestamp: additionalData.executionTimeoutTimestamp,
			restartExecutionId: additionalData.restartExecutionId,
			userId: additionalData.userId,
		};
	}
	buildWorkflow(workflow) {
		return {
			id: workflow.id,
			name: workflow.name,
			active: workflow.active,
			connections: workflow.connectionsBySourceNode,
			nodes: Object.values(workflow.nodes),
			pinData: workflow.pinData,
			settings: workflow.settings,
			staticData: workflow.staticData,
		};
	}
	buildRunExecutionData(runExecutionData) {
		return {
			startData: runExecutionData.startData,
			resultData: runExecutionData.resultData,
			executionData: runExecutionData.executionData
				? {
						contextData: runExecutionData.executionData.contextData,
						metadata: runExecutionData.executionData.metadata,
						nodeExecutionStack: [],
						waitingExecution: {},
						waitingExecutionSource: null,
					}
				: undefined,
		};
	}
}
exports.DataRequestResponseBuilder = DataRequestResponseBuilder;
//# sourceMappingURL=data-request-response-builder.js.map
