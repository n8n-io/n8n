import type {
	ExecutionError,
	ExecutionStatus,
	IExecuteResponsePromiseData,
	IRun,
	WorkflowExecuteMode as WorkflowExecutionMode,
} from 'n8n-workflow';
import type Bull from 'bull';
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

export type PubSubMessage = MessageToMain | MessageToWorker;

type MessageToMain = RepondToWebhookMessage;

type MessageToWorker = AbortJobMessage;

type RepondToWebhookMessage = {
	kind: 'respond-to-webhook';
	executionId: string;
	response: IExecuteResponsePromiseData;
};

type AbortJobMessage = {
	kind: 'abort-job';
};

export type RunningJob = {
	executionId: string;
	workflowId: string;
	workflowName: string;
	mode: WorkflowExecutionMode;
	startedAt: Date;
	retryOf: string;
	status: ExecutionStatus;
	run: PCancelable<IRun>;
};

export type RunningJobSummary = Omit<RunningJob, 'run'>;

export type QueueRecoveryContext = {
	/** ID of timeout for next scheduled recovery cycle. */
	timeout?: NodeJS.Timeout;

	/** Number of in-progress executions to check per cycle. */
	batchSize: number;

	/** Time (in milliseconds) to wait until the next cycle. */
	waitMs: number;
};
