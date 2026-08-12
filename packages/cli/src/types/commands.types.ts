import type { ExecutionStatus } from 'n8n-workflow';

export interface IResult {
	totalWorkflows: number;
	slackMessage: string;
	summary: {
		failedExecutions: number;
		successfulExecutions: number;
		warningExecutions: number;
		errors: IExecutionError[];
		warnings: IExecutionError[];
	};
	coveredNodes: {
		[nodeType: string]: number;
	};
	executions: IExecutionResult[];
}

export interface IExecutionResult {
	workflowId: string;
	workflowName: string;
	executionTime: number; // Given in seconds with decimals for milliseconds
	finished: boolean;
	executionStatus: ExecutionStatus | 'warning';
	error?: string;
	changes?: object;
	coveredNodes: {
		[nodeType: string]: number;
	};
}

interface IExecutionError {
	workflowId: string;
	error: string;
}

export interface IWorkflowExecutionProgress {
	workflowId: string;
	status: ExecutionStatus | 'warning';
}

export interface INodeSpecialCases {
	[nodeName: string]: INodeSpecialCase;
}

export interface INodeSpecialCase {
	ignoredProperties?: string[];
	capResults?: number;
	keepOnlyProperties?: string[];
}
