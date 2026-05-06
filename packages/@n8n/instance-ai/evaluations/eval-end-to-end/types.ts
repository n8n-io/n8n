import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';

import type { WorkflowResponse } from '../clients/n8n-client';

export interface EvalEndToEndCase {
	slug: string;
	workflowPath: string;
	workflow: WorkflowResponse;
}

export interface EvalEndToEndFinding {
	severity: 'error' | 'warning';
	code: string;
	message: string;
}

export interface EvalEndToEndToolSelectionResult {
	evalsToolCalled: boolean;
	evalSetupAgentCalled: boolean;
	evalDataToolCalled: boolean;
	findings: EvalEndToEndFinding[];
}

export interface EvalEndToEndTopologyResult {
	evaluationTriggerFound: boolean;
	evaluationNodeFound: boolean;
	dataTableId?: string;
	dataTableRowCount: number;
	findings: EvalEndToEndFinding[];
}

export interface EvalEndToEndExecutionResult {
	attempted: boolean;
	success: boolean;
	executionId?: string;
	errors: string[];
	rawResult?: InstanceAiEvalExecutionResult;
}

export interface EvalEndToEndCaseResult {
	caseSlug: string;
	workflowId?: string;
	dataTableId?: string;
	toolSelection: EvalEndToEndToolSelectionResult;
	topology: EvalEndToEndTopologyResult;
	execution: EvalEndToEndExecutionResult;
	passed: boolean;
	error?: string;
}

export interface EvalEndToEndRunResult {
	passed: boolean;
	results: EvalEndToEndCaseResult[];
}
