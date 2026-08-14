// ---------------------------------------------------------------------------
// Types for the workflow-build eval harness
// ---------------------------------------------------------------------------

import type { WorkflowJSON } from '@n8n/workflow-sdk';

/**
 * Evaluation feedback item. Compatible with LangSmith scoring.
 */
export interface Feedback {
	evaluator: string;
	metric: string;
	score: number;
	comment?: string;
	kind: 'score' | 'metric' | 'detail';
}

/**
 * A single workflow-build eval case.
 */
export interface WorkflowBuildEvalCase {
	/** Unique test case identifier */
	id: string;
	/** The prompt / task description sent to Instance AI */
	prompt: string;
	/** Model ID override for this test case. Overrides the runner config modelId. */
	modelId?: string;
	/** Per-test-case annotations forwarded to binary checks. */
	annotations?: Record<string, unknown>;
}

/**
 * Workflow produced by the orchestrator build path.
 */
export interface CapturedWorkflow {
	/** The WorkflowJSON the agent produced */
	json: WorkflowJSON;
	/** Whether the submit-workflow tool reported success */
	success: boolean;
	/** Errors reported by the submit-workflow tool */
	errors?: string[];
}

/**
 * Result of running a single workflow-build eval case.
 */
export interface WorkflowBuildEvalResult {
	/** The test case that was run */
	testCase: WorkflowBuildEvalCase;
	/** The agent's final text output */
	text: string;
	/** Workflows captured from submit-workflow tool calls */
	capturedWorkflows: CapturedWorkflow[];
	/** Evaluation feedback (binary checks on captured workflows, etc.) */
	feedback: Feedback[];
	/** Total duration in milliseconds */
	durationMs: number;
	/** Error message if the run failed */
	error?: string;
}

/**
 * Configuration for the workflow-build eval runner.
 */
export interface WorkflowBuildEvalConfig {
	/** Optional model override. When unset, the server resolves the model from its own settings. */
	modelId?: string;
	/** Timeout per test case in milliseconds. Defaults to 900_000. */
	timeoutMs?: number;
	/** Whether to print verbose output */
	verbose?: boolean;
}
