import type { IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

export type StopTrigger = 'threshold' | 'critical' | 'hold-limit';

export interface StopTarget {
	rootId: string;
	workflow: IWorkflowBase;
	mode: WorkflowExecuteMode;
	/** Running executions of the tree, the root first. */
	memberIds: string[];
	estimatedBytes: number;
}
