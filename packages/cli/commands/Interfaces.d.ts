interface IResult {
	totalWorkflows: number;
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
	workflowId: string | number;
	workflowName: string;
	executionTime: number; // Given in seconds with decimals for milisseconds
	finished: boolean;
	executionStatus: ExecutionStatus;
	error?: string;
	changes?: string;
	coveredNodes: {
		[nodeType: string]: number;
	};
}

interface IExecutionError {
	workflowId: string | number;
	error: string;
}

interface IWorkflowExecutionProgress {
	workflowId: string | number;
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

type ExecutionStatus = 'success' | 'error' | 'warning' | 'running';

declare module 'json-diff' {
	interface IDiffOptions {
		keysOnly?: boolean;
	}
	export function diff(obj1: unknown, obj2: unknown, diffOptions: IDiffOptions): string;
}
