import type { RunningJobSummary } from '@n8n/api-types';
import type Bull from 'bull';
import type {
	ExecutionError,
	ExecutionStatus,
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
	restartExecutionId?: string;

	// MCP-specific fields for queue mode support
	/** Whether this execution was triggered by an MCP tool call. */
	isMcpExecution?: boolean;
	/** Type of MCP execution: 'service' for MCP Service, 'trigger' for MCP Trigger Node. */
	mcpType?: 'service' | 'trigger';
	/** MCP session ID for routing responses back to the correct client. */
	mcpSessionId?: string;
	/** MCP message ID for correlating responses with requests. */
	mcpMessageId?: string;
	/** Tool call info for MCP Trigger executions (tool name, args, source node). */
	mcpToolCall?: {
		toolName: string;
		arguments: Record<string, unknown>;
		/** The n8n node name that provides this tool. */
		sourceNodeName?: string;
	};
};

export type JobResult = {
	success: boolean;
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
	| SendChunkMessage
	| McpResponseMessage;

/** Message sent by worker to main to respond to a webhook. */
export type RespondToWebhookMessage = {
	kind: 'respond-to-webhook';
	executionId: string;
	response: IExecuteResponsePromiseData;
	workerId: string;
};

export type JobFinishedProps = {
	success: boolean;
	error?: ExecutionError;
	status: ExecutionStatus;
	lastNodeExecuted?: string;
	usedDynamicCredentials?: boolean;
	metadata?: Record<string, string>;
	startedAt: Date;
	stoppedAt: Date;
};

/** Message sent by worker to main to report a job has finished. */
export type JobFinishedMessage = JobFinishedMessageV1 | JobFinishedMessageV2;

/** @deprecated Old format without execution result details. */
type JobFinishedMessageV1 = {
	kind: 'job-finished';
	version?: undefined;
	executionId: string;
	workerId: string;
	success: boolean;
};

type JobFinishedMessageV2 = {
	kind: 'job-finished';
	version: 2;
	executionId: string;
	workerId: string;
} & JobFinishedProps;

export type SendChunkMessage = {
	kind: 'send-chunk';
	executionId: string;
	chunkText: StructuredChunk;
	workerId: string;
};

/** Message sent by worker to main to respond to an MCP tool call. */
export type McpResponseMessage = {
	kind: 'mcp-response';
	executionId: string;
	/** Type of MCP execution: 'service' for MCP Service, 'trigger' for MCP Trigger Node. */
	mcpType: 'service' | 'trigger';
	sessionId: string;
	messageId: string;
	response: unknown;
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
