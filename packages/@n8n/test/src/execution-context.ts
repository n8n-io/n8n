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
import type { TestCredential } from './instance-state/credentials';
import type { Redaction } from './http/redact';
import type { WebhookCapture } from './runtime/webhook-response';
import type { NodeReference, WorkflowHandle } from './workflow-set';

export interface ExecuteWorkflowOptions {
	input?: IDataObject | IDataObject[];
	trigger?: string | NodeReference;
	staticData?: IDataObject;
	now?: string | Date;
	credentials?: Record<string, TestCredential>;
	variables?: Record<string, string | null>;
	secrets?: Record<string, Record<string, string | null>>;
	env?: Record<string, string>;
	allowHttp?: boolean | string[];
	redact?: boolean;
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
	redactions: Redaction[];
	webhook?: WebhookCapture;
}

export interface ExecutionContext extends ExecutionSetup {
	additionalData: IWorkflowExecuteAdditionalData;
}

export function failExecution(context: ExecutionSetup, error: WorkflowTestError): never {
	context.fatalError ??= error;
	throw error;
}
