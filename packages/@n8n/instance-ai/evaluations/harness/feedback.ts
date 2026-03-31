// ---------------------------------------------------------------------------
// Feedback builder: maps InstanceAiResult to Feedback[] for LangSmith / reporting
// ---------------------------------------------------------------------------

import type { Feedback, InstanceAiResult } from '../types';

const EVALUATOR = 'instance-ai';

/**
 * Build an array of Feedback items from a single evaluation result.
 *
 * Feedback items are designed to be uploaded to LangSmith or aggregated into
 * local reports. Each carries a `kind` to distinguish scores (pass/fail or
 * 0-1 continuous) from raw metrics and detail strings.
 */
export function buildFeedback(result: InstanceAiResult): Feedback[] {
	const feedback: Feedback[] = [];

	// -- Build checklist scores -----------------------------------------------

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'checklist_pass_rate',
		score: result.checklistScore,
		kind: 'score',
		comment: buildChecklistComment(result.checklistResults.length, result.checklistScore),
	});

	const { programmaticRate, llmRate } = splitChecklistRates(result);

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'checklist_programmatic_rate',
		score: programmaticRate,
		kind: 'metric',
	});

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'checklist_llm_rate',
		score: llmRate,
		kind: 'metric',
	});

	// -- Execution checklist scores -------------------------------------------

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'execution_checklist_rate',
		score: result.executionChecklistScore,
		kind: 'score',
	});

	const hasSuccessfulExecution = result.outcome.executionsRun.some(
		(exec) => exec.status === 'success',
	);
	feedback.push({
		evaluator: EVALUATOR,
		metric: 'execution_success',
		score: hasSuccessfulExecution ? 1 : 0,
		kind: 'score',
	});

	// -- Timing metrics -------------------------------------------------------

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'duration_seconds',
		score: result.metrics.totalTimeMs / 1000,
		kind: 'metric',
	});

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'agent_duration_seconds',
		score: result.metrics.timeToRunFinishMs / 1000,
		kind: 'metric',
	});

	// -- Activity metrics -----------------------------------------------------

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'tool_call_count',
		score: result.metrics.totalToolCalls,
		kind: 'metric',
	});

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'sub_agents_spawned',
		score: result.metrics.subAgentsSpawned,
		kind: 'metric',
	});

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'confirmation_count',
		score: result.metrics.confirmationRequests,
		kind: 'metric',
	});

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'workflows_created',
		score: result.outcome.workflowsCreated.length,
		kind: 'metric',
	});

	// -- Overall success ------------------------------------------------------

	feedback.push({
		evaluator: EVALUATOR,
		metric: 'success',
		score: result.success ? 1 : 0,
		kind: 'score',
		comment: result.error,
	});

	return feedback;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function splitChecklistRates(result: InstanceAiResult): {
	programmaticRate: number;
	llmRate: number;
} {
	const programmatic = result.checklistResults.filter((r) => r.strategy === 'programmatic');
	const llm = result.checklistResults.filter((r) => r.strategy === 'llm');

	const programmaticRate =
		programmatic.length > 0 ? programmatic.filter((r) => r.pass).length / programmatic.length : 0;

	const llmRate = llm.length > 0 ? llm.filter((r) => r.pass).length / llm.length : 0;

	return { programmaticRate, llmRate };
}

function buildChecklistComment(itemCount: number, score: number): string {
	const passCount = Math.round(score * itemCount);
	return `${String(passCount)}/${String(itemCount)} items passed (${formatPercent(score)})`;
}

function formatPercent(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}
