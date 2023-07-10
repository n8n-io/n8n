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
	changes?: object;
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
