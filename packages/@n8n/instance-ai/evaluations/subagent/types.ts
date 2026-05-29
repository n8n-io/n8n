// ---------------------------------------------------------------------------
// Types for the eval:subagent compatibility harness
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
 * A single sub-agent test case.
 * Describes a legacy subagent fixture now run through the orchestrator.
 */
export interface SubAgentTestCase {
	/** Unique test case identifier */
	id: string;
	/** The prompt / task description sent to Instance AI */
	prompt: string;
	/** Legacy selector retained for fixture and LangSmith compatibility. */
	subagent?: string;
	/** Legacy sub-agent override retained for dataset compatibility. */
	systemPrompt?: string;
	/** Legacy sub-agent tool list retained for dataset compatibility. */
	tools?: string[];
	/** Model ID override for this test case. Overrides the runner config modelId. */
	modelId?: string;
	/** Legacy step budget retained for dataset compatibility. */
	maxSteps?: number;
	/** Per-test-case annotations forwarded to binary checks. */
	annotations?: Record<string, unknown>;
}

/**
 * Workflow produced by the orchestrator build path.
 */
export interface CapturedWorkflow {
	/** The WorkflowJSON the agent produced */
	json: WorkflowJSON;
	/** Whether the build-workflow tool reported success */
	success: boolean;
	/** Errors reported by the build-workflow tool */
	errors?: string[];
}

/**
 * Result of running a single sub-agent test case.
 */
export interface SubAgentResult {
	/** The test case that was run */
	testCase: SubAgentTestCase;
	/** The agent's final text output */
	text: string;
	/** Workflows captured from build-workflow tool calls */
	capturedWorkflows: CapturedWorkflow[];
	/** Evaluation feedback (binary checks on captured workflows, etc.) */
	feedback: Feedback[];
	/** Total duration in milliseconds */
	durationMs: number;
	/** Error message if the run failed */
	error?: string;
}

/**
 * Configuration for the sub-agent runner.
 */
export interface SubAgentRunnerConfig {
	/** Optional model override. When unset, the server resolves the model from its own settings. */
	modelId?: string;
	/** Timeout per test case in milliseconds. Defaults to 120_000. */
	timeoutMs?: number;
	/** Legacy step budget retained for CLI compatibility. */
	maxSteps?: number;
	/** Whether to print verbose output */
	verbose?: boolean;
}
