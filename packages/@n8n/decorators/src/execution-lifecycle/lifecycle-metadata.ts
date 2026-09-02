import { Service } from '@n8n/di';
import type {
	IDataObject,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
	IWorkflowBase,
	Workflow,
	WorkflowExecuteMode,
	WorkflowExecutionSource,
} from 'n8n-workflow';

import type { Class } from '../types';

export type LifecycleHandlerClass = Class<
	Record<string, (ctx: LifecycleContext) => Promise<void> | void>
>;

export type NodeExecuteBeforeContext = {
	type: 'nodeExecuteBefore';
	workflow: IWorkflowBase;
	mode: WorkflowExecuteMode;
	nodeName: string;
	taskData: ITaskStartedData;
	executionId: string;
};

export type NodeExecuteAfterContext = {
	type: 'nodeExecuteAfter';
	workflow: IWorkflowBase;
	mode: WorkflowExecuteMode;
	nodeName: string;
	taskData: ITaskData;
	executionData: IRunExecutionData;
	executionId: string;
};

export type WorkflowExecuteBeforeContext = {
	type: 'workflowExecuteBefore';
	workflow: IWorkflowBase;
	mode: WorkflowExecuteMode;
	/** Only the engine's own call carries one — queue-mode main and the failure recorder don't. */
	workflowInstance: Workflow | undefined;
	executionData?: IRunExecutionData;
	executionId: string;
};

export type WorkflowExecuteAfterContext = {
	type: 'workflowExecuteAfter';
	workflow: IWorkflowBase;
	mode: WorkflowExecuteMode;
	runData: IRun;
	newStaticData: IDataObject;
	executionId: string;
	retryOf?: string;
	/** Who initiated the run. Unset means a regular user-initiated run. */
	source?: WorkflowExecutionSource;
};

export type WorkflowExecuteResumeContext = {
	type: 'workflowExecuteResume';
	workflow: IWorkflowBase;
	mode: WorkflowExecuteMode;
	workflowInstance: Workflow;
	executionData: IRunExecutionData;
	executionId: string;
};

/** Context arg passed to a lifecycle event handler method. */
export type LifecycleContext =
	| NodeExecuteBeforeContext
	| NodeExecuteAfterContext
	| WorkflowExecuteBeforeContext
	| WorkflowExecuteAfterContext
	| WorkflowExecuteResumeContext;

type LifecycleHandler = {
	/** Class holding the method to call on a lifecycle event. */
	handlerClass: LifecycleHandlerClass;

	/** Name of the method to call on a lifecycle event. */
	methodName: string;

	/** Name of the lifecycle event to listen to. */
	eventName: LifecycleEvent;
};

export type LifecycleEvent = LifecycleContext['type'];

@Service()
export class LifecycleMetadata {
	private readonly handlers: LifecycleHandler[] = [];

	register(handler: LifecycleHandler) {
		this.handlers.push(handler);
	}

	getHandlers(): LifecycleHandler[] {
		return this.handlers;
	}
}
