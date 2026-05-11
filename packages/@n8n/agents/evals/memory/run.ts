import { embed, generateText } from 'ai';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import {
	MEMORY_EVAL_SCENARIOS,
	type MemoryEvalCategory,
	type MemoryEvalScenario,
	type MemoryEvalScope,
	type MemoryEvalSuite,
} from './scenarios';
import {
	scoreScenario,
	summarizeCategories,
	type CategorySummary,
	type MemoryEvalScore,
} from './scoring';
import {
	Agent,
	AgentEvent,
	createEmbeddingModel,
	createModel,
	filterLlmMessages,
	Memory,
	RECALL_MEMORY_TOOL_NAME,
	type GenerateResult,
} from '../../src';
import { InMemoryMemory } from '../../src/runtime/memory-store';
import type { RetrievedEpisodicMemoryEntry } from '../../src/types';
import type { TokenUsage } from '../../src/types/sdk/agent';

const ANTHROPIC_API_KEY_ENV = 'N8N_AI_ANTHROPIC_KEY';
const OPENAI_API_KEY_ENV = 'N8N_AI_OPENAI_API_KEY';
const DEFAULT_AGENT_MODEL = 'anthropic/claude-haiku-4-5';
const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const DEFAULT_AUTO_INJECT_TOP_K = 12;
const DEFAULT_RECALL_TOP_K = 12;
const DEFAULT_TURN_TIMEOUT_MS = 180_000;
const DEFAULT_JUDGE_TIMEOUT_MS = 120_000;

const SESSION_MEMORY_TEMPLATE = [
	'# Objective',
	'- ',
	'',
	'# Current state',
	'- ',
	'',
	'# Decisions made',
	'- ',
	'',
	'# Open follow-ups',
	'- ',
].join('\n');

interface CliOptions {
	suite: MemoryEvalSuite;
	limit?: number;
	category?: MemoryEvalCategory;
	repeats: number;
	concurrency: number;
	enforceThresholds: boolean;
	validateOnly: boolean;
	judge: boolean;
	judgeModel?: string;
}

interface EvalScope {
	agentId: string;
	resourceId: string;
}

interface EvalConfig {
	agentModel: string;
	judgeModel: string;
	anthropicApiKey: string;
	openAiApiKey: string;
}

interface JudgeScore {
	pass: boolean;
	answerPass: boolean;
	profilePass: boolean;
	memoryPass: boolean;
	reasoning: string;
	failureMode: string;
	raw: string;
	latencyMs: number;
}

interface TurnRecord {
	threadId: string;
	agentId: string;
	resourceId: string;
	user: string;
	answer: string;
	latencyMs: number;
	usage?: TokenUsage;
	totalCost?: number;
	toolCalls: string[];
}

interface RetrievalRecord {
	latencyMs: number;
	entries: RetrievedEpisodicMemoryEntry[];
}

interface ScenarioRunResult {
	repeat: number;
	scenario: MemoryEvalScenario;
	passed: boolean;
	score: MemoryEvalScore;
	seedTurns: TurnRecord[];
	recallTurn: TurnRecord;
	storedEntries: string[];
	retrieval: RetrievalRecord;
	injectedMemory: string[];
	userProfile: string;
	sessionMemory: string;
	backgroundErrors: Array<{ message: string; source?: string }>;
	judgeScore?: JudgeScore;
	error?: string;
}

interface RepeatSummary {
	repeat: number;
	runs: number;
	passRate: number;
	answerPassRate: number | null;
	judgePassRate: number | null;
	judgeAnswerPassRate: number | null;
	judgeProfilePassRate: number | null;
	judgeMemoryPassRate: number | null;
}

interface RateStats {
	mean: number | null;
	stdDev: number | null;
}

interface RepeatStats {
	passRate: RateStats;
	answerPassRate: RateStats;
	judgePassRate: RateStats;
	judgeAnswerPassRate: RateStats;
	judgeProfilePassRate: RateStats;
	judgeMemoryPassRate: RateStats;
}

interface EvalModelConfig {
	agentModel: string;
	judgeModel: string;
	embeddingModel: string;
	autoInjectTopK: number;
	recallTopK: number;
}

interface MemoryEvalCategorySummary extends CategorySummary {
	judgeScenarios: number;
	judgePassed: number;
	judgePassRate: number | null;
}

interface CategoryRepeatStats {
	category: MemoryEvalCategory;
	scenarios: number;
	runs: number;
	passRate: RateStats;
	answerPassRate: RateStats;
	judgePassRate: RateStats;
}

interface Summary {
	suite: MemoryEvalSuite;
	generatedAt: string;
	commit: string;
	modelConfig: EvalModelConfig;
	scenarios: number;
	repeats: number;
	totalRuns: number;
	passed: number;
	passRate: number;
	answerPassRate: number | null;
	retrievalTop1Rate: number | null;
	retrievalTop3Rate: number | null;
	retrievalTop12Rate: number | null;
	judgePassRate: number | null;
	judgeAnswerPassRate: number | null;
	judgeProfilePassRate: number | null;
	judgeMemoryPassRate: number | null;
	judgeLatencyMeanMs: number | null;
	judgeLatencyP95Ms: number | null;
	scopeLeakCount: number;
	backgroundErrorCount: number;
	harnessErrorCount: number;
	totalLatencyMs: number;
	retrievalLatencyMeanMs: number | null;
	retrievalLatencyP95Ms: number | null;
	totalPromptTokens: number;
	totalCompletionTokens: number;
	totalTokens: number;
	totalKnownCostUsd: number;
	categorySummaries: MemoryEvalCategorySummary[];
	categoryRepeatStats: CategoryRepeatStats[];
	repeatSummaries: RepeatSummary[];
	repeatStats: RepeatStats;
}

interface EvalJob {
	order: number;
	repeat: number;
	scenario: MemoryEvalScenario;
}

function parseArgs(argv: string[]): CliOptions {
	const opts: CliOptions = {
		suite: 'smoke',
		repeats: 1,
		concurrency: 1,
		enforceThresholds: false,
		validateOnly: false,
		judge: false,
	};
	let concurrencyFromCli = false;

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === '--suite') {
			const value = argv[++index];
			if (value !== 'smoke' && value !== 'full') {
				throw new Error('--suite must be "smoke" or "full"');
			}
			opts.suite = value;
		} else if (arg === '--limit') {
			opts.limit = parsePositiveInteger(argv[++index], '--limit');
		} else if (arg === '--category') {
			opts.category = parseCategory(argv[++index]);
		} else if (arg === '--repeats') {
			opts.repeats = parsePositiveInteger(argv[++index], '--repeats');
		} else if (arg === '--concurrency') {
			opts.concurrency = parsePositiveInteger(argv[++index], '--concurrency');
			concurrencyFromCli = true;
		} else if (arg === '--enforce-thresholds') {
			opts.enforceThresholds = true;
		} else if (arg === '--validate-only') {
			opts.validateOnly = true;
		} else if (arg === '--judge') {
			opts.judge = true;
		} else if (arg === '--judge-model') {
			opts.judgeModel = requireArgValue(argv[++index], '--judge-model');
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	const envLimit = process.env.N8N_MEMORY_EVAL_LIMIT;
	if (opts.limit === undefined && envLimit) {
		opts.limit = parsePositiveInteger(envLimit, 'N8N_MEMORY_EVAL_LIMIT');
	}

	const envRepeats = process.env.N8N_MEMORY_EVAL_REPEATS;
	if (envRepeats) {
		opts.repeats = parsePositiveInteger(envRepeats, 'N8N_MEMORY_EVAL_REPEATS');
	}

	const envConcurrency = process.env.N8N_MEMORY_EVAL_CONCURRENCY;
	if (!concurrencyFromCli && envConcurrency) {
		opts.concurrency = parsePositiveInteger(envConcurrency, 'N8N_MEMORY_EVAL_CONCURRENCY');
	}

	const envCategory = process.env.N8N_MEMORY_EVAL_CATEGORY;
	if (opts.category === undefined && envCategory) {
		opts.category = parseCategory(envCategory);
	}

	const envJudge = process.env.N8N_MEMORY_EVAL_JUDGE;
	if (!opts.judge && envJudge && envJudge !== '0' && envJudge.toLowerCase() !== 'false') {
		opts.judge = true;
	}

	const envJudgeModel = process.env.N8N_MEMORY_EVAL_JUDGE_MODEL;
	if (opts.judgeModel === undefined && envJudgeModel) {
		opts.judgeModel = envJudgeModel;
	}

	return opts;
}

function requireArgValue(raw: string | undefined, name: string): string {
	if (!raw?.trim()) throw new Error(`${name} requires a value`);
	return raw;
}

function parsePositiveInteger(raw: string | undefined, name: string): number {
	if (!raw) throw new Error(`${name} requires a value`);
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new Error(`${name} must be a positive integer`);
	}
	return parsed;
}

function parseCategory(raw: string | undefined): MemoryEvalCategory {
	if (!raw) throw new Error('--category requires a value');
	const categories = [
		...new Set(MEMORY_EVAL_SCENARIOS.map((scenario) => scenario.category)),
	].sort();
	if (!isMemoryEvalCategory(raw, categories)) {
		throw new Error(`Unknown category "${raw}". Valid: ${categories.join(', ')}`);
	}
	return raw;
}

function isMemoryEvalCategory(
	value: string,
	categories: MemoryEvalCategory[],
): value is MemoryEvalCategory {
	return categories.some((category) => category === value);
}

function validateScenarios(): string[] {
	const errors: string[] = [];
	const ids = new Set<string>();
	for (const scenario of MEMORY_EVAL_SCENARIOS) {
		if (ids.has(scenario.id)) {
			errors.push(`Duplicate scenario id: ${scenario.id}`);
		}
		ids.add(scenario.id);
		if (scenario.seedThreads.length === 0) {
			errors.push(`${scenario.id}: expected at least one seed thread`);
		}
		if (!scenario.recall.prompt.trim()) {
			errors.push(`${scenario.id}: recall prompt is empty`);
		}
		if (hasThreadScopedAnswerExpectation(scenario)) {
			const seedThreadIds = new Set(scenario.seedThreads.map((thread) => thread.id));
			if (!seedThreadIds.has(scenario.recall.threadId)) {
				errors.push(
					`${scenario.id}: session-memory answer expectations must recall within a seed thread`,
				);
			}
		}
		for (const thread of scenario.seedThreads) {
			if (thread.turns.length === 0) {
				errors.push(`${scenario.id}/${thread.id}: expected at least one turn`);
			}
		}
	}
	return errors;
}

function hasThreadScopedAnswerExpectation(scenario: MemoryEvalScenario): boolean {
	return (
		scenario.category === 'session-memory' && (scenario.expect.answer?.contains?.length ?? 0) > 0
	);
}

function selectScenarios(opts: CliOptions): MemoryEvalScenario[] {
	let scenarios =
		opts.suite === 'smoke'
			? MEMORY_EVAL_SCENARIOS.filter((scenario) => scenario.smoke)
			: MEMORY_EVAL_SCENARIOS;

	if (opts.category) {
		scenarios = scenarios.filter((scenario) => scenario.category === opts.category);
	}

	if (opts.limit !== undefined) {
		scenarios = scenarios.slice(0, opts.limit);
	}

	return scenarios;
}

function createEvalJobs(scenarios: MemoryEvalScenario[], repeats: number): EvalJob[] {
	const jobs: EvalJob[] = [];
	for (let repeat = 1; repeat <= repeats; repeat++) {
		for (const scenario of scenarios) {
			jobs.push({ order: jobs.length, repeat, scenario });
		}
	}
	return jobs;
}

async function runEvalJobs(
	jobs: EvalJob[],
	opts: CliOptions,
	config: EvalConfig,
): Promise<ScenarioRunResult[]> {
	const results = Array.from(
		{ length: jobs.length },
		(): ScenarioRunResult | undefined => undefined,
	);
	const workerCount = Math.min(opts.concurrency, jobs.length);
	let nextJobIndex = 0;
	let completed = 0;

	async function runWorker(): Promise<void> {
		while (true) {
			const jobIndex = nextJobIndex;
			nextJobIndex += 1;
			if (jobIndex >= jobs.length) return;

			const job = jobs[jobIndex];
			if (job === undefined) {
				throw new Error(`Missing eval job at index ${jobIndex}`);
			}

			const result = await runScenario(job.scenario, job.repeat, config);
			if (opts.judge) {
				result.judgeScore = await judgeScenario(result, config);
			}

			results[job.order] = result;
			completed += 1;
			printProgress(job, result, completed, jobs.length, opts.repeats);
		}
	}

	const workers: Array<Promise<void>> = [];
	for (let workerIndex = 0; workerIndex < workerCount; workerIndex++) {
		workers.push(runWorker());
	}
	await Promise.all(workers);

	return results.map((result, index) => {
		if (result === undefined) {
			throw new Error(`Missing eval result at index ${index}`);
		}
		return result;
	});
}

function printProgress(
	job: EvalJob,
	result: ScenarioRunResult,
	completed: number,
	total: number,
	repeats: number,
): void {
	const status = result.passed ? 'pass' : 'miss';
	const toolUsed = result.recallTurn.toolCalls.includes(RECALL_MEMORY_TOOL_NAME);
	const judgeStatus = result.judgeScore
		? `; judge=${result.judgeScore.pass ? 'pass' : 'miss'}`
		: '';
	console.log(
		`[${completed}/${total}] [${job.repeat}/${repeats}] ${job.scenario.id}: ${status}; recall_memory=${toolUsed ? 'yes' : 'no'}${judgeStatus}`,
	);
}

function requireEvalConfig(opts: CliOptions): EvalConfig {
	const anthropicApiKey = process.env[ANTHROPIC_API_KEY_ENV];
	const openAiApiKey = process.env[OPENAI_API_KEY_ENV];
	if (!anthropicApiKey || !openAiApiKey) {
		throw new Error(
			`Set ${ANTHROPIC_API_KEY_ENV} and ${OPENAI_API_KEY_ENV} before running memory evals.`,
		);
	}

	return {
		agentModel: process.env.N8N_MEMORY_EVAL_AGENT_MODEL ?? DEFAULT_AGENT_MODEL,
		judgeModel:
			opts.judgeModel ??
			process.env.N8N_MEMORY_EVAL_JUDGE_MODEL ??
			process.env.N8N_MEMORY_EVAL_AGENT_MODEL ??
			DEFAULT_AGENT_MODEL,
		anthropicApiKey,
		openAiApiKey,
	};
}

function resolveScope(scenario: MemoryEvalScenario, override?: MemoryEvalScope): EvalScope {
	return {
		agentId: override?.agentId ?? `agent-${scenario.id}`,
		resourceId: override?.resourceId ?? `resource-${scenario.id}`,
	};
}

function createAgentForScenario(
	scenario: MemoryEvalScenario,
	memory: InMemoryMemory,
	config: EvalConfig,
): Agent {
	const embedder = createEmbeddingModel(DEFAULT_EMBEDDING_MODEL, { apiKey: config.openAiApiKey });
	const memoryBuilder = new Memory()
		.storage(memory)
		.lastMessages(4)
		.scope('thread')
		.freeform(SESSION_MEMORY_TEMPLATE)
		.profiles()
		.observationalMemory({ sync: true, compactionThreshold: 1 })
		.episodicMemory({
			sync: true,
			topK: DEFAULT_RECALL_TOP_K,
			autoInjectTopK: DEFAULT_AUTO_INJECT_TOP_K,
			embedder,
			embeddingModel: DEFAULT_EMBEDDING_MODEL,
		});

	return new Agent(`memory-eval-${scenario.id}`)
		.model({ id: config.agentModel, apiKey: config.anthropicApiKey })
		.instructions(buildInstructions(scenario))
		.memory(memoryBuilder);
}

function buildInstructions(scenario: MemoryEvalScenario): string {
	return [
		'You are a customer support engineering assistant.',
		'Use <user-profile>, <memory>, and <session-memory> when they are present.',
		'Use source-backed case memory when it is relevant, but do not invent missing details.',
		'If memory does not contain the answer, say that you do not know from memory.',
		'Preserve exact identifiers, field names, dates, and causal directionality.',
		'Keep answers concise.',
		`Agent description: ${scenario.agentDescription}`,
		scenario.instructions ?? '',
	]
		.filter((line) => line.trim().length > 0)
		.join('\n');
}

async function runScenario(
	scenario: MemoryEvalScenario,
	repeat: number,
	config: EvalConfig,
): Promise<ScenarioRunResult> {
	const memory = new InMemoryMemory();
	const agent = createAgentForScenario(scenario, memory, config);
	const backgroundErrors: Array<{ message: string; source?: string }> = [];
	agent.on(AgentEvent.Error, (event) => {
		if (event.type !== AgentEvent.Error) return;
		backgroundErrors.push({
			message: event.message,
			...(event.source !== undefined && { source: event.source }),
		});
	});

	const seedTurns: TurnRecord[] = [];
	const defaultScope = resolveScope(scenario);

	try {
		for (const thread of scenario.seedThreads) {
			const scope = resolveScope(scenario, thread.scope);
			for (const user of thread.turns) {
				seedTurns.push(
					await generateTurn(agent, user, {
						threadId: `${scenario.id}-${thread.id}`,
						agentId: scope.agentId,
						resourceId: scope.resourceId,
					}),
				);
				await agent.close();
			}
		}

		const recallScope = resolveScope(scenario, scenario.recall.scope);
		const recallTurn = await generateTurn(agent, scenario.recall.prompt, {
			threadId: `${scenario.id}-${scenario.recall.threadId}`,
			agentId: recallScope.agentId,
			resourceId: recallScope.resourceId,
		});
		await agent.close();

		const state = agent.getState();
		const storedEntries = await getStoredEntries(memory, defaultScope);
		const retrieval = await retrieveEntries(memory, scenario, recallScope, config);
		const userProfile =
			(
				await memory.getMemoryProfile({
					scopeKind: 'user-profile',
					agentId: defaultScope.agentId,
					resourceId: defaultScope.resourceId,
				})
			)?.content ?? '';
		const sessionMemory = await getSessionMemory(memory, scenario, defaultScope.resourceId);

		const score = scoreScenario({
			scenario,
			entries: storedEntries,
			retrievedEntries: retrieval.entries.map((entry) => entry.content),
			answer: recallTurn.answer,
			userProfile,
			sessionMemory,
			backgroundErrors: backgroundErrors.length,
		});

		return {
			repeat,
			scenario,
			passed: score.passed,
			score,
			seedTurns,
			recallTurn,
			storedEntries,
			retrieval,
			injectedMemory: state.messageList.episodicMemory?.entries ?? [],
			userProfile,
			sessionMemory,
			backgroundErrors,
		};
	} catch (error) {
		await agent.close();
		const message = error instanceof Error ? error.message : String(error);
		const emptyRecall: TurnRecord = {
			threadId: `${scenario.id}-${scenario.recall.threadId}`,
			agentId: defaultScope.agentId,
			resourceId: defaultScope.resourceId,
			user: scenario.recall.prompt,
			answer: '',
			latencyMs: 0,
			toolCalls: [],
		};
		const score = scoreScenario({
			scenario,
			entries: [],
			retrievedEntries: [],
			answer: '',
			userProfile: '',
			sessionMemory: '',
			backgroundErrors: backgroundErrors.length + 1,
		});
		return {
			repeat,
			scenario,
			passed: false,
			score,
			seedTurns,
			recallTurn: emptyRecall,
			storedEntries: [],
			retrieval: { latencyMs: 0, entries: [] },
			injectedMemory: [],
			userProfile: '',
			sessionMemory: '',
			backgroundErrors,
			error: message,
		};
	}
}

async function judgeScenario(result: ScenarioRunResult, config: EvalConfig): Promise<JudgeScore> {
	const start = performance.now();
	try {
		const { text } = await generateText({
			model: createModel({ id: config.judgeModel, apiKey: config.anthropicApiKey }),
			abortSignal: AbortSignal.timeout(DEFAULT_JUDGE_TIMEOUT_MS),
			system: [
				'You are an evaluation judge for a stateful AI memory system.',
				'Judge semantic success, not literal keyword matching.',
				'Be strict about scope leaks, fabricated memory, and storing task-local state in durable profiles.',
				'Treat negated or corrected facts as acceptable when they are clearly marked as ruled out or superseded.',
				'Return only valid JSON. Do not include markdown fences.',
			].join('\n'),
			prompt: buildJudgePrompt(result),
		});
		const parsed = parseJudgeScore(text);
		return {
			...parsed,
			raw: text,
			latencyMs: Math.round(performance.now() - start),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			pass: false,
			answerPass: false,
			profilePass: false,
			memoryPass: false,
			reasoning: `Judge failed: ${message}`,
			failureMode: 'judge_error',
			raw: message,
			latencyMs: Math.round(performance.now() - start),
		};
	}
}

function buildJudgePrompt(result: ScenarioRunResult): string {
	const failedChecks = result.score.checks.filter((check) => !check.passed);
	return [
		'Judge this n8n memory eval scenario.',
		'',
		'Scoring guidance:',
		'- pass: the memory behavior satisfies the scenario intent overall.',
		'- answerPass: the final answer uses memory appropriately and avoids harmful fabrication or leakage.',
		'- profilePass: <user-profile> contains appropriate durable user/resource content and avoids task-local or cross-scope leakage.',
		'- memoryPass: episodic entries, retrieval, and <session-memory> capture useful state without serious leakage.',
		'- If deterministic checks are too literal, you may still pass semantically correct behavior.',
		'- Deterministic "contains" expectations are keyword anchors, not positive semantic claims. For example, expected keyword "emojis" can be satisfied by "do not use emojis".',
		'- scenario.expect.forbiddenEntries applies only to stored episodic entries. Do not apply it to <user-profile>, <session-memory>, or the final answer unless those sections have their own excludes.',
		'- Judge profile direction against the seed conversation, not the polarity you infer from keyword anchors.',
		'- When there are no deterministic failed profile checks, do not invent a profile failure unless the stored profile clearly contradicts the seed conversation.',
		'- If a profile expectation only has exclusions, an empty profile can be acceptable.',
		'- <session-memory> is thread-scoped in this eval harness.',
		'- For session-memory scenarios where recallThreadId differs from all seed thread ids, do not fail the final answer for not using seed-thread <session-memory>; judge whether seed-thread <session-memory> captured state and whether the profile/answer avoided treating task-local state as durable.',
		'- For session-memory scenarios where recallThreadId matches a seed thread id, the final answer should use that thread-local <session-memory> when the prompt asks for current thread state.',
		'- <user-profile> captures stable facts and preferences about the user/resource, including communication style, workflow preferences, and priorities.',
		'- If the answer or memory exposes another scope, fabricates remembered details, or misses the core requested memory behavior, fail.',
		'',
		'Return only JSON in this exact shape:',
		'{"pass":true,"answerPass":true,"profilePass":true,"memoryPass":true,"reasoning":"...","failureMode":"none"}',
		'Use failureMode one of: none, answer, profile, memory, retrieval, scope, abstention, harness, judge_uncertain.',
		'',
		'<scenario>',
		JSON.stringify(
			{
				id: result.scenario.id,
				title: result.scenario.title,
				category: result.scenario.category,
				deterministicChecks: result.score.checks,
				seedThreads: result.scenario.seedThreads,
				recallPrompt: result.scenario.recall.prompt,
				recallThreadId: result.scenario.recall.threadId,
				recallScope: result.scenario.recall.scope ?? null,
			},
			null,
			2,
		),
		'</scenario>',
		'',
		'<deterministic-failed-checks>',
		failedChecks.length ? JSON.stringify(failedChecks, null, 2) : '[]',
		'</deterministic-failed-checks>',
		'',
		'<user-profile>',
		truncateForJudge(result.userProfile),
		'</user-profile>',
		'',
		'<session-memory>',
		truncateForJudge(result.sessionMemory),
		'</session-memory>',
		'',
		'<stored-episodic-entries>',
		truncateForJudge(JSON.stringify(result.storedEntries, null, 2), 8000),
		'</stored-episodic-entries>',
		'',
		'<retrieved-episodic-entries>',
		truncateForJudge(
			JSON.stringify(
				result.retrieval.entries.map((entry) => ({
					content: entry.content,
					score: entry.finalScore,
				})),
				null,
				2,
			),
			8000,
		),
		'</retrieved-episodic-entries>',
		'',
		'<final-answer>',
		truncateForJudge(result.recallTurn.answer),
		'</final-answer>',
	].join('\n');
}

function parseJudgeScore(text: string): Omit<JudgeScore, 'raw' | 'latencyMs'> {
	const parsed = parseJsonObject(stripMarkdownFence(text));
	if (!isRecord(parsed)) {
		return {
			pass: false,
			answerPass: false,
			profilePass: false,
			memoryPass: false,
			reasoning: 'Judge did not return a JSON object.',
			failureMode: 'judge_uncertain',
		};
	}

	return {
		pass: parsed.pass === true,
		answerPass: parsed.answerPass === true,
		profilePass: parsed.profilePass === true,
		memoryPass: parsed.memoryPass === true,
		reasoning:
			typeof parsed.reasoning === 'string' && parsed.reasoning.trim()
				? parsed.reasoning.trim()
				: 'No reasoning provided.',
		failureMode:
			typeof parsed.failureMode === 'string' && parsed.failureMode.trim()
				? parsed.failureMode.trim()
				: parsed.pass === true
					? 'none'
					: 'judge_uncertain',
	};
}

function stripMarkdownFence(text: string): string {
	return text
		.replace(/^```(?:json)?\s*\n?/i, '')
		.replace(/\n?```\s*$/i, '')
		.trim();
}

function parseJsonObject(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function truncateForJudge(value: string, maxLength = 6000): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength)}\n[truncated ${value.length - maxLength} chars]`;
}

async function generateTurn(
	agent: Agent,
	user: string,
	persistence: { threadId: string; agentId: string; resourceId: string },
): Promise<TurnRecord> {
	const start = performance.now();
	const result = await agent.generate(user, {
		persistence,
		maxIterations: 6,
		abortSignal: AbortSignal.timeout(DEFAULT_TURN_TIMEOUT_MS),
	});
	const latencyMs = Math.round(performance.now() - start);
	return {
		...persistence,
		user,
		answer: findLastTextContent(result),
		latencyMs,
		...(result.usage !== undefined && { usage: result.usage }),
		...(result.totalCost !== undefined && { totalCost: result.totalCost }),
		toolCalls: (result.toolCalls ?? []).map((call) => call.tool),
	};
}

function findLastTextContent(result: GenerateResult): string {
	for (const message of [...filterLlmMessages(result.messages)].reverse()) {
		for (const content of message.content) {
			if (content.type === 'text') return content.text;
		}
	}
	return '';
}

async function getStoredEntries(memory: InMemoryMemory, scope: EvalScope): Promise<string[]> {
	const entries = await memory.searchEpisodicMemoryEntries(scope, '', { topK: 200 });
	return entries.map((entry) => entry.content);
}

async function retrieveEntries(
	memory: InMemoryMemory,
	scenario: MemoryEvalScenario,
	scope: EvalScope,
	config: EvalConfig,
): Promise<RetrievalRecord> {
	const embedder = createEmbeddingModel(DEFAULT_EMBEDDING_MODEL, { apiKey: config.openAiApiKey });
	const start = performance.now();
	const { embedding } = await embed({ model: embedder, value: scenario.recall.prompt });
	const entries = await memory.searchEpisodicMemoryEntries(scope, scenario.recall.prompt, {
		topK: DEFAULT_AUTO_INJECT_TOP_K,
		queryEmbedding: embedding,
	});
	return {
		latencyMs: Math.round(performance.now() - start),
		entries,
	};
}

async function getSessionMemory(
	memory: InMemoryMemory,
	scenario: MemoryEvalScenario,
	resourceId: string,
): Promise<string> {
	const threadIds = [
		...scenario.seedThreads.map((thread) => `${scenario.id}-${thread.id}`),
		`${scenario.id}-${scenario.recall.threadId}`,
	];
	const blocks = await Promise.all(
		threadIds.map(async (threadId) => {
			const content = await memory.getWorkingMemory({ threadId, resourceId, scope: 'thread' });
			return content ? [`<thread id="${threadId}">`, content, '</thread>'].join('\n') : '';
		}),
	);
	return blocks.filter(Boolean).join('\n\n');
}

function buildSummary(
	opts: CliOptions,
	results: ScenarioRunResult[],
	config: EvalConfig,
	commit: string,
	generatedAt: string,
): Summary {
	const answered = results.filter((result) => result.score.answerPassed !== null);
	const top1 = results.filter((result) => result.score.retrievalTop1Hit !== null);
	const top3 = results.filter((result) => result.score.retrievalTop3Hit !== null);
	const top12 = results.filter((result) => result.score.retrievalTop12Hit !== null);
	const judged = results.filter(hasJudgeScore);
	const retrievalLatencies = results
		.map((result) => result.retrieval.latencyMs)
		.filter((latency) => latency > 0)
		.sort((a, b) => a - b);
	const judgeLatencies = judged
		.map((result) => result.judgeScore.latencyMs)
		.filter((latency) => latency > 0)
		.sort((a, b) => a - b);
	const usages = results
		.flatMap((result) => [
			...result.seedTurns
				.map((turn) => turn.usage)
				.filter((usage): usage is TokenUsage => usage !== undefined),
			result.recallTurn.usage,
		])
		.filter((usage): usage is TokenUsage => usage !== undefined);

	const totalKnownCostUsd = results.reduce(
		(total, result) =>
			total +
			result.seedTurns.reduce(
				(turnTotal, turn) => turnTotal + (turn.totalCost ?? turn.usage?.cost ?? 0),
				0,
			) +
			(result.recallTurn.totalCost ?? result.recallTurn.usage?.cost ?? 0),
		0,
	);
	const repeatSummaries = summarizeRepeats(results);

	return {
		suite: opts.suite,
		generatedAt,
		commit,
		modelConfig: {
			agentModel: config.agentModel,
			judgeModel: config.judgeModel,
			embeddingModel: DEFAULT_EMBEDDING_MODEL,
			autoInjectTopK: DEFAULT_AUTO_INJECT_TOP_K,
			recallTopK: DEFAULT_RECALL_TOP_K,
		},
		scenarios: new Set(results.map((result) => result.scenario.id)).size,
		repeats: opts.repeats,
		totalRuns: results.length,
		passed: results.filter((result) => result.passed).length,
		passRate: ratio(results.filter((result) => result.passed).length, results.length),
		answerPassRate: answered.length
			? ratio(
					answered.filter((result) => result.score.answerPassed === true).length,
					answered.length,
				)
			: null,
		retrievalTop1Rate: rateFor(top1, 'retrievalTop1Hit'),
		retrievalTop3Rate: rateFor(top3, 'retrievalTop3Hit'),
		retrievalTop12Rate: rateFor(top12, 'retrievalTop12Hit'),
		judgePassRate: judgeRateFor(judged, 'pass'),
		judgeAnswerPassRate: judgeRateFor(judged, 'answerPass'),
		judgeProfilePassRate: judgeRateFor(judged, 'profilePass'),
		judgeMemoryPassRate: judgeRateFor(judged, 'memoryPass'),
		judgeLatencyMeanMs: mean(judgeLatencies),
		judgeLatencyP95Ms: percentile(judgeLatencies, 0.95),
		scopeLeakCount: results.reduce((total, result) => total + result.score.scopeLeakCount, 0),
		backgroundErrorCount: results.reduce(
			(total, result) => total + result.backgroundErrors.length,
			0,
		),
		harnessErrorCount: results.filter((result) => result.error !== undefined).length,
		totalLatencyMs: results.reduce(
			(total, result) =>
				total +
				result.seedTurns.reduce((turnTotal, turn) => turnTotal + turn.latencyMs, 0) +
				result.recallTurn.latencyMs,
			0,
		),
		retrievalLatencyMeanMs: mean(retrievalLatencies),
		retrievalLatencyP95Ms: percentile(retrievalLatencies, 0.95),
		totalPromptTokens: usages.reduce((total, usage) => total + usage.promptTokens, 0),
		totalCompletionTokens: usages.reduce((total, usage) => total + usage.completionTokens, 0),
		totalTokens: usages.reduce((total, usage) => total + usage.totalTokens, 0),
		totalKnownCostUsd,
		categorySummaries: summarizeCategoriesWithJudge(results),
		categoryRepeatStats: summarizeCategoryRepeatStats(results),
		repeatSummaries,
		repeatStats: summarizeRepeatStats(repeatSummaries),
	};
}

function hasJudgeScore(
	result: ScenarioRunResult,
): result is ScenarioRunResult & { judgeScore: JudgeScore } {
	return result.judgeScore !== undefined;
}

function rateFor(
	results: ScenarioRunResult[],
	key: 'retrievalTop1Hit' | 'retrievalTop3Hit' | 'retrievalTop12Hit',
): number | null {
	if (results.length === 0) return null;
	return ratio(results.filter((result) => result.score[key] === true).length, results.length);
}

function judgeRateFor(
	results: Array<ScenarioRunResult & { judgeScore: JudgeScore }>,
	key: 'pass' | 'answerPass' | 'profilePass' | 'memoryPass',
): number | null {
	if (results.length === 0) return null;
	return ratio(results.filter((result) => result.judgeScore[key]).length, results.length);
}

function summarizeCategoriesWithJudge(results: ScenarioRunResult[]): MemoryEvalCategorySummary[] {
	const deterministic = summarizeCategories(results);
	return deterministic.map((row) => {
		const judged = results.filter(
			(result) => result.scenario.category === row.category && result.judgeScore !== undefined,
		);
		const judgePassed = judged.filter((result) => result.judgeScore?.pass === true).length;
		return {
			...row,
			judgeScenarios: judged.length,
			judgePassed,
			judgePassRate: judged.length > 0 ? ratio(judgePassed, judged.length) : null,
		};
	});
}

function summarizeCategoryRepeatStats(results: ScenarioRunResult[]): CategoryRepeatStats[] {
	const categories = [...new Set(results.map((result) => result.scenario.category))].sort();
	return categories.map((category) => {
		const rows = results.filter((result) => result.scenario.category === category);
		const repeats = [...new Set(rows.map((result) => result.repeat))].sort((a, b) => a - b);
		const perRepeat = repeats.map((repeat) => {
			const repeatRows = rows.filter((result) => result.repeat === repeat);
			const answered = repeatRows.filter((result) => result.score.answerPassed !== null);
			const judged = repeatRows.filter(hasJudgeScore);
			return {
				passRate: ratio(
					repeatRows.filter((result) => result.score.passed).length,
					repeatRows.length,
				),
				answerPassRate: answered.length
					? ratio(
							answered.filter((result) => result.score.answerPassed === true).length,
							answered.length,
						)
					: null,
				judgePassRate: judgeRateFor(judged, 'pass'),
			};
		});

		return {
			category,
			scenarios: new Set(rows.map((result) => result.scenario.id)).size,
			runs: rows.length,
			passRate: rateStats(perRepeat.map((repeat) => repeat.passRate)),
			answerPassRate: rateStats(perRepeat.map((repeat) => repeat.answerPassRate)),
			judgePassRate: rateStats(perRepeat.map((repeat) => repeat.judgePassRate)),
		};
	});
}

function summarizeRepeats(results: ScenarioRunResult[]): RepeatSummary[] {
	const repeats = [...new Set(results.map((result) => result.repeat))].sort((a, b) => a - b);
	return repeats.map((repeat) => {
		const rows = results.filter((result) => result.repeat === repeat);
		const answered = rows.filter((result) => result.score.answerPassed !== null);
		const judged = rows.filter(hasJudgeScore);
		return {
			repeat,
			runs: rows.length,
			passRate: ratio(rows.filter((result) => result.passed).length, rows.length),
			answerPassRate: answered.length
				? ratio(
						answered.filter((result) => result.score.answerPassed === true).length,
						answered.length,
					)
				: null,
			judgePassRate: judgeRateFor(judged, 'pass'),
			judgeAnswerPassRate: judgeRateFor(judged, 'answerPass'),
			judgeProfilePassRate: judgeRateFor(judged, 'profilePass'),
			judgeMemoryPassRate: judgeRateFor(judged, 'memoryPass'),
		};
	});
}

function summarizeRepeatStats(repeats: RepeatSummary[]): RepeatStats {
	return {
		passRate: rateStats(repeats.map((repeat) => repeat.passRate)),
		answerPassRate: rateStats(repeats.map((repeat) => repeat.answerPassRate)),
		judgePassRate: rateStats(repeats.map((repeat) => repeat.judgePassRate)),
		judgeAnswerPassRate: rateStats(repeats.map((repeat) => repeat.judgeAnswerPassRate)),
		judgeProfilePassRate: rateStats(repeats.map((repeat) => repeat.judgeProfilePassRate)),
		judgeMemoryPassRate: rateStats(repeats.map((repeat) => repeat.judgeMemoryPassRate)),
	};
}

function rateStats(values: Array<number | null>): RateStats {
	const filtered = values.filter((value): value is number => value !== null);
	if (filtered.length === 0) return { mean: null, stdDev: null };
	const avg = mean(filtered);
	if (avg === null) return { mean: null, stdDev: null };
	const variance =
		filtered.reduce((total, value) => total + Math.pow(value - avg, 2), 0) / filtered.length;
	return { mean: avg, stdDev: Math.sqrt(variance) };
}

function ratio(numerator: number, denominator: number): number {
	return denominator === 0 ? 0 : numerator / denominator;
}

function mean(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile(values: number[], p: number): number | null {
	if (values.length === 0) return null;
	const index = Math.min(values.length - 1, Math.ceil(values.length * p) - 1);
	return values[index];
}

async function writeResults(
	results: ScenarioRunResult[],
	summary: Summary,
	generatedAt: string,
): Promise<string> {
	const safeTimestamp = generatedAt.replace(/[:.]/g, '-');
	const dir = path.join(process.cwd(), 'evals', 'memory', 'results', `run-${safeTimestamp}`);
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, 'raw-results.json'), JSON.stringify(results, null, 2));
	await writeFile(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2));
	await writeFile(path.join(dir, 'summary.md'), renderMarkdownSummary(summary, results));
	await writeFile(path.join(dir, 'summary.html'), renderHtmlSummary(summary, results));
	return dir;
}

function renderMarkdownSummary(summary: Summary, results: ScenarioRunResult[]): string {
	const failures = results.filter((result) => !result.passed).slice(0, 10);
	return [
		'# n8n Memory Eval Summary',
		'',
		`Generated: ${summary.generatedAt}`,
		`Commit: ${summary.commit}`,
		`Suite: ${summary.suite}`,
		'',
		'## TL;DR',
		'',
		`- Pass rate: ${formatPercent(summary.passRate)} (${summary.passed}/${summary.totalRuns})`,
		`- Answer pass rate: ${formatNullablePercent(summary.answerPassRate)}`,
		`- Retrieval top-1/top-3/top-12: ${formatNullablePercent(summary.retrievalTop1Rate)} / ${formatNullablePercent(summary.retrievalTop3Rate)} / ${formatNullablePercent(summary.retrievalTop12Rate)}`,
		`- Judge pass rate: ${formatNullablePercent(summary.judgePassRate)}`,
		`- Judge answer/profile/memory: ${formatNullablePercent(summary.judgeAnswerPassRate)} / ${formatNullablePercent(summary.judgeProfilePassRate)} / ${formatNullablePercent(summary.judgeMemoryPassRate)}`,
		`- Repeat mean/std-dev: deterministic ${formatStats(summary.repeatStats.passRate)}; judge ${formatStats(summary.repeatStats.judgePassRate)}`,
		`- Scope leaks: ${summary.scopeLeakCount}`,
		`- Background errors: ${summary.backgroundErrorCount}`,
		`- Harness errors: ${summary.harnessErrorCount}`,
		`- Total tokens: ${summary.totalTokens} (${summary.totalPromptTokens} prompt, ${summary.totalCompletionTokens} completion)`,
		`- Known model cost: $${summary.totalKnownCostUsd.toFixed(4)}`,
		`- Retrieval latency mean/p95: ${formatMs(summary.retrievalLatencyMeanMs)} / ${formatMs(summary.retrievalLatencyP95Ms)}`,
		`- Judge latency mean/p95: ${formatMs(summary.judgeLatencyMeanMs)} / ${formatMs(summary.judgeLatencyP95Ms)}`,
		'',
		'## Categories',
		'',
		'| Category | Pass rate | Answer rate | Judge rate | Runs |',
		'|---|---:|---:|---:|---:|',
		...summary.categorySummaries.map(
			(row) =>
				`| ${row.category} | ${formatPercent(row.passRate)} | ${formatNullablePercent(row.answerPassRate)} | ${formatNullablePercent(row.judgePassRate)} | ${row.scenarios} |`,
		),
		'',
		'## Repeats',
		'',
		'| Repeat | Pass rate | Answer rate | Judge rate | Judge answer | Judge profile | Judge memory | Runs |',
		'|---:|---:|---:|---:|---:|---:|---:|---:|',
		...summary.repeatSummaries.map(
			(row) =>
				`| ${row.repeat} | ${formatPercent(row.passRate)} | ${formatNullablePercent(row.answerPassRate)} | ${formatNullablePercent(row.judgePassRate)} | ${formatNullablePercent(row.judgeAnswerPassRate)} | ${formatNullablePercent(row.judgeProfilePassRate)} | ${formatNullablePercent(row.judgeMemoryPassRate)} | ${row.runs} |`,
		),
		'',
		'## Failure Examples',
		'',
		failures.length === 0
			? 'No failures.'
			: failures
					.flatMap((result) => [
						`### ${result.scenario.id}`,
						'',
						...result.score.checks
							.filter((check) => !check.passed)
							.map((check) => `- ${check.name}: ${check.detail}`),
						result.judgeScore
							? `- judge: ${result.judgeScore.pass ? 'pass' : 'fail'} (${result.judgeScore.failureMode}) ${result.judgeScore.reasoning}`
							: '',
						result.error ? `- harness error: ${result.error}` : '',
						'',
						'Answer:',
						'',
						blockquote(result.recallTurn.answer || '(empty)'),
						'',
					])
					.filter((line) => line !== '')
					.join('\n'),
		'',
	].join('\n');
}

function formatPercent(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}

function formatNullablePercent(value: number | null): string {
	return value === null ? 'n/a' : formatPercent(value);
}

function formatStats(stats: RateStats): string {
	if (stats.mean === null || stats.stdDev === null) return 'n/a';
	return `${formatPercent(stats.mean)} ± ${formatPercent(stats.stdDev)}`;
}

function formatMs(value: number | null): string {
	return value === null ? 'n/a' : `${Math.round(value)} ms`;
}

function formatInteger(value: number): string {
	return new Intl.NumberFormat('en-US').format(value);
}

function formatCost(value: number): string {
	return `$${value.toFixed(4)}`;
}

function formatTimestamp(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return value.replace(/\.\d{3}Z$/, 'Z').replace('T', ' ');
}

function blockquote(value: string): string {
	return value
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n');
}

function renderHtmlSummary(summary: Summary, results: ScenarioRunResult[]): string {
	return [
		'<!doctype html>',
		'<html lang="en">',
		'<head>',
		'<meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width, initial-scale=1">',
		'<title>n8n Memory Eval Report</title>',
		'<style>',
		renderHtmlStyles(),
		'</style>',
		'</head>',
		'<body>',
		'<main>',
		renderHtmlHeader(summary),
		renderHtmlMetricCards(summary),
		renderHtmlCategoryBreakdown(summary),
		renderHtmlOutcomeSections(summary, results),
		renderHtmlFailureExamples(results),
		'</main>',
		'</body>',
		'</html>',
	].join('\n');
}

function renderHtmlStyles(): string {
	return `
:root {
	color-scheme: light;
	--bg: #f7f8fb;
	--panel: #ffffff;
	--text: #1f2430;
	--muted: #667085;
	--border: #d9dee8;
	--accent: #ff6d5a;
	--accent-dark: #c43f2f;
	--ok: #0f7b5f;
	--warn: #9a5b00;
	--bad: #b42318;
	--code: #f1f3f7;
}
* { box-sizing: border-box; }
body {
	margin: 0;
	background: var(--bg);
	color: var(--text);
	font: 14px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
main { max-width: 1240px; margin: 0 auto; padding: 32px 24px 56px; }
h1, h2, h3 { margin: 0; line-height: 1.2; }
h1 { font-size: 30px; letter-spacing: 0; }
h2 { margin-top: 28px; font-size: 20px; }
h3 { font-size: 15px; }
p { margin: 8px 0 0; }
.hero {
	border: 1px solid var(--border);
	border-top: 4px solid var(--accent);
	background: var(--panel);
	padding: 24px;
	border-radius: 8px;
}
.meta {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
	gap: 10px;
	margin-top: 18px;
}
.meta-item, .card, .callout, .example {
	border: 1px solid var(--border);
	background: var(--panel);
	border-radius: 8px;
}
.meta-item {
	padding: 10px 12px;
	background: #fbfcfe;
	min-width: 0;
}
.label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
.value { margin-top: 3px; font-weight: 650; overflow-wrap: anywhere; }
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	gap: 12px;
	margin-top: 14px;
}
.card { padding: 14px; min-height: 112px; }
.metric { margin-top: 8px; font-size: 25px; font-weight: 720; }
.sub { color: var(--muted); margin-top: 4px; font-size: 13px; }
.section-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 14px;
	margin-top: 14px;
}
.callout { padding: 16px; }
.callout ul { margin: 10px 0 0; padding-left: 18px; }
.callout li { margin: 6px 0; }
.ok { color: var(--ok); }
.warn { color: var(--warn); }
.bad { color: var(--bad); }
table {
	width: 100%;
	border-collapse: collapse;
	margin-top: 14px;
	border: 1px solid var(--border);
	background: var(--panel);
	border-radius: 8px;
	overflow: hidden;
}
.table-wrap {
	overflow-x: auto;
	margin-top: 14px;
	border: 1px solid var(--border);
	border-radius: 8px;
	background: var(--panel);
}
.table-wrap table {
	min-width: 760px;
	margin-top: 0;
	border: 0;
}
th, td { padding: 9px 10px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; background: #fbfcfe; }
td.number, th.number { text-align: right; font-variant-numeric: tabular-nums; }
tr:last-child td { border-bottom: 0; }
.pill {
	display: inline-block;
	padding: 2px 7px;
	border: 1px solid var(--border);
	border-radius: 999px;
	background: #fbfcfe;
	font-size: 12px;
	color: var(--muted);
}
.examples { display: grid; gap: 14px; margin-top: 14px; }
.example { padding: 16px; }
.example-header {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 12px;
}
details {
	border-top: 1px solid var(--border);
	padding-top: 10px;
	margin-top: 10px;
}
summary { cursor: pointer; font-weight: 650; }
pre {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	background: var(--code);
	border: 1px solid var(--border);
	border-radius: 6px;
	padding: 10px;
	max-height: 360px;
	overflow: auto;
	font-size: 12px;
}
code { background: var(--code); padding: 1px 4px; border-radius: 4px; }
@media (max-width: 700px) {
	main { padding: 24px 14px 44px; }
	.hero { padding: 20px; }
	h1 { font-size: 28px; }
	.meta { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
	.grid { grid-template-columns: 1fr; }
	.meta-item, .card, .callout, .example { padding: 12px; }
	.metric { font-size: 22px; }
}
@media print {
	body { background: #fff; }
	main { max-width: none; padding: 0; }
	.card, .callout, .example, .hero, table { break-inside: avoid; }
}
`;
}

function renderHtmlHeader(summary: Summary): string {
	const modelConfig = summary.modelConfig;
	return [
		'<section class="hero">',
		'<h1>n8n Memory Eval Report</h1>',
		'<p class="sub">Deterministic scoring and LLM judge scoring averaged across repeats.</p>',
		'<div class="meta">',
		renderMetaItem('Suite', summary.suite),
		renderMetaItem('Commit', summary.commit),
		renderMetaItem('Generated', formatTimestamp(summary.generatedAt)),
		renderMetaItem('Repeats', String(summary.repeats)),
		renderMetaItem('Scenarios', String(summary.scenarios)),
		renderMetaItem('Total runs', String(summary.totalRuns)),
		renderMetaItem('Agent model', modelConfig.agentModel),
		renderMetaItem('Judge model', modelConfig.judgeModel),
		renderMetaItem('Embedding model', modelConfig.embeddingModel),
		renderMetaItem(
			'Retrieval config',
			`autoInjectTopK=${modelConfig.autoInjectTopK}; recallTopK=${modelConfig.recallTopK}`,
		),
		'</div>',
		'</section>',
	].join('\n');
}

function renderMetaItem(label: string, value: string): string {
	return `<div class="meta-item"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`;
}

function renderHtmlMetricCards(summary: Summary): string {
	return [
		'<section>',
		'<h2>TL;DR</h2>',
		'<div class="grid">',
		renderMetricCard(
			'Deterministic pass',
			formatStats(summary.repeatStats.passRate),
			`${summary.passed}/${summary.totalRuns} pooled`,
		),
		renderMetricCard(
			'Judge pass',
			formatStats(summary.repeatStats.judgePassRate),
			`${formatNullablePercent(summary.judgePassRate)} pooled`,
		),
		renderMetricCard(
			'Answer pass',
			formatStats(summary.repeatStats.answerPassRate),
			`${formatNullablePercent(summary.answerPassRate)} pooled`,
		),
		renderMetricCard(
			'Judge answer',
			formatStats(summary.repeatStats.judgeAnswerPassRate),
			`${formatNullablePercent(summary.judgeAnswerPassRate)} pooled`,
		),
		renderMetricCard(
			'Judge profile',
			formatStats(summary.repeatStats.judgeProfilePassRate),
			`${formatNullablePercent(summary.judgeProfilePassRate)} pooled`,
		),
		renderMetricCard(
			'Judge memory',
			formatStats(summary.repeatStats.judgeMemoryPassRate),
			`${formatNullablePercent(summary.judgeMemoryPassRate)} pooled`,
		),
		renderMetricCard(
			'Retrieval top-k',
			`${formatNullablePercent(summary.retrievalTop1Rate)} / ${formatNullablePercent(summary.retrievalTop3Rate)} / ${formatNullablePercent(summary.retrievalTop12Rate)}`,
			'top-1 / top-3 / top-12',
		),
		renderMetricCard(
			'Errors',
			`${summary.scopeLeakCount} / ${summary.backgroundErrorCount} / ${summary.harnessErrorCount}`,
			'scope leaks / background / harness',
		),
		renderMetricCard(
			'Tokens and cost',
			formatInteger(summary.totalTokens),
			`${formatInteger(summary.totalPromptTokens)} prompt; ${formatInteger(summary.totalCompletionTokens)} completion; ${formatCost(summary.totalKnownCostUsd)}`,
		),
		renderMetricCard(
			'Retrieval latency',
			`${formatMs(summary.retrievalLatencyMeanMs)} / ${formatMs(summary.retrievalLatencyP95Ms)}`,
			'mean / p95',
		),
		'</div>',
		'</section>',
	].join('\n');
}

function renderMetricCard(title: string, metric: string, sub: string): string {
	return [
		'<article class="card">',
		`<div class="label">${escapeHtml(title)}</div>`,
		`<div class="metric">${escapeHtml(metric)}</div>`,
		`<div class="sub">${escapeHtml(sub)}</div>`,
		'</article>',
	].join('\n');
}

function renderHtmlCategoryBreakdown(summary: Summary): string {
	return [
		'<section>',
		'<h2>Category Breakdown</h2>',
		'<div class="table-wrap">',
		'<table>',
		'<thead><tr><th>Category</th><th class="number">Scenarios</th><th class="number">Runs</th><th class="number">Deterministic mean/std-dev</th><th class="number">Judge mean/std-dev</th><th class="number">Answer mean/std-dev</th></tr></thead>',
		'<tbody>',
		...summary.categoryRepeatStats.map(
			(row) =>
				`<tr><td>${escapeHtml(row.category)}</td><td class="number">${row.scenarios}</td><td class="number">${row.runs}</td><td class="number">${escapeHtml(formatStats(row.passRate))}</td><td class="number">${escapeHtml(formatStats(row.judgePassRate))}</td><td class="number">${escapeHtml(formatStats(row.answerPassRate))}</td></tr>`,
		),
		'</tbody>',
		'</table>',
		'</div>',
		'</section>',
	].join('\n');
}

function renderHtmlOutcomeSections(summary: Summary, results: ScenarioRunResult[]): string {
	return [
		'<section>',
		'<div class="section-grid">',
		renderCallout('What went well', renderWentWellItems(summary)),
		renderCallout('Weaknesses', renderWeaknessItems(summary, results)),
		renderCallout('Recommended follow-ups', renderFollowUpItems(summary, results)),
		'</div>',
		'</section>',
	].join('\n');
}

function renderCallout(title: string, items: string[]): string {
	const body =
		items.length > 0
			? `<ul>${items.map((item) => `<li>${item}</li>`).join('\n')}</ul>`
			: '<p class="sub">No callouts.</p>';
	return `<article class="callout"><h2>${escapeHtml(title)}</h2>${body}</article>`;
}

function renderWentWellItems(summary: Summary): string[] {
	const items: string[] = [];
	const judgeStrong = summary.categoryRepeatStats.filter(
		(row) => row.judgePassRate.mean !== null && row.judgePassRate.mean >= 0.8,
	);
	const deterministicStrong = summary.categoryRepeatStats.filter(
		(row) => row.passRate.mean !== null && row.passRate.mean >= 0.8,
	);
	if (judgeStrong.length > 0) {
		items.push(
			`<span class="ok">Judge pass above 80%</span>: ${escapeHtml(formatCategoryStats(judgeStrong, 'judgePassRate'))}`,
		);
	}
	if (deterministicStrong.length > 0) {
		items.push(
			`<span class="ok">Deterministic pass above 80%</span>: ${escapeHtml(formatCategoryStats(deterministicStrong, 'passRate'))}`,
		);
	}
	if (summary.scopeLeakCount === 0) {
		items.push('<span class="ok">Zero scope leaks</span> across the run.');
	}
	if (summary.harnessErrorCount === 0) {
		items.push(
			'<span class="ok">No harness errors</span>; failures are eval/runtime behavior, not runner crashes.',
		);
	} else if (summary.harnessErrorCount / summary.totalRuns <= 0.01) {
		items.push(
			`<span class="warn">Low harness error rate</span>: ${summary.harnessErrorCount}/${summary.totalRuns} runs.`,
		);
	}
	return items;
}

function renderWeaknessItems(summary: Summary, results: ScenarioRunResult[]): string[] {
	const items: string[] = [];
	const weakJudge = summary.categoryRepeatStats.filter(
		(row) => row.judgePassRate.mean !== null && row.judgePassRate.mean < 0.7,
	);
	const weakDeterministic = summary.categoryRepeatStats.filter(
		(row) => row.passRate.mean !== null && row.passRate.mean < 0.7,
	);
	if (weakJudge.length > 0) {
		items.push(
			`<span class="bad">Judge pass below 70%</span>: ${escapeHtml(formatCategoryStats(weakJudge, 'judgePassRate'))}`,
		);
	}
	if (weakDeterministic.length > 0) {
		items.push(
			`<span class="bad">Deterministic pass below 70%</span>: ${escapeHtml(formatCategoryStats(weakDeterministic, 'passRate'))}`,
		);
	}

	const failureModes = countJudgeFailureModes(results).filter((row) => row.count > 1);
	if (failureModes.length > 0) {
		items.push(
			`Repeated judge failure modes: ${escapeHtml(failureModes.map((row) => `${row.name} (${row.count})`).join(', '))}.`,
		);
	}

	const failedChecks = countFailedChecks(results).slice(0, 5);
	if (failedChecks.length > 0) {
		items.push(
			`Top failed deterministic checks: ${escapeHtml(failedChecks.map((row) => `${row.name} (${row.count})`).join(', '))}.`,
		);
	}
	return items;
}

function renderFollowUpItems(summary: Summary, results: ScenarioRunResult[]): string[] {
	const items: string[] = [];
	const weakCategories = summary.categoryRepeatStats.filter(
		(row) =>
			(row.judgePassRate.mean !== null && row.judgePassRate.mean < 0.7) ||
			(row.passRate.mean !== null && row.passRate.mean < 0.7),
	);
	if (weakCategories.length > 0) {
		items.push(
			`Start with low-scoring categories: ${escapeHtml(weakCategories.map((row) => row.category).join(', '))}.`,
		);
	}

	const topFailureMode = countJudgeFailureModes(results)[0];
	if (topFailureMode) {
		items.push(
			`Review examples with failure mode <code>${escapeHtml(topFailureMode.name)}</code> before changing prompts or thresholds.`,
		);
	}

	const topCheck = countFailedChecks(results)[0];
	if (topCheck) {
		items.push(
			`Audit deterministic expectation <code>${escapeHtml(topCheck.name)}</code> against judge reasoning to separate real misses from brittle anchors.`,
		);
	}

	if (
		summary.scopeLeakCount > 0 ||
		summary.harnessErrorCount > 0 ||
		summary.backgroundErrorCount > 0
	) {
		items.push('Resolve leakage and runner/runtime errors before comparing model-quality changes.');
	}
	return items;
}

function formatCategoryStats(
	rows: CategoryRepeatStats[],
	key: 'passRate' | 'judgePassRate',
): string {
	return rows.map((row) => `${row.category} ${formatStats(row[key])}`).join(', ');
}

function countJudgeFailureModes(
	results: ScenarioRunResult[],
): Array<{ name: string; count: number }> {
	const counts = new Map<string, number>();
	for (const result of results) {
		if (!result.judgeScore || result.judgeScore.pass) continue;
		counts.set(result.judgeScore.failureMode, (counts.get(result.judgeScore.failureMode) ?? 0) + 1);
	}
	return sortCounts(counts);
}

function countFailedChecks(results: ScenarioRunResult[]): Array<{ name: string; count: number }> {
	const counts = new Map<string, number>();
	for (const result of results) {
		for (const check of result.score.checks) {
			if (check.passed) continue;
			counts.set(check.name, (counts.get(check.name) ?? 0) + 1);
		}
	}
	return sortCounts(counts);
}

function sortCounts(counts: Map<string, number>): Array<{ name: string; count: number }> {
	return [...counts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function renderHtmlFailureExamples(results: ScenarioRunResult[]): string {
	const examples = selectFailureExamples(results);
	if (examples.length === 0) {
		return [
			'<section>',
			'<h2>Failure Examples</h2>',
			'<article class="callout"><p>No failures.</p></article>',
			'</section>',
		].join('\n');
	}

	const grouped = groupByCategory(examples);
	return [
		'<section>',
		'<h2>Failure Examples</h2>',
		'<p class="sub">The 10 highest-signal failed runs, grouped by category.</p>',
		...grouped.map(([category, rows]) =>
			[
				`<h3>${escapeHtml(category)}</h3>`,
				'<div class="examples">',
				...rows.map(renderFailureExample),
				'</div>',
			].join('\n'),
		),
		'</section>',
	].join('\n');
}

function selectFailureExamples(results: ScenarioRunResult[]): ScenarioRunResult[] {
	return results
		.filter(
			(result) =>
				result.error !== undefined || !result.score.passed || result.judgeScore?.pass === false,
		)
		.sort((a, b) => failureUsefulnessScore(b) - failureUsefulnessScore(a))
		.slice(0, 10);
}

function failureUsefulnessScore(result: ScenarioRunResult): number {
	const failedChecks = result.score.checks.filter((check) => !check.passed).length;
	return (
		(result.error ? 100 : 0) +
		(result.judgeScore?.pass === false ? 50 : 0) +
		(!result.score.passed ? 20 : 0) +
		failedChecks
	);
}

function groupByCategory(
	results: ScenarioRunResult[],
): Array<[MemoryEvalCategory, ScenarioRunResult[]]> {
	const grouped = new Map<MemoryEvalCategory, ScenarioRunResult[]>();
	for (const result of results) {
		const category = result.scenario.category;
		const rows = grouped.get(category) ?? [];
		rows.push(result);
		grouped.set(category, rows);
	}
	return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function renderFailureExample(result: ScenarioRunResult): string {
	const failedChecks = result.score.checks.filter((check) => !check.passed);
	const judge = result.judgeScore;
	const retrieved = result.retrieval.entries.map(
		(entry, index) => `${index + 1}. score=${entry.finalScore.toFixed(4)}\n${entry.content}`,
	);
	const stored = result.storedEntries.map((entry, index) => `${index + 1}. ${entry}`);
	return [
		'<article class="example">',
		'<div class="example-header">',
		`<div><h3>${escapeHtml(result.scenario.id)}: ${escapeHtml(result.scenario.title)}</h3><div class="sub">repeat ${result.repeat}; category ${escapeHtml(result.scenario.category)}</div></div>`,
		`<span class="pill">${escapeHtml(result.passed ? 'deterministic pass' : 'deterministic miss')}</span>`,
		'</div>',
		result.error
			? `<p class="bad"><strong>Harness error:</strong> ${escapeHtml(result.error)}</p>`
			: '',
		'<details>',
		'<summary>Deterministic misses</summary>',
		failedChecks.length > 0
			? `<ul>${failedChecks.map((check) => `<li><strong>${escapeHtml(check.name)}</strong>: ${escapeHtml(check.detail)}</li>`).join('\n')}</ul>`
			: '<p class="sub">No deterministic misses.</p>',
		'</details>',
		'<details>',
		'<summary>Judge verdict</summary>',
		judge
			? `<p><strong>${judge.pass ? '<span class="ok">pass</span>' : '<span class="bad">fail</span>'}</strong> <span class="pill">${escapeHtml(judge.failureMode)}</span></p><p>${escapeHtml(judge.reasoning)}</p>`
			: '<p class="sub">No judge score.</p>',
		'</details>',
		renderPreDetails('Final answer', result.recallTurn.answer || '(empty)'),
		renderPreDetails('Retrieved entries', retrieved.length > 0 ? retrieved.join('\n\n') : '(none)'),
		renderPreDetails('Stored episodic entries', stored.length > 0 ? stored.join('\n\n') : '(none)'),
		'</article>',
	]
		.filter((line) => line !== '')
		.join('\n');
}

function renderPreDetails(title: string, value: string): string {
	return [
		'<details>',
		`<summary>${escapeHtml(title)}</summary>`,
		`<pre>${escapeHtml(value)}</pre>`,
		'</details>',
	].join('\n');
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

async function getCommit(): Promise<string> {
	const { execFile } = await import('child_process');
	return await new Promise((resolve) => {
		execFile('git', ['rev-parse', '--short', 'HEAD'], (error, stdout) => {
			if (error) {
				resolve('unknown');
				return;
			}
			resolve(stdout.trim());
		});
	});
}

function printSummary(summary: Summary): void {
	console.log('');
	console.log('n8n memory eval summary');
	console.log(
		`suite=${summary.suite} runs=${summary.totalRuns} pass=${formatPercent(summary.passRate)}`,
	);
	console.log(
		`answer=${formatNullablePercent(summary.answerPassRate)} retrieval@1=${formatNullablePercent(summary.retrievalTop1Rate)} retrieval@3=${formatNullablePercent(summary.retrievalTop3Rate)} retrieval@12=${formatNullablePercent(summary.retrievalTop12Rate)}`,
	);
	console.log(
		`judge=${formatNullablePercent(summary.judgePassRate)} judgeAnswer=${formatNullablePercent(summary.judgeAnswerPassRate)} judgeProfile=${formatNullablePercent(summary.judgeProfilePassRate)} judgeMemory=${formatNullablePercent(summary.judgeMemoryPassRate)}`,
	);
	console.log(
		`repeatMean=${formatStats(summary.repeatStats.passRate)} judgeRepeatMean=${formatStats(summary.repeatStats.judgePassRate)}`,
	);
	console.log(
		`tokens=${summary.totalTokens} cost=$${summary.totalKnownCostUsd.toFixed(4)} retrievalMean=${formatMs(summary.retrievalLatencyMeanMs)} retrievalP95=${formatMs(summary.retrievalLatencyP95Ms)}`,
	);
	for (const row of summary.categorySummaries) {
		console.log(
			`${row.category}: ${formatPercent(row.passRate)} (${row.passed}/${row.scenarios}) answer=${formatNullablePercent(row.answerPassRate)} judge=${formatNullablePercent(row.judgePassRate)}`,
		);
	}
}

function enforceThresholds(summary: Summary): void {
	const failures: string[] = [];
	if (summary.passRate < 0.7) failures.push(`pass rate ${formatPercent(summary.passRate)} < 70%`);
	if (summary.answerPassRate !== null && summary.answerPassRate < 0.7) {
		failures.push(`answer pass rate ${formatPercent(summary.answerPassRate)} < 70%`);
	}
	if (summary.scopeLeakCount > 0) failures.push(`scope leaks: ${summary.scopeLeakCount}`);
	if (summary.harnessErrorCount > 0) failures.push(`harness errors: ${summary.harnessErrorCount}`);
	if (failures.length > 0) {
		throw new Error(`Threshold enforcement failed:\n- ${failures.join('\n- ')}`);
	}
}

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));
	const validationErrors = validateScenarios();
	if (validationErrors.length > 0) {
		throw new Error(`Scenario validation failed:\n- ${validationErrors.join('\n- ')}`);
	}
	if (opts.validateOnly) {
		console.log(`Validated ${MEMORY_EVAL_SCENARIOS.length} memory eval scenarios.`);
		return;
	}

	const scenarios = selectScenarios(opts);
	if (scenarios.length === 0) {
		throw new Error('No scenarios selected.');
	}

	const config = requireEvalConfig(opts);
	const generatedAt = new Date().toISOString();
	const commit = await getCommit();
	const jobs = createEvalJobs(scenarios, opts.repeats);
	const results = await runEvalJobs(jobs, opts, config);

	const summary = buildSummary(opts, results, config, commit, generatedAt);
	const resultDir = await writeResults(results, summary, generatedAt);
	printSummary(summary);
	console.log(`results=${resultDir}`);

	if (opts.enforceThresholds) {
		enforceThresholds(summary);
	}
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exitCode = 1;
});
