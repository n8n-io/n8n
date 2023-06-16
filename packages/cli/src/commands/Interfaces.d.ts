interface IResult {
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

interface IExecutionResult {
	workflowId: string;
	workflowName: string;
	executionTime: number; // Given in seconds with decimals for milliseconds
	finished: boolean;
	executionStatus: ExecutionStatus;
	error?: string;
	changes?: string;
	coveredNodes: {
		[nodeType: string]: number;
	};
}

interface IExecutionError {
	workflowId: string;
	error: string;
}

interface IWorkflowExecutionProgress {
	workflowId: string;
	status: ExecutionStatus;
}

interface INodeSpecialCases {
	[nodeName: string]: INodeSpecialCase;
}

interface INodeSpecialCase {
	ignoredProperties?: string[];
	capResults?: number;
	keepOnlyProperties?: string[];
}

declare module 'json-diff' {
	interface IDiffOptions {
		keysOnly?: boolean;
	}
	export function diff(obj1: unknown, obj2: unknown, diffOptions: IDiffOptions): string;
}
