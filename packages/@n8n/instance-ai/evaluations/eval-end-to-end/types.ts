import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';

import type { WorkflowResponse } from '../clients/n8n-client';

/**
 * Per-case verification mode, derived from a workflow precheck before the
 * runner sends the chat message. Drives which assertions the runner applies.
 *
 * - `eligible`        — workflow has AI nodes and is structurally suitable; expect full chain
 *                       (`evals` → `eval-setup-with-agent` → `eval-data`) and successful execution.
 * - `already-configured` — workflow already contains an EvaluationTrigger or Evaluation node; the
 *                       agent must skip setup. The runner skips tool-chain assertions and only
 *                       verifies the existing eval workflow can execute.
 * - `structural-skip` — root agent reads JSON directly from upstream nodes
 *                       (`rootAgentReadsOtherNode`); eval setup is structurally infeasible. The
 *                       agent is expected to skip, no execution attempt is made, and the case
 *                       passes if the agent did not silently fabricate eval nodes.
 * - `no-ai-nodes`     — workflow has no langchain/AI nodes at all; eval setup is not applicable.
 *                       Same verification semantics as `structural-skip`: agent must not add eval
 *                       nodes, no execution.
 */
export type EvalEndToEndMode =
	| 'eligible'
	| 'already-configured'
	| 'structural-skip'
	| 'no-ai-nodes';

export interface EvalEndToEndCase {
	slug: string;
	workflowPath: string;
	workflow: WorkflowResponse;
	mode: EvalEndToEndMode;
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
	mode: EvalEndToEndMode;
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
