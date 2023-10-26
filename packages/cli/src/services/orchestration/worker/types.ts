import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';
import type { RedisServicePubSubPublisher } from '../../redis/RedisServicePubSubPublisher';

export interface WorkerCommandReceivedHandlerOptions {
	queueModeId: string;
	redisPublisher: RedisServicePubSubPublisher;
	getRunningJobIds: () => string[];
	getRunningJobsSummary: () => WorkerJobStatusSummary[];
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
