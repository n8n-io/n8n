import type { ExecuteWorkflowOptions, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

export function inheritSubWorkflowContext(
	child: IWorkflowExecuteAdditionalData,
	parent: IWorkflowExecuteAdditionalData,
	options: ExecuteWorkflowOptions,
) {
	child.parentCallbackManager = options.parentCallbackManager;
	child.rootExecutionMode = parent.rootExecutionMode ?? options.executionMode;
	child.evaluationRunId = parent.evaluationRunId;
	if (parent.httpResponse) child.httpResponse = parent.httpResponse;
	child.streamingEnabled = parent.streamingEnabled;
}
