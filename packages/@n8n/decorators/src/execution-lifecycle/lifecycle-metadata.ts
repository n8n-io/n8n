import { Service } from '@n8n/di';
import type {
	IDataObject,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
	IWorkflowBase,
	Workflow,
} from 'n8n-workflow';

import type { Class } from '../types';

export type LifecycleHandlerClass = Class<
	Record<string, (ctx: LifecycleContext) => Promise<void> | void>
>;

export type NodeExecuteBeforeContext = {
	type: 'nodeExecuteBefore';
	workflow: IWorkflowBase;
	nodeName: string;
	taskData: ITaskStartedData;
};

export type NodeExecuteAfterContext = {
	type: 'nodeExecuteAfter';
	workflow: IWorkflowBase;
	nodeName: string;
	taskData: ITaskData;
	executionData: IRunExecutionData;
};

export type WorkflowExecuteBeforeContext = {
	type: 'workflowExecuteBefore';
	workflow: IWorkflowBase;
	workflowInstance: Workflow;
	executionData?: IRunExecutionData;
};

export type WorkflowExecuteAfterContext = {
	type: 'workflowExecuteAfter';
	workflow: IWorkflowBase;
	runData: IRun;
	newStaticData: IDataObject;
};

/** Context arg passed to a lifecycle event handler method. */
export type LifecycleContext =
	| NodeExecuteBeforeContext
	| NodeExecuteAfterContext
	| WorkflowExecuteBeforeContext
	| WorkflowExecuteAfterContext;

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
