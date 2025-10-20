import type { IRun, IRunExecutionData, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

export type WorkerMessage =
	| { type: 'ping' }
	| {
			type: 'execute';
			workflow: IWorkflowBase;
			executionId: string;
			executionMode: WorkflowExecuteMode;
			executionData: IRunExecutionData;
	  };

export type MainMessage = { type: 'pong' } | { type: 'done'; run: IRun };
