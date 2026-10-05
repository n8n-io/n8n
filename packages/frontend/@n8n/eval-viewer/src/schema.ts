/**
 * The viewer data schema. The extractor writes `index.json` (everything the tree,
 * summary, case and scenario views need) and one `iterations/<id>.json` per
 * iteration (transcript, model steps, final workflow). The app parses both with
 * these schemas.
 */
import { z } from 'zod';

/** Per-build metrics, copied from a `summary.json` trial (see summarize.py). */
export const trialMetricsSchema = z.object({
	wallSeconds: z.number().nullable(),
	harnessBuildSeconds: z.number().nullable(),
	turns: z.number().nullable(),
	toolCalls: z.number().nullable(),
	toolFailed: z.number().nullable(),
	buildCalls: z.number().nullable(),
	buildFailed: z.number().nullable(),
	tscErrors: z.number().nullable(),
	inputTokens: z.number().nullable(),
	noCacheTokens: z.number().nullable(),
	cacheReadTokens: z.number().nullable(),
	cacheWriteTokens: z.number().nullable(),
	outputTokens: z.number().nullable(),
	cost: z.number().nullable(),
});
export type TrialMetrics = z.infer<typeof trialMetricsSchema>;
export type MetricKey = keyof TrialMetrics;

/** Counts summed over the builds of a case or a run, plus medians and sums per build (summary.json). */
export const buildTotalsSchema = z.object({
	builds: z.number(),
	built: z.number(),
	scenPass: z.number(),
	scenN: z.number(),
	scenExcluded: z.number(),
	scenMock: z.number(),
	expPass: z.number(),
	expN: z.number(),
	expExcluded: z.number(),
	median: trialMetricsSchema,
	sum: trialMetricsSchema,
});
export type BuildTotals = z.infer<typeof buildTotalsSchema>;

/** First-build facts of one build, with the same rules as firstbuild.py. */
export const firstBuildSchema = z.object({
	firstOk: z.boolean(),
	oneShot: z.boolean(),
	callsToFirstSave: z.number().nullable(),
	rebuilds: z.number(),
	verifies: z.number(),
	/** Pass flags of the scenario runs linked by workflowId; excluded categories are left out. */
	scenarioPasses: z.array(z.boolean()),
});
export type FirstBuild = z.infer<typeof firstBuildSchema>;

export const scenarioRunSchema = z.object({
	slug: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	dataSetup: z.string().nullable(),
	successCriteria: z.string().nullable(),
	passed: z.boolean(),
	score: z.number().nullable(),
	failureCategory: z.string().nullable(),
	attribution: z.string().nullable(),
	reasoning: z.string().nullable(),
	rootCause: z.string().nullable(),
	execErrors: z.array(z.unknown()),
	workflowId: z.string().nullable(),
});
export type ScenarioRun = z.infer<typeof scenarioRunSchema>;

export const expectationSchema = z.object({
	expectation: z.string(),
	pass: z.boolean(),
	reason: z.string().nullable(),
});
export type Expectation = z.infer<typeof expectationSchema>;

/**
 * Time and tokens per tool. `timeMs` is derived: the gap between a model step and the
 * next step, split evenly when one step made several calls. `tokens` are the tokens of
 * the model step that issued the call, split the same way.
 */
export const toolStatSchema = z.object({
	tool: z.string(),
	calls: z.number(),
	failed: z.number(),
	timeMs: z.number(),
	tokens: z.number(),
});
export type ToolStat = z.infer<typeof toolStatSchema>;

/** Pseudo tool keys in tool stats. */
export const MODEL_TIME_KEY = '(model generation)';
export const TEXT_ANSWER_KEY = '(text answer)';

export const iterationSummarySchema = z.object({
	id: z.string(),
	arm: z.number(),
	caseName: z.string(),
	/** Sub-folder of the run (a pool links several runs). */
	sub: z.string(),
	/** 0-based iteration index inside its sub-folder. */
	index: z.number(),
	thread: z.string().nullable(),
	built: z.boolean().nullable(),
	buildError: z.string().nullable(),
	metrics: trialMetricsSchema.nullable(),
	firstBuild: firstBuildSchema,
	scenarios: z.array(scenarioRunSchema),
	expectations: z.array(expectationSchema),
	toolStats: z.array(toolStatSchema),
	hasDebug: z.boolean(),
	rawDebugId: z.string().nullable(),
});
export type IterationSummary = z.infer<typeof iterationSummarySchema>;

export const armCaseSchema = z.object({
	name: z.string(),
	totals: buildTotalsSchema.nullable(),
	iterations: z.array(iterationSummarySchema),
});
export type ArmCase = z.infer<typeof armCaseSchema>;

export const armSchema = z.object({
	name: z.string(),
	path: z.string(),
	totals: buildTotalsSchema.nullable(),
	cases: z.array(armCaseSchema),
	warnings: z.array(z.string()),
});
export type Arm = z.infer<typeof armSchema>;

export const viewerIndexSchema = z.object({
	version: z.literal(1),
	generatedAt: z.string(),
	arms: z.array(armSchema),
});
export type ViewerIndex = z.infer<typeof viewerIndexSchema>;

export const usageSchema = z.object({
	input: z.number(),
	output: z.number(),
	noCache: z.number(),
	cacheRead: z.number(),
	cacheWrite: z.number(),
});
export type Usage = z.infer<typeof usageSchema>;

/** One model call, from the run-debug HTML. */
export const modelStepSchema = z.object({
	index: z.number(),
	/** Epoch ms of `responseMeta.timestamp`. */
	startMs: z.number(),
	/** `performance.stepTimeMs`. */
	modelMs: z.number(),
	/** Derived: gap until the next step of the same run (tool execution plus harness overhead). */
	toolWindowMs: z.number().nullable(),
	finishReason: z.string().nullable(),
	modelId: z.string().nullable(),
	usage: usageSchema.nullable(),
	toolCalls: z.array(z.object({ id: z.string(), tool: z.string() })),
});
export type ModelStep = z.infer<typeof modelStepSchema>;

export const transcriptItemSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('text'), text: z.string() }),
	z.object({
		kind: z.literal('tool'),
		id: z.string(),
		tool: z.string(),
		args: z.unknown(),
		hasResult: z.boolean(),
		result: z.unknown(),
		failed: z.boolean(),
	}),
	z.object({ kind: z.literal('event'), type: z.string(), data: z.record(z.unknown()) }),
]);
export type TranscriptItem = z.infer<typeof transcriptItemSchema>;

export const turnSchema = z.object({
	userMessage: z.string(),
	items: z.array(transcriptItemSchema),
	steps: z.array(modelStepSchema),
});
export type Turn = z.infer<typeof turnSchema>;

export const iterationDetailSchema = z.object({
	id: z.string(),
	turns: z.array(turnSchema),
	workflow: z.unknown(),
});
export type IterationDetail = z.infer<typeof iterationDetailSchema>;
