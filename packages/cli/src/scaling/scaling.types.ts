import type { RunningJobSummary } from '@n8n/api-types';
import type Bull from 'bull';
import type {
	ExecutionError,
	IExecuteResponsePromiseData,
	IRun,
	StructuredChunk,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

export type JobQueue = Bull.Queue<JobData>;

export type Job = Bull.Job<JobData>;

export type JobId = Job['id'];

export type JobData = {
	workflowId: string;
	executionId: string;
	loadStaticData: boolean;
	pushRef?: string;
	streamingEnabled?: boolean;
};

export type JobResult = {
	success: boolean;
	error?: ExecutionError;
};

export type JobStatus = Bull.JobStatus;

export type JobOptions = Bull.JobOptions;

/**
 * Message sent by main to worker and vice versa about a job. `JobMessage` is
 * sent via Bull's internal pubsub setup - do not confuse with `PubSub.Command`
 * and `PubSub.Response`, which are sent via n8n's own pubsub setup to keep
 * main and worker processes in sync outside of a job's lifecycle.
 */
export type JobMessage =
	| RespondToWebhookMessage
	| JobFinishedMessage
	| JobFailedMessage
	| AbortJobMessage
	| SendChunkMessage;

/** Message sent by worker to main to respond to a webhook. */
export type RespondToWebhookMessage = {
	kind: 'respond-to-webhook';
	executionId: string;
	response: IExecuteResponsePromiseData;
	workerId: string;
};

/** Message sent by worker to main to report a job has finished successfully. */
export type JobFinishedMessage = {
	kind: 'job-finished';
	executionId: string;
	workerId: string;
};

export type SendChunkMessage = {
	kind: 'send-chunk';
	executionId: string;
	chunkText: StructuredChunk;
	workerId: string;
};

/** Message sent by worker to main to report a job has failed. */
export type JobFailedMessage = {
	kind: 'job-failed';
	executionId: string;
	workerId: string;
	errorMsg: string;
	errorStack: string;
};

/** Message sent by main to worker to abort a job. */
export type AbortJobMessage = {
	kind: 'abort-job';
};

export type RunningJob = RunningJobSummary & {
	run: PCancelable<IRun>;
};

export type QueueRecoveryContext = {
	/** ID of timeout for next scheduled recovery cycle. */
	timeout?: NodeJS.Timeout;

	/** Number of in-progress executions to check per cycle. */
	batchSize: number;

	/** Time (in milliseconds) to wait until the next cycle. */
	waitMs: number;
};
