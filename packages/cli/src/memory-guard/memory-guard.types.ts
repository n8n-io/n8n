import type { IWorkflowBase } from 'n8n-workflow';

export type StopTrigger = 'threshold' | 'critical' | 'hold-limit';

export interface StopTarget {
	rootId: string;
	workflow: IWorkflowBase;
	/** Running executions of the tree, the root first. */
	memberIds: string[];
	estimatedBytes: number;
}
