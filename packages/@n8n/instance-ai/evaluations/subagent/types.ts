// ---------------------------------------------------------------------------
// Types for the isolated sub-agent evaluation harness
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
 * Describes the prompt and configuration for an isolated sub-agent run.
 */
export interface SubAgentTestCase {
	/** Unique test case identifier */
	id: string;
	/** The prompt / task description sent to the sub-agent */
	prompt: string;
	/** Sub-agent type. Determines system prompt and default tools. Defaults to 'builder'. */
	subagent?: string;
	/** Optional system prompt override. Defaults to the sub-agent type's built-in prompt. */
	systemPrompt?: string;
	/** Tool names to give the sub-agent. Defaults to the sub-agent type's default set if omitted. */
	tools?: string[];
	/** Model ID override for this test case. Overrides the runner config modelId. */
	modelId?: string;
	/** Max agent steps before timeout. Defaults to 40 (see `SubAgentEvalService.DEFAULT_MAX_STEPS`). */
	maxSteps?: number;
	/**
	 * Per-test-case annotations forwarded to binary checks.
	 * Use `code_necessary: true` to suppress `no_unnecessary_code_nodes` on
	 * prompts where a Code node is a legitimate answer.
	 */
	annotations?: Record<string, unknown>;
}

/**
 * Workflow captured from a stubbed workflowService.createFromWorkflowJSON call.
 */
export interface CapturedWorkflow {
	/** The WorkflowJSON the agent produced (parsed from TypeScript SDK code) */
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
	/** Max agent steps. Overridden by test case if set. Defaults to 40 (see `SubAgentEvalService.DEFAULT_MAX_STEPS`). */
	maxSteps?: number;
	/** Whether to print verbose output */
	verbose?: boolean;
}
