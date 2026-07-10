// ---------------------------------------------------------------------------
// LangSmith run reshaping
//
// Pure transform from LangSmith's flat `Run[]` into the
// `WorkflowTestCaseResult[][]` shape the aggregator + HTML report expect.
// Extracted from cli/index.ts so the verdict-reattachment logic is
// unit-testable on its own (index.ts runs main() at import time).
// ---------------------------------------------------------------------------

import type { InstanceAiEvalExecutionResult, InstanceAiRunDebugResponse } from '@n8n/api-types';
import type { Run } from 'langsmith/schemas';
import { z } from 'zod';

import { CHECK_DIMENSIONS, type CheckOutcome } from '../binaryChecks/types';
import type { WorkflowResponse } from '../clients/n8n-client';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { BUILD_ONLY_SCENARIO_NAME } from '../langsmith/dataset-sync';
import type {
	BuildTrace,
	BuildExpectationResult,
	ExecutionScenarioResult,
	TranscriptTurn,
	WorkflowTestCaseResult,
} from '../types';

const checkOutcomeSchema = z.object({
	name: z.string(),
	description: z.string(),
	kind: z.enum(['deterministic', 'llm']),
	dimension: z.enum(CHECK_DIMENSIONS),
	status: z.enum(['pass', 'fail', 'n_a', 'error']),
	comment: z.string().optional(),
});

/** Per-expectation verdicts embedded in run outputs — mirrors `BuildExpectationResult`
 *  so baseline fetches can score expectations alongside scenarios. */
export const expectationResultsSchema = z.array(
	z.object({
		expectation: z.string(),
		pass: z.boolean(),
		reason: z.string().default(''),
		incomplete: z.boolean().optional(),
	}),
);

const targetOutputSchema = z.object({
	buildSuccess: z.boolean().default(false),
	passed: z.boolean().default(false),
	score: z.number().default(0),
	reasoning: z.string().default(''),
	workflowId: z.string().optional(),
	scenarioWorkflowId: z.string().optional(),
	failureCategory: z.string().optional(),
	rootCause: z.string().optional(),
	/** Verifier returned no verdict — run is excluded from scoring but stays visible. */
	incomplete: z.boolean().optional(),
	// `.catch` so one malformed field can't void the whole row in `safeParse`.
	expectationResults: expectationResultsSchema.optional().catch(undefined),
	execErrors: z.array(z.string()).default([]),
	evalResult: z.unknown().optional(),
	/** Only set on the scenario that initiated the build. */
	buildDurationMs: z.number().optional(),
	execDurationMs: z.number().default(0),
	nodeCount: z.number().default(0),
	/** The thread id used during the build — keys the LangSmith trace lookup. */
	threadId: z.string().optional(),
	workflowChecks: z.array(checkOutcomeSchema).optional(),
	workflowJson: z.unknown().optional(),
	buildTrace: z.unknown().optional(),
	/** Plan rejections the proxy issued — deterministic conversation counter. Multi-turn only. */
	planRejections: z.number().optional(),
});

export type TargetOutput = Omit<
	z.infer<typeof targetOutputSchema>,
	'evalResult' | 'workflowJson' | 'buildTrace'
> & {
	evalResult?: InstanceAiEvalExecutionResult;
	workflowJson?: WorkflowResponse;
	buildTrace?: BuildTrace;
};

export function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isEvalResult(v: unknown): v is InstanceAiEvalExecutionResult {
	if (!isPlainObject(v)) return false;
	return (
		typeof v.nodeResults === 'object' &&
		v.nodeResults !== null &&
		Array.isArray(v.errors) &&
		typeof v.hints === 'object' &&
		v.hints !== null
	);
}

function isWorkflowResponse(v: unknown): v is WorkflowResponse {
	if (!isPlainObject(v)) return false;
	return (
		typeof v.id === 'string' &&
		typeof v.name === 'string' &&
		typeof v.active === 'boolean' &&
		typeof v.versionId === 'string' &&
		Array.isArray(v.nodes) &&
		isPlainObject(v.connections)
	);
}

function isBuildTrace(v: unknown): v is BuildTrace {
	if (!isPlainObject(v)) return false;
	return (
		typeof v.finalText === 'string' &&
		Array.isArray(v.toolCalls) &&
		Array.isArray(v.agentActivities)
	);
}

/** Safe-parse a run's outputs. Returns `undefined` if the row is malformed
 *  or missing, so callers can skip it instead of treating it as a genuine
 *  failed evaluation. Every field in the schema has a default, so an empty
 *  or nullish raw value would otherwise parse successfully into a "failed"
 *  shape (passed:false, score:0) — masking infra errors as builder regressions.
 */
export function parseTargetOutput(raw: unknown): TargetOutput | undefined {
	if (!isPlainObject(raw) || Object.keys(raw).length === 0) return undefined;
	const parsed = targetOutputSchema.safeParse(raw);
	if (!parsed.success) return undefined;
	return {
		...parsed.data,
		evalResult: isEvalResult(parsed.data.evalResult) ? parsed.data.evalResult : undefined,
		workflowJson: isWorkflowResponse(parsed.data.workflowJson)
			? parsed.data.workflowJson
			: undefined,
		buildTrace: isBuildTrace(parsed.data.buildTrace) ? parsed.data.buildTrace : undefined,
	};
}

/**
 * Derive the `__build_only__` sentinel row's outcome from the case's expectation
 * verdicts — the judge IS the whole test for a scenario-less case. All evaluated
 * expectations passing ⇒ passed; no evaluated verdicts (judge dead) ⇒ `incomplete`
 * so the row stays out of scoring instead of reading as a permanent failure.
 */
export function sentinelOutcomeFromVerdicts(verdicts: BuildExpectationResult[] | undefined): {
	passed: boolean;
	score: number;
	reasoning: string;
	incomplete?: boolean;
	/** Only on non-passing outcomes — without a category the feedback extractor
	 *  files the row under 'unknown' in the LangSmith failure_category column. */
	failureCategory?: 'expectations_failed' | 'verification_failure';
} {
	const evaluated = (verdicts ?? []).filter((v) => !v.incomplete);
	if (evaluated.length === 0) {
		return {
			passed: false,
			score: 0,
			reasoning: 'Build-only case — no expectation verdicts (judge incomplete)',
			incomplete: true,
			failureCategory: 'verification_failure',
		};
	}
	const failed = evaluated.filter((v) => !v.pass);
	const passed = failed.length === 0;
	return {
		passed,
		score: (evaluated.length - failed.length) / evaluated.length,
		reasoning: passed
			? `Build-only case — all ${String(evaluated.length)} expectations passed`
			: `Build-only case — failed expectations: ${failed.map((v) => v.expectation).join('; ')}`,
		...(passed ? {} : { failureCategory: 'expectations_failed' as const }),
	};
}

const runInputsSchema = z
	.object({
		testCaseFile: z.string().default(''),
		scenarioName: z.string().default(''),
		/** 0-based iteration index; injected during multi-run expansion. */
		_iteration: z.number().int().nonnegative().default(0),
	})
	.passthrough();

/**
 * Convert LangSmith's flat `Run[]` into the `WorkflowTestCaseResult[][]` shape
 * the aggregator expects (outer: runs, inner: test cases). Groups by
 * (testCaseFile, scenarioName), then reconstructs per-iteration test case
 * results. Scenarios with no matching run get a build_failure stub.
 */
export function reshapeLangSmithRuns(
	rows: Array<{ run: Run }>,
	testCasesWithFiles: WorkflowTestCaseWithFile[],
	numIterations: number,
	transcriptByThreadId: Map<string, TranscriptTurn[]>,
	/** Keyed by the build-cache key (`iteration:fileSlug`), not threadId, so prebuilt
	 *  builds (no threadId) still attach their outcome-expectation verdicts. */
	buildExpectationsByKey: Map<string, BuildExpectationResult[]>,
	n8nBaseUrl: string | undefined,
	runDebugByThreadId: Map<string, InstanceAiRunDebugResponse[]> = new Map(),
): WorkflowTestCaseResult[][] {
	// Index runs by (iteration, testCaseFile, scenarioName) using the `_iteration`
	// we injected in expandExamplesForIterations. Falls back to 0 for single-run.
	const byKey = new Map<string, Run>();
	for (const { run } of rows) {
		const inputs = runInputsSchema.safeParse(run.inputs ?? {});
		if (!inputs.success) continue;
		const key = `${String(inputs.data._iteration)}/${inputs.data.testCaseFile}/${inputs.data.scenarioName}`;
		byKey.set(key, run);
	}

	const allRunResults: WorkflowTestCaseResult[][] = [];
	for (let iter = 0; iter < numIterations; iter++) {
		const runResults: WorkflowTestCaseResult[] = [];
		for (const { testCase, fileSlug } of testCasesWithFiles) {
			const executionScenarioResults: ExecutionScenarioResult[] = [];
			let workflowBuildSuccess = false;
			let workflowId: string | undefined;
			let buildError: string | undefined;
			let threadId: string | undefined;
			let workflowChecks: CheckOutcome[] | undefined;
			let workflowJson: WorkflowResponse | undefined;
			let buildTrace: BuildTrace | undefined;

			for (const scenario of testCase.executionScenarios ?? []) {
				const run = byKey.get(`${String(iter)}/${fileSlug}/${scenario.name}`);
				const output = run ? parseTargetOutput(run.outputs) : undefined;
				if (!run || !output) {
					executionScenarioResults.push({
						scenario,
						success: false,
						score: 0,
						reasoning: run ? 'Malformed run output — skipped' : 'No run result for this scenario',
					});
					continue;
				}
				if (output.buildSuccess) workflowBuildSuccess = true;
				if (output.workflowId) workflowId = output.workflowId;
				if (output.threadId) threadId = output.threadId;
				if (!output.buildSuccess && output.reasoning) buildError = output.reasoning;
				if (output.workflowChecks && !workflowChecks) workflowChecks = output.workflowChecks;
				if (output.workflowJson && !workflowJson) workflowJson = output.workflowJson;
				if (output.buildTrace && !buildTrace) buildTrace = output.buildTrace;
				executionScenarioResults.push({
					scenario,
					success: output.passed,
					evalResult: output.evalResult,
					workflowId: output.scenarioWorkflowId ?? output.workflowId,
					score: output.score,
					reasoning: output.reasoning,
					failureCategory: output.failureCategory,
					rootCause: output.rootCause,
					...(output.incomplete ? { incomplete: true } : {}),
				});
			}

			// Build-only case (0 scenarios): pull build fields from the sentinel row; no scenario unit is recorded.
			if ((testCase.executionScenarios?.length ?? 0) === 0) {
				const run = byKey.get(`${String(iter)}/${fileSlug}/${BUILD_ONLY_SCENARIO_NAME}`);
				const output = run ? parseTargetOutput(run.outputs) : undefined;
				if (output) {
					workflowBuildSuccess = output.buildSuccess;
					workflowId = output.workflowId;
					threadId = output.threadId;
					if (!output.buildSuccess && output.reasoning) buildError = output.reasoning;
					workflowChecks = output.workflowChecks;
					workflowJson = output.workflowJson;
					buildTrace = output.buildTrace;
				}
			}

			const transcript = threadId ? transcriptByThreadId.get(threadId) : undefined;
			const buildExpectationResults = buildExpectationsByKey.get(`${String(iter)}:${fileSlug}`);
			runResults.push({
				testCase,
				fileSlug,
				workflowBuildSuccess,
				workflowId,
				executionScenarioResults,
				buildError,
				threadId,
				transcript,
				buildExpectationResults,
				workflowChecks,
				workflowJson,
				buildTrace,
				n8nBaseUrl,
				runDebug: threadId ? runDebugByThreadId.get(threadId) : undefined,
			});
		}
		allRunResults.push(runResults);
	}
	return allRunResults;
}
