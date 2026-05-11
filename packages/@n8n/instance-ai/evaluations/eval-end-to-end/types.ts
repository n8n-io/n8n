import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';

import type { WorkflowResponse } from '../clients/n8n-client';

/**
 * Per-case verification mode, derived from a workflow precheck before the
 * runner sends the chat message. Drives which assertions the runner applies.
 *
 * - `eligible`        — workflow has AI nodes; expect the full chain
 *                       (`evals(propose)` populates a DataTable inline, then
 *                       `eval-setup-with-agent` wires the topology) and a
 *                       successful eval execution.
 * - `already-configured` — workflow already contains an EvaluationTrigger or Evaluation node; the
 *                       agent must skip setup. The runner skips tool-chain assertions and only
 *                       verifies the existing eval workflow can execute.
 * - `no-ai-nodes`     — workflow has no langchain/AI nodes at all; eval setup is not applicable.
 *                       Agent must not add eval nodes, no execution.
 */
export type EvalEndToEndMode = 'eligible' | 'already-configured' | 'no-ai-nodes';

/**
 * Optional sidecar declared in a fixture JSON. When present, the runner
 * provisions a fresh DataTable in the test project, seeds it with `rows`,
 * and rewrites every `dataTableId` reference inside `evaluationTrigger` /
 * `evaluation` nodes to point at the new id before importing the workflow.
 *
 * This lets `already-configured` fixtures stay self-contained without
 * depending on a DataTable that happened to exist when the fixture was
 * captured.
 */
export interface EvalDataTableSpec {
	name: string;
	columns: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' }>;
	rows: Array<Record<string, unknown>>;
}

export interface EvalEndToEndCase {
	slug: string;
	workflowPath: string;
	workflow: WorkflowResponse;
	mode: EvalEndToEndMode;
	evalDataTable?: EvalDataTableSpec;
}

export interface EvalEndToEndFinding {
	severity: 'error' | 'warning';
	code: string;
	message: string;
}

export interface EvalEndToEndToolSelectionResult {
	evalsToolCalled: boolean;
	/**
	 * Distinct `evals` actions observed across the run, e.g.
	 * `['offer', 'select-metrics', 'propose', 'offer-data-population']`.
	 * Used to verify orchestration depth, not just that the tool ran.
	 */
	evalsActionsCalled: string[];
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
