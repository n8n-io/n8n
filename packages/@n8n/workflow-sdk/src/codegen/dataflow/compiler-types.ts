import type {
	ExpectationMismatch,
	Expectations,
	NockRequestRecord,
	NodeOutputMap,
} from './expectation-matcher';

export interface SubWorkflowExecutionEntry {
	name: string;
	executedNodes: string[];
	nodeOutputs: NodeOutputMap;
}

export interface NockTraceEntry {
	interceptors: string[];
	consumed: string[];
	pending: string[];
	requests: NockRequestRecord[];
}

export interface PinDataEntry {
	nodeName: string;
	data: unknown[];
}

export interface CompilerTestEntry {
	title: string;
	dirName: string;
	skip?: string;
	templateId?: string;
	inputCode: string;
	parsedJson?: string;
	reGeneratedCode?: string;
	roundTripStatus: 'pass' | 'error' | 'skip';
	roundTripError?: string;
	codeMatch?: boolean;
	nodeCount?: number;
	connectionCount?: number;
	validationErrors?: string[];

	// Execution fields (populated from execution-data.json)
	executionStatus?: 'pass' | 'error' | 'skip';
	executionError?: string;
	executedNodes?: string[];
	nodeOutputs?: NodeOutputMap;
	subWorkflows?: SubWorkflowExecutionEntry[];
	nockTrace?: NockTraceEntry;
	expectationMismatches?: ExpectationMismatch[];
	expectations?: Expectations;
	pinData?: PinDataEntry[];
}
