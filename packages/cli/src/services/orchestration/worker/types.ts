import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { RunningJobSummary } from '@/scaling/scaling.types';

export interface WorkerCommandReceivedHandlerOptions {
	queueModeId: string;
	redisPublisher: Publisher;
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
