import type { RunningJobSummary } from '@n8n/api-types';
import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

export interface WorkerCommandReceivedHandlerOptions {
	queueModeId: string;
	publisher: Publisher;
	getRunningJobIds: () => Array<string | number>;
	getRunningJobsSummary: () => RunningJobSummary[];
}

export interface WorkerJobStatusSummary {
	jobId: string;
	executionId: string;
	retryOf?: string;
	startedAt: Date;
	mode: WorkflowExecuteMode;
	workflowName: string;
	workflowId: string;
	status: ExecutionStatus;
}
