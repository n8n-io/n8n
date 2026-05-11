import { embed } from 'ai';
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
	enforceThresholds: boolean;
	validateOnly: boolean;
}

interface EvalScope {
	agentId: string;
	resourceId: string;
}

interface EvalConfig {
	agentModel: string;
	anthropicApiKey: string;
	openAiApiKey: string;
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
	personaProfile: string;
	sessionMemory: string;
	backgroundErrors: Array<{ message: string; source?: string }>;
	error?: string;
}

interface Summary {
	suite: MemoryEvalSuite;
	generatedAt: string;
	commit: string;
	scenarios: number;
	repeats: number;
	totalRuns: number;
	passed: number;
	passRate: number;
	answerPassRate: number | null;
	retrievalTop1Rate: number | null;
	retrievalTop3Rate: number | null;
	retrievalTop12Rate: number | null;
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
	categorySummaries: CategorySummary[];
}

function parseArgs(argv: string[]): CliOptions {
	const opts: CliOptions = {
		suite: 'smoke',
		repeats: 1,
		enforceThresholds: false,
		validateOnly: false,
	};

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
		} else if (arg === '--enforce-thresholds') {
			opts.enforceThresholds = true;
		} else if (arg === '--validate-only') {
			opts.validateOnly = true;
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

	const envCategory = process.env.N8N_MEMORY_EVAL_CATEGORY;
	if (opts.category === undefined && envCategory) {
		opts.category = parseCategory(envCategory);
	}

	return opts;
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
		for (const thread of scenario.seedThreads) {
			if (thread.turns.length === 0) {
				errors.push(`${scenario.id}/${thread.id}: expected at least one turn`);
			}
		}
	}
	return errors;
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

function requireEvalConfig(): EvalConfig {
	const anthropicApiKey = process.env[ANTHROPIC_API_KEY_ENV];
	const openAiApiKey = process.env[OPENAI_API_KEY_ENV];
	if (!anthropicApiKey || !openAiApiKey) {
		throw new Error(
			`Set ${ANTHROPIC_API_KEY_ENV} and ${OPENAI_API_KEY_ENV} before running memory evals.`,
		);
	}

	return {
		agentModel: process.env.N8N_MEMORY_EVAL_AGENT_MODEL ?? DEFAULT_AGENT_MODEL,
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
		.profiles({ agentDescription: scenario.agentDescription })
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
		'Use <persona>, <user>, <memory>, and <session-memory> when they are present.',
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
			(await memory.getMemoryProfile({ scopeKind: 'resource', scopeId: defaultScope.resourceId }))
				?.content ?? '';
		const personaProfile =
			(await memory.getMemoryProfile({ scopeKind: 'agent', scopeId: defaultScope.agentId }))
				?.content ?? '';
		const sessionMemory = await getSessionMemory(memory, scenario, defaultScope.resourceId);

		const score = scoreScenario({
			scenario,
			entries: storedEntries,
			retrievedEntries: retrieval.entries.map((entry) => entry.content),
			answer: recallTurn.answer,
			userProfile,
			personaProfile,
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
			personaProfile,
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
			personaProfile: '',
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
			personaProfile: '',
			sessionMemory: '',
			backgroundErrors,
			error: message,
		};
	}
}

async function generateTurn(
	agent: Agent,
	user: string,
	persistence: { threadId: string; agentId: string; resourceId: string },
): Promise<TurnRecord> {
	const start = performance.now();
	const result = await agent.generate(user, { persistence, maxIterations: 6 });
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
	commit: string,
	generatedAt: string,
): Summary {
	const answered = results.filter((result) => result.score.answerPassed !== null);
	const top1 = results.filter((result) => result.score.retrievalTop1Hit !== null);
	const top3 = results.filter((result) => result.score.retrievalTop3Hit !== null);
	const top12 = results.filter((result) => result.score.retrievalTop12Hit !== null);
	const retrievalLatencies = results
		.map((result) => result.retrieval.latencyMs)
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

	return {
		suite: opts.suite,
		generatedAt,
		commit,
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
		categorySummaries: summarizeCategories(results),
	};
}

function rateFor(
	results: ScenarioRunResult[],
	key: 'retrievalTop1Hit' | 'retrievalTop3Hit' | 'retrievalTop12Hit',
): number | null {
	if (results.length === 0) return null;
	return ratio(results.filter((result) => result.score[key] === true).length, results.length);
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
		`- Scope leaks: ${summary.scopeLeakCount}`,
		`- Background errors: ${summary.backgroundErrorCount}`,
		`- Harness errors: ${summary.harnessErrorCount}`,
		`- Total tokens: ${summary.totalTokens} (${summary.totalPromptTokens} prompt, ${summary.totalCompletionTokens} completion)`,
		`- Known model cost: $${summary.totalKnownCostUsd.toFixed(4)}`,
		`- Retrieval latency mean/p95: ${formatMs(summary.retrievalLatencyMeanMs)} / ${formatMs(summary.retrievalLatencyP95Ms)}`,
		'',
		'## Categories',
		'',
		'| Category | Pass rate | Answer rate | Runs |',
		'|---|---:|---:|---:|',
		...summary.categorySummaries.map(
			(row) =>
				`| ${row.category} | ${formatPercent(row.passRate)} | ${formatNullablePercent(row.answerPassRate)} | ${row.scenarios} |`,
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

function formatMs(value: number | null): string {
	return value === null ? 'n/a' : `${Math.round(value)} ms`;
}

function blockquote(value: string): string {
	return value
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n');
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
		`tokens=${summary.totalTokens} cost=$${summary.totalKnownCostUsd.toFixed(4)} retrievalMean=${formatMs(summary.retrievalLatencyMeanMs)} retrievalP95=${formatMs(summary.retrievalLatencyP95Ms)}`,
	);
	for (const row of summary.categorySummaries) {
		console.log(
			`${row.category}: ${formatPercent(row.passRate)} (${row.passed}/${row.scenarios}) answer=${formatNullablePercent(row.answerPassRate)}`,
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

	const config = requireEvalConfig();
	const generatedAt = new Date().toISOString();
	const commit = await getCommit();
	const results: ScenarioRunResult[] = [];

	for (let repeat = 1; repeat <= opts.repeats; repeat++) {
		for (const scenario of scenarios) {
			console.log(`[${repeat}/${opts.repeats}] ${scenario.id}: ${scenario.title}`);
			const result = await runScenario(scenario, repeat, config);
			results.push(result);
			const status = result.passed ? 'pass' : 'miss';
			const toolUsed = result.recallTurn.toolCalls.includes(RECALL_MEMORY_TOOL_NAME);
			console.log(`  ${status}; recall_memory=${toolUsed ? 'yes' : 'no'}`);
		}
	}

	const summary = buildSummary(opts, results, commit, generatedAt);
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
