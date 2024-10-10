import type { RunningJobSummary } from '@n8n/api-types';
import type Bull from 'bull';
import type { ExecutionError, IExecuteResponsePromiseData, IRun } from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

export type JobQueue = Bull.Queue<JobData>;

export type Job = Bull.Job<JobData>;

export type JobId = Job['id'];

export type JobData = {
	executionId: string;
	loadStaticData: boolean;
};

export type JobResult = {
	success: boolean;
	error?: ExecutionError;
};

export type JobStatus = Bull.JobStatus;

export type JobOptions = Bull.JobOptions;

/**
 * Message sent via Bull's pubsub mechanism during the execution of a job.
 * Do not confuse Bull's pubsub mechanism with n8n's own pubsub setup.
 */
export type JobMessage = JobMessageToMain | JobMessageToWorker;

type JobMessageToMain = RespondToWebhookMessage | JobFinishedMessage | JobFailedMessage;

type JobMessageToWorker = AbortJobMessage;

type RespondToWebhookMessage = {
	kind: 'respond-to-webhook';
	executionId: string;
	response: IExecuteResponsePromiseData;
	workerId: string;
};

type JobFinishedMessage = {
	kind: 'job-finished';
	executionId: string;
	workerId: string;
};

type JobFailedMessage = {
	kind: 'job-failed';
	executionId: string;
	workerId: string;
	error: Error;
};

type AbortJobMessage = {
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
