import type { ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';

export type RunningJobSummary = {
	executionId: string;
	workflowId: string;
	workflowName: string;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	retryOf?: string;
	status: ExecutionStatus;
};

export type WorkerStatus = {
	senderId: string;
	runningJobsSummary: RunningJobSummary[];
	freeMem: number;
	totalMem: number;
	uptime: number;
	loadAvg: number[];
	cpus: string;
	arch: string;
	platform: NodeJS.Platform;
	hostname: string;
	interfaces: Array<{
		family: 'IPv4' | 'IPv6';
		address: string;
		internal: boolean;
	}>;
	version: string;
};
