import type { IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

import type { RunDataEstimate } from './run-data-tracker';

export type StopTrigger = 'threshold' | 'critical' | 'hold-limit';

export interface StopTarget {
	rootId: string;
	workflow: IWorkflowBase;
	mode: WorkflowExecuteMode;
	/** Running executions of the tree, the root first. */
	memberIds: string[];
	estimatedBytes: number;
	/** The estimate of the member with the most run data. */
	largestEstimate: RunDataEstimate | undefined;
	largestWorkflow: IWorkflowBase;
}
