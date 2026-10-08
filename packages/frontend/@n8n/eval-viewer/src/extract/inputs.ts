/**
 * Schemas of the eval harness files the extractor reads. Only the fields the viewer
 * uses are listed; zod drops the rest (for example the large `evalResult` blobs).
 */
import { z } from 'zod';

const toolCallStepSchema = z.object({
	kind: z.literal('tool-call'),
	toolName: z.string(),
	toolCallId: z.string().nullish(),
	args: z.unknown(),
	result: z.unknown(),
});
const textStepSchema = z.object({ kind: z.literal('agent-text'), text: z.string() });
const otherStepSchema = z.object({ kind: z.string() }).passthrough();
export const transcriptStepSchema = z.union([toolCallStepSchema, textStepSchema, otherStepSchema]);
export type TranscriptStep = z.infer<typeof transcriptStepSchema>;
export type ToolCallStep = z.infer<typeof toolCallStepSchema>;

export const isToolCallStep = (step: TranscriptStep): step is ToolCallStep =>
	step.kind === 'tool-call' && 'toolName' in step && typeof step.toolName === 'string';

export const transcriptTurnSchema = z.object({
	userMessage: z.string().nullish(),
	steps: z.array(transcriptStepSchema),
	runIds: z.array(z.string()).nullish(),
});
export type TranscriptTurn = z.infer<typeof transcriptTurnSchema>;

export const resultScenarioRunSchema = z.object({
	workflowId: z.string().nullish(),
	passed: z.boolean().nullish(),
	failureCategory: z.string().nullish(),
});

export const testCaseSchema = z.object({
	name: z.string(),
	testCaseFile: z.string().nullish(),
	title: z.string().nullish(),
	tags: z.array(z.string()).nullish(),
	threadIds: z.array(z.string().nullable()).nullish(),
	transcriptPerRun: z.array(z.array(transcriptTurnSchema).nullable()).nullish(),
	buildErrorPerRun: z.array(z.string().nullable()).nullish(),
	scenarios: z
		.array(z.object({ name: z.string(), runs: z.array(resultScenarioRunSchema) }))
		.nullish(),
});
export type TestCase = z.infer<typeof testCaseSchema>;

export const evalResultsSchema = z.object({ testCases: z.array(testCaseSchema) });

const rowExpectationSchema = z.object({
	expectation: z.string().nullish(),
	pass: z.boolean().nullish(),
	reason: z.string().nullish(),
});

/** One line of eval-rows.jsonl: one scenario run (or a `__build_only__` row) of one build. */
export const evalRowSchema = z.object({
	run: z.object({
		inputs: z.object({
			testCaseFile: z.string(),
			scenarioName: z.string(),
			scenarioDescription: z.string().nullish(),
			dataSetup: z.string().nullish(),
			successCriteria: z.string().nullish(),
			_iteration: z.number().nullish(),
		}),
		outputs: z.object({
			threadId: z.string().nullish(),
			workflowId: z.string().nullish(),
			buildSuccess: z.boolean().nullish(),
			passed: z.boolean().nullish(),
			score: z.number().nullish(),
			reasoning: z.string().nullish(),
			failureCategory: z.string().nullish(),
			attribution: z.string().nullish(),
			rootCause: z.string().nullish(),
			execErrors: z.array(z.unknown()).nullish(),
			expectationResults: z.array(rowExpectationSchema).nullish(),
			workflowJson: z.unknown(),
		}),
	}),
});
export type EvalRow = z.infer<typeof evalRowSchema>['run'];

export const BUILD_ONLY_SCENARIO = '__build_only__';

const metricSchema = z.number().nullish();
/** Metric fields of summary.json, keyed as summarize.py writes them. */
export const summaryMetricsSchema = z.object({
	wall_s: metricSchema,
	harness_build_s: metricSchema,
	turns: metricSchema,
	tool_calls: metricSchema,
	tool_failed: metricSchema,
	build_calls: metricSchema,
	build_failed: metricSchema,
	tsc_errors: metricSchema,
	input: metricSchema,
	no_cache: metricSchema,
	cache_read: metricSchema,
	cache_write: metricSchema,
	output: metricSchema,
	cost: metricSchema,
});
export type SummaryMetrics = z.infer<typeof summaryMetricsSchema>;

export const summaryTrialSchema = summaryMetricsSchema.extend({
	thread: z.string().nullish(),
	built: z.boolean().nullish(),
});
export type SummaryTrial = z.infer<typeof summaryTrialSchema>;

const countsSchema = z.object({
	builds: z.number(),
	built: z.number(),
	scen_pass: z.number(),
	scen_n: z.number(),
	scen_excluded: z.number(),
	scen_mock: z.number(),
	exp_pass: z.number(),
	exp_n: z.number(),
	exp_excluded: z.number(),
	median: summaryMetricsSchema,
	sum: summaryMetricsSchema,
});
export type SummaryCounts = z.infer<typeof countsSchema>;

export const runSummarySchema = z.object({
	cases: z.record(countsSchema.extend({ trials: z.array(summaryTrialSchema) })),
	totals: countsSchema,
});
export type RunSummary = z.infer<typeof runSummarySchema>;
