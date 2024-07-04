import type { Redis, Cluster } from 'ioredis';
import type { ExecutionError, IExecuteResponsePromiseData } from 'n8n-workflow';
import type Bull from 'bull';

export type Queue = Bull.Queue<JobData>;

export type Job = Bull.Job<JobData>;

export type JobId = Job['id'];

export type JobProcessorFn = Bull.ProcessCallbackFunction<JobData>;

export type JobData = {
	executionId: string;
	loadStaticData: boolean;
};

export type JobResult = {
	success: boolean;
	error?: ExecutionError;
};

export type JobName = 'job';

export type JobStatus = Bull.JobStatus;

export type JobOptions = Bull.JobOptions;

export type JobProgressReport = WebhookResponse; // in future, possibly more

type WebhookResponse = {
	kind: 'webhook-response';
	executionId: string;
	response: IExecuteResponsePromiseData;
};

/**
 * Store
 */

export type Store = Redis | Cluster;
