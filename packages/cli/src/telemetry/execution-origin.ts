import type {
	IWorkflowExecutionDataProcess,
	WorkflowExecutionCaller,
	WorkflowExecutionOrigin,
} from 'n8n-workflow';

/**
 * Returns how a run started, from what is known when its execution is created, so that its
 * telemetry does not have to work it out when the run ends. Returns `undefined` when no agent,
 * parent workflow, public API call or Instance AI started the run.
 *
 * Only for telemetry, so it must never throw or change `data` while a run starts.
 */
export function getExecutionOrigin(
	data: IWorkflowExecutionDataProcess,
): WorkflowExecutionOrigin | undefined {
	const caller = getCaller(data);
	return caller ? { caller } : undefined;
}

function getCaller(data: IWorkflowExecutionDataProcess): WorkflowExecutionCaller | undefined {
	// The public API endpoints that start runs set it.
	const origin = data.telemetryMetadata?.origin;
	if (typeof origin === 'object' && origin.caller) return origin.caller;
	// A retry copies the run data of the original execution, but its caller starts it.
	if (data.executionMode === 'retry') return undefined;
	if (data.executionData?.parentAgentRun) return 'agent';
	if (data.executionData?.parentExecution) return 'workflow';
	// The same source that labels the run's `execution_source`. A worker or a resumed run only has
	// the copy saved with the execution.
	if ((data.source ?? data.executionData?.manualData?.source) === 'instance_ai') {
		return 'instance_ai';
	}
	return undefined;
}
