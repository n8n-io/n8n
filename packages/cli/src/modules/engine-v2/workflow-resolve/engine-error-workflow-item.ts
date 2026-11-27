import type { ExecutionError, IDataObject } from 'n8n-workflow';
import { jsonParse, jsonStringify, WorkflowOperationError } from 'n8n-workflow';
import { fromV1ErrorDetails } from '@n8n/node-engine-compatibility';

import { asWorkflowSnapshot } from '@/executions/engine-v2-execution-reader.service';
import type { IWorkflowErrorData } from '@/interfaces';
import type { ErrorWorkflowOwner } from '@/workflows/error-workflow-id';

import type { ResolveErrorWorkflowRequest } from './engine-workflow-resolve.contract';

type ErrorWorkflowSource = ResolveErrorWorkflowRequest['source'];

export type FailedWorkflow = ErrorWorkflowOwner & { name: string };

/**
 * A sub-execution copies the caller context of its parent, so it can have the
 * host mode `error` too. v1 runs it as `integrated`, so it is no error run.
 */
export const isErrorRun = (source: ErrorWorkflowSource) =>
	source.hostMode === 'error' && !source.hasParent;

/** The failed workflow as it ran. The id comes from the execution, not from the document. */
export function toFailedWorkflow(source: ErrorWorkflowSource): FailedWorkflow | undefined {
	const document = asWorkflowSnapshot(source.workflow);
	if (!document) return undefined;
	const { nodes, settings, name } = document;
	return { id: source.workflowId, name, nodes, settings };
}

/** The error that v1 stores in the run data of the failed run. */
function toFailureError(source: ErrorWorkflowSource): ExecutionError {
	if (source.failedStep) {
		const { name, message, details } = source.failedStep.error;
		return fromV1ErrorDetails(name, message, details);
	}
	return new WorkflowOperationError('The execution failed');
}

/** The v1 item of the Error Trigger, as JSON. The error is reduced to what v1 persists of it. */
export function toErrorItem(
	source: ErrorWorkflowSource,
	failedWorkflow: FailedWorkflow,
	url: string,
): IDataObject {
	const item: IWorkflowErrorData = {
		execution: {
			id: source.executionId,
			url,
			error: toFailureError(source),
			lastNodeExecuted: source.failedStep?.nodeName,
			mode: source.hasParent ? 'integrated' : source.hostMode,
		},
		workflow: { id: failedWorkflow.id, name: failedWorkflow.name },
	};
	return jsonParse<IDataObject>(jsonStringify(item));
}
