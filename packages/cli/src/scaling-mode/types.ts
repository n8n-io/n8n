import type { Redis, Cluster } from 'ioredis';
import type { ExecutionError, IExecuteResponsePromiseData } from 'n8n-workflow';
import type {
	Job as BullJob,
	Queue as BullQueue,
	JobState as BullJobState,
	JobsOptions as BullJobOptions,
	QueueOptions as BullQueueOptions,
	WorkerOptions as BullWorkerOptions,
	Worker as BullWorker,
	Processor as BullProcessorFn,
} from 'bullmq';

/**
 * Queue
 */

export type Queue = BullQueue<JobData, JobResult, JobName>;

/**
 * Worker
 */

export type Worker = BullWorker<JobData, JobResult, JobName>;

export type WorkerProcessorFn = BullProcessorFn<JobData, JobResult, JobName>;

export type WorkerOptions = BullWorkerOptions;

/**
 * Job
 */

export type Job = BullJob<JobData, JobResult, JobName> & { id: string };

export type JobData = {
	executionId: string;
	loadStaticData: boolean;
};

export type JobResult = {
	success: boolean;
	error?: ExecutionError;
};

export type JobName = 'job';

export type JobState = BullJobState;

export type JobOptions = BullJobOptions;

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

export type StoreOptions = BullQueueOptions;
