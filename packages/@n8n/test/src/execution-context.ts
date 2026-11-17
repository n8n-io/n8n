import type { ExecutionLifecycleHooks } from 'n8n-core';
import type {
	IDataObject,
	ITaskData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

import type { WorkflowTestError } from './errors';
import type { HttpRequest } from './http/http-request';
import type { NodeReference, WorkflowHandle } from './workflow-set';

export interface ExecuteWorkflowOptions {
	input?: IDataObject | IDataObject[];
	trigger?: string | NodeReference;
	staticData?: IDataObject;
	allowHttp?: boolean | string[];
}

export interface NodeRunRecord {
	parameters: Array<Record<string, unknown>>;
	requests: HttpRequest[];
}

export interface CompletedNodeRun {
	record: NodeRunRecord;
	task: ITaskData;
}

export interface OpenNodeRun {
	node: string;
	record: NodeRunRecord;
}

export interface NodeRunLog {
	open: OpenNodeRun[];
	completed: Map<string, CompletedNodeRun[]>;
}

export interface ExecutionSetup {
	executionId: string;
	options: ExecuteWorkflowOptions;
	handle: WorkflowHandle;
	workflowData: IWorkflowBase;
	workflow: Workflow;
	hooks: ExecutionLifecycleHooks;
	runs: NodeRunLog;
	fatalError?: WorkflowTestError;
}

export interface ExecutionContext extends ExecutionSetup {
	additionalData: IWorkflowExecuteAdditionalData;
}

export function failExecution(context: ExecutionSetup, error: WorkflowTestError): never {
	context.fatalError ??= error;
	throw error;
}
