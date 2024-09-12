import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

import type { RunningJobSummary } from '@/scaling/scaling.types';

import type { RedisServicePubSubPublisher } from '../../redis/redis-service-pub-sub-publisher';

export interface WorkerCommandReceivedHandlerOptions {
	queueModeId: string;
	redisPublisher: RedisServicePubSubPublisher;
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
