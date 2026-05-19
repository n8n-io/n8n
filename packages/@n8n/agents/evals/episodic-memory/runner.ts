import {
	buildAggregateScorecard,
	buildMarkdownReport,
	type EpisodicEvalArtifacts,
	writeEvalArtifacts,
} from './artifacts';
import { getScenariosForPreset } from './fixtures';
import { InspectableInMemoryMemory } from './inspectable-memory';
import { judgeScenario } from './judge';
import { aggregateScorecard, classifyRecallFailure, computeDeterministicMetrics } from './scoring';
import type {
	EpisodicEvalEntry,
	EpisodicEvalFailureKind,
	EpisodicEvalFinalAnswer,
	EpisodicEvalRecallEntry,
	EpisodicEvalRecallResult,
	EpisodicEvalScenarioResult,
	EpisodicMemoryScenario,
	FactAssertion,
	RecallAssertion,
} from './types';
import {
	createObservationLogThreadScopeId,
	RECALL_MEMORY_TOOL_NAME,
	type EpisodicMemoryScope,
	type GenerateResult,
} from '../../src';
import { Agent } from '../../src/sdk/agent';
import { Memory } from '../../src/sdk/memory';
import { filterLlmMessages } from '../../src/sdk/message';
import type { ObservationLogEntry } from '../../src/types';

export interface EpisodicEvalRunOptions {
	preset: 'smoke' | 'golden';
	outputDir: string;
	model: string;
	judgeEnabled: boolean;
	judgeModel: string;
}

interface ScenarioRuntime {
	agent: Agent;
	memory: InspectableInMemoryMemory;
	agentId: string;
	resourceId: string;
	scope: EpisodicMemoryScope;
}

export async function runEpisodicMemoryEval(
	options: EpisodicEvalRunOptions,
): Promise<EpisodicEvalArtifacts> {
	const scenarios = getScenariosForPreset(options.preset);
	const results: EpisodicEvalScenarioResult[] = [];

	for (const scenario of scenarios) {
		results.push(await runScenario(scenario, options));
	}

	const artifacts: EpisodicEvalArtifacts = {
		results,
		entries: results.flatMap((result) =>
			result.entries.map((entry) => ({ scenarioId: result.scenarioId, ...entry })),
		),
		sources: results.flatMap((result) =>
			result.entries.flatMap((entry) =>
				entry.sources.map((source) => ({
					scenarioId: result.scenarioId,
					memoryEntryId: entry.id,
					...source,
				})),
			),
		),
		recalls: results.flatMap((result) =>
			result.recalls.map((recall) => ({ scenarioId: result.scenarioId, ...recall })),
		),
		answers: results.flatMap((result) =>
			result.finalAnswers.map((answer) => ({ scenarioId: result.scenarioId, ...answer })),
		),
		scorecard: buildAggregateScorecard(results),
		report: buildMarkdownReport(results),
	};
	await writeEvalArtifacts(options.outputDir, artifacts);
	return artifacts;
}

async function runScenario(
	scenario: EpisodicMemoryScenario,
	options: EpisodicEvalRunOptions,
): Promise<EpisodicEvalScenarioResult> {
	const runtime = createScenarioRuntime(scenario.id, options.model);
	try {
		for (const thread of scenario.threads) {
			await runThread(runtime, thread.id, runtime.resourceId, thread.prompts);
		}
		for (const isolatedThread of scenario.isolatedThreads ?? []) {
			await runThread(
				runtime,
				isolatedThread.id,
				isolatedThread.resourceId,
				isolatedThread.prompts,
			);
		}

		const recalls = await runRecallQueries(runtime, scenario);
		const finalAnswers = await runFinalQuestions(runtime, scenario);
		await runtime.agent.close();

		const entries = runtime.memory.getEvalEntries(runtime.scope);
		const metrics = computeDeterministicMetrics({ scenario, entries, recalls, finalAnswers });
		const judgeScores = options.judgeEnabled
			? await judgeScenario({
					model: options.judgeModel,
					scenario,
					entries,
					recalls,
					finalAnswers,
				})
			: undefined;
		const scorecard = aggregateScorecard({ deterministic: metrics, judge: judgeScores });
		const observations = await collectActiveObservations(runtime, scenario);
		const failures = collectFailures({ scenario, entries, recalls, observations });

		return {
			scenarioId: scenario.id,
			scenarioName: scenario.name,
			entries,
			recalls,
			finalAnswers,
			scorecard,
			failures,
		};
	} finally {
		await runtime.agent.close();
	}
}

function createScenarioRuntime(scenarioId: string, model: string): ScenarioRuntime {
	const memory = new InspectableInMemoryMemory();
	const agentId = `em-eval-${scenarioId}`;
	const resourceId = `resource-${scenarioId}`;
	const agent = new Agent(`em-eval-${scenarioId}`)
		.model(model)
		.instructions(
			[
				'You are a careful assistant in an episodic-memory evaluation.',
				'For explicit questions about prior conversations, prior decisions, remembered details, exact artifacts, or historical cases, use recall_memory.',
				'Frame recall_memory results as prior or historical context, not as current-thread truth.',
			].join('\n'),
		)
		.memory(
			new Memory()
				.storage(memory)
				.lastMessages(8)
				.observationalMemory({
					observerThresholdTokens: 500,
					reflectorThresholdTokens: 4000,
					renderTokenBudget: 4500,
					observationLogTailLimit: 20,
				})
				.episodicMemory({
					enabled: true,
					topK: 5,
					maxEntriesPerRun: 8,
				}),
		);
	return { agent, memory, agentId, resourceId, scope: { agentId, resourceId } };
}

async function runThread(
	runtime: ScenarioRuntime,
	threadId: string,
	resourceId: string,
	prompts: string[],
): Promise<void> {
	for (const prompt of prompts) {
		await runtime.agent
			.generate(prompt, {
				persistence: {
					threadId,
					resourceId,
					agentId: runtime.agentId,
					episodicMemoryResourceId: resourceId,
				},
			})
			.then(assertGenerateSucceeded);
		await runtime.agent.close();
	}
}

async function runRecallQueries(
	runtime: ScenarioRuntime,
	scenario: EpisodicMemoryScenario,
): Promise<EpisodicEvalRecallResult[]> {
	const recalls: EpisodicEvalRecallResult[] = [];
	for (const query of scenario.recallQueries) {
		const result = await runtime.agent.generate(query.prompt, {
			persistence: {
				threadId: `${scenario.id}-recall-${query.id}`,
				resourceId: runtime.resourceId,
				agentId: runtime.agentId,
				episodicMemoryResourceId: runtime.resourceId,
			},
		});
		assertGenerateSucceeded(result);
		recalls.push(toRecallResult(query, result));
		await runtime.agent.close();
	}
	return recalls;
}

async function runFinalQuestions(
	runtime: ScenarioRuntime,
	scenario: EpisodicMemoryScenario,
): Promise<EpisodicEvalFinalAnswer[]> {
	const answers: EpisodicEvalFinalAnswer[] = [];
	for (const question of scenario.finalQuestions) {
		const result = await runtime.agent.generate(question.prompt, {
			persistence: {
				threadId: `${scenario.id}-final-${question.id}`,
				resourceId: runtime.resourceId,
				agentId: runtime.agentId,
				episodicMemoryResourceId: runtime.resourceId,
			},
		});
		assertGenerateSucceeded(result);
		answers.push({ id: question.id, prompt: question.prompt, answer: extractText(result) });
		await runtime.agent.close();
	}
	return answers;
}

function toRecallResult(query: RecallAssertion, result: GenerateResult): EpisodicEvalRecallResult {
	const recallCall = result.toolCalls?.find(
		(toolCall) => toolCall.tool === RECALL_MEMORY_TOOL_NAME,
	);
	return {
		id: query.id,
		prompt: query.prompt,
		shouldCallRecallMemory: query.shouldCallRecallMemory,
		toolCalled: recallCall !== undefined,
		results: recallCall ? parseRecallEntries(recallCall.output) : [],
		answer: extractText(result),
	};
}

function assertGenerateSucceeded(result: GenerateResult): void {
	if (!result.error) return;
	const message = formatUnknownError(result.error);
	throw new Error(`Agent generation failed: ${message}`);
}

function formatUnknownError(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	try {
		return JSON.stringify(error);
	} catch {
		return 'Unknown error';
	}
}

function parseRecallEntries(output: unknown): EpisodicEvalRecallEntry[] {
	if (!isRecord(output) || !Array.isArray(output.entries)) return [];
	return output.entries.flatMap((entry) => {
		if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.content !== 'string') {
			return [];
		}
		return [
			{
				entryId: entry.id,
				content: entry.content,
				...(typeof entry.finalScore === 'number' ? { score: entry.finalScore } : {}),
			},
		];
	});
}

async function collectActiveObservations(
	runtime: ScenarioRuntime,
	scenario: EpisodicMemoryScenario,
): Promise<ObservationLogEntry[]> {
	const observations: ObservationLogEntry[] = [];
	for (const thread of scenario.threads) {
		observations.push(
			...(await runtime.memory.getActiveObservationLog({
				scopeKind: 'thread',
				scopeId: createObservationLogThreadScopeId(thread.id, runtime.resourceId),
			})),
		);
	}
	return observations;
}

function collectFailures(input: {
	scenario: EpisodicMemoryScenario;
	entries: EpisodicEvalEntry[];
	recalls: EpisodicEvalRecallResult[];
	observations: ObservationLogEntry[];
}): Array<{ kind: EpisodicEvalFailureKind; message: string }> {
	const failures: Array<{ kind: EpisodicEvalFailureKind; message: string }> = [];
	for (const assertion of input.scenario.expectedActiveEpisodes) {
		const entryActive = input.entries.some(
			(entry) => entry.status === 'active' && matchesFact(entry.content, assertion),
		);
		if (entryActive) continue;
		const observationActive = input.observations.some((observation) =>
			matchesFact(observation.text, assertion),
		);
		failures.push({
			kind: classifyRecallFailure({
				toolCalled: true,
				shouldCallRecallMemory: true,
				expectedEntryActive: entryActive,
				expectedObservationActive: observationActive,
			}),
			message: `Missing active episode: ${assertion.description}`,
		});
	}
	for (const staleFact of input.scenario.staleFacts) {
		if (
			input.entries.some(
				(entry) => entry.status === 'active' && matchesFact(entry.content, staleFact),
			)
		) {
			failures.push({
				kind: 'em_reflection',
				message: `Stale fact remained active: ${staleFact.description}`,
			});
		}
	}
	for (const recall of input.recalls) {
		const query = input.scenario.recallQueries.find((candidate) => candidate.id === recall.id);
		if (!query) continue;
		if (query.shouldCallRecallMemory !== recall.toolCalled) {
			failures.push({
				kind: 'tool_policy',
				message: `Recall tool policy mismatch for ${query.id}`,
			});
		}
		if (
			query.expectedFacts.length > 0 &&
			!query.expectedFacts.some((factId) => {
				const assertion = findFactAssertion(input.scenario, factId);
				return assertion
					? recall.results.some((entry) => matchesFact(entry.content, assertion))
					: false;
			})
		) {
			failures.push({
				kind: 'retrieval',
				message: `Recall query missed expected facts: ${query.id}`,
			});
		}
	}
	return failures;
}

function findFactAssertion(
	scenario: EpisodicMemoryScenario,
	factId: string,
): FactAssertion | undefined {
	return [
		...scenario.expectedActiveEpisodes,
		...scenario.staleFacts,
		...scenario.forbiddenFacts,
	].find((assertion) => assertion.id === factId);
}

function matchesFact(content: string, assertion: FactAssertion): boolean {
	const haystack = content.toLocaleLowerCase();
	const all = assertion.match.all ?? [];
	if (all.some((needle) => !haystack.includes(needle.toLocaleLowerCase()))) return false;
	const oneOf = assertion.match.oneOf ?? [];
	if (oneOf.length > 0 && oneOf.every((needle) => !haystack.includes(needle.toLocaleLowerCase()))) {
		return false;
	}
	const regex = assertion.match.regex ?? [];
	return regex.every((pattern) => new RegExp(pattern, 'iu').test(content));
}

function extractText(result: GenerateResult): string {
	return filterLlmMessages(result.messages)
		.flatMap((message) => message.content)
		.flatMap((content) => (content.type === 'text' ? [content.text] : []))
		.join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
