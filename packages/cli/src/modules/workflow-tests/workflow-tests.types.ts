import type { IDataObject, IPinData } from 'n8n-workflow';

/** One asserted node captured from the source execution, in execution order. */
export interface NodeExpectation {
	nodeName: string;
	executionIndex: number;
	/** main output branches -> items -> json only */
	outputs: Array<Array<{ json: IDataObject }>>;
}

export interface WorkflowTestCapture {
	triggerNodeName: string;
	fixtures: IPinData;
	expectations: NodeExpectation[];
}

export interface WorkflowTestNodeResult {
	nodeName: string;
	status: 'passed' | 'failed' | 'not-executed';
	/** Only set when status !== 'passed' — JSON-stringified (pretty, 2-space) for the diff viewer. */
	expected?: string;
	actual?: string;
}

export interface WorkflowTestRunResult {
	testId: string;
	testName: string;
	executionId: string | null;
	/** passed: all assertions match; failed: assertion mismatch; error: run itself errored */
	status: 'passed' | 'failed' | 'error';
	errorMessage?: string;
	firstFailedNode?: string;
	nodeResults: WorkflowTestNodeResult[];
	completedAt: string;
}

export interface WorkflowTestSummary {
	id: string;
	name: string;
	workflowId: string;
	sourceExecutionId: string;
	triggerNodeName: string;
	mockedNodeNames: string[];
	assertedNodeNames: string[];
	createdAt: string;
}
