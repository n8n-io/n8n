// ---------------------------------------------------------------------------
// LangSmith run reshaping
//
// Pure transform from LangSmith's flat `Run[]` into the
// `WorkflowTestCaseResult[][]` shape the aggregator + HTML report expect.
// Extracted from cli/index.ts so the verdict-reattachment logic is
// unit-testable on its own (index.ts runs main() at import time).
// ---------------------------------------------------------------------------

import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import type { Run } from 'langsmith/schemas';
import { z } from 'zod';

import { CHECK_DIMENSIONS, type CheckOutcome } from '../binaryChecks/types';
import type { WorkflowResponse } from '../clients/n8n-client';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
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
	status: z.enum(['pass', 'fail', 'n_a']),
	comment: z.string().optional(),
});

const targetOutputSchema = z.object({
	buildSuccess: z.boolean().default(false),
	passed: z.boolean().default(false),
	score: z.number().default(0),
	reasoning: z.string().default(''),
	workflowId: z.string().optional(),
	failureCategory: z.string().optional(),
	rootCause: z.string().optional(),
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
	buildExpectationsByThreadId: Map<string, BuildExpectationResult[]>,
	n8nBaseUrl: string | undefined,
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

			for (const scenario of testCase.executionScenarios) {
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
					score: output.score,
					reasoning: output.reasoning,
					failureCategory: output.failureCategory,
					rootCause: output.rootCause,
				});
			}

			const transcript = threadId ? transcriptByThreadId.get(threadId) : undefined;
			const buildExpectationResults = threadId
				? buildExpectationsByThreadId.get(threadId)
				: undefined;
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
			});
		}
		allRunResults.push(runResults);
	}
	return allRunResults;
}
