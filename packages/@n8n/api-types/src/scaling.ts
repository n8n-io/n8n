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
	isInContainer: boolean;
	process: {
		memory: {
			available: number;
			constraint: number;
			rss: number;
			heapTotal: number;
			heapUsed: number;
		};
		uptime: number;
	};
	host: {
		memory: {
			total: number;
			free: number;
		};
	};
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
