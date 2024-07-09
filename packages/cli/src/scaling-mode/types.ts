import type {
	ExecutionError,
	ExecutionStatus,
	IExecuteResponsePromiseData,
	IRun,
	WorkflowExecuteMode as WorkflowExecutionMode,
} from 'n8n-workflow';
import type Bull from 'bull';
import type PCancelable from 'p-cancelable';

export type Queue = Bull.Queue<JobData>;

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

export type JobProgressReport = WebhookResponseReport;

export type WebhookResponseReport = {
	kind: 'webhook-response';
	executionId: string;
	response: IExecuteResponsePromiseData;
};

export type RunningJobProps = {
	executionId: string;
	workflowId: string;
	workflowName: string;
	mode: WorkflowExecutionMode;
	startedAt: Date;
	retryOf: string;
	status: ExecutionStatus;
	run: PCancelable<IRun>;
};

export type RunningJobSummary = Omit<RunningJobProps, 'run'>;
