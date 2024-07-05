import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';
import type { RedisServicePubSubPublisher } from '../../redis/RedisServicePubSubPublisher';
import type { RunningJobSummary } from '@/scaling-mode/types';

export interface WorkerCommandReceivedHandlerOptions {
	queueModeId: string;
	redisPublisher: RedisServicePubSubPublisher;
	getRunningJobIds: () => string[];
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
