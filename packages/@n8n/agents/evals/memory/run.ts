import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { applyMemoryJudgeScore } from './judge';
import { memoryGoldenScenarios } from './scenarios';
import { scoreMemoryEval } from './scoring';
import type {
	AgentMemoryEvalRuntimeOptions,
	MemoryEvalFinalAnswer,
	MemoryEvalMetric,
	MemoryEvalObservation,
	MemoryEvalRunContext,
	MemoryEvalRunnerOptions,
	MemoryEvalRunResult,
	MemoryEvalScenario,
	MemoryEvalSuiteScenarioScore,
	MemoryEvalSuiteOptions,
	MemoryEvalSuiteResult,
	MemoryEvalTurnResult,
} from './types';
import type { AgentMessage, MessageContent } from '../../src/types/sdk/message';

function isTextContent(content: MessageContent): content is { type: 'text'; text: string } {
	return content.type === 'text';
}

function messageToText(message: AgentMessage): string {
	if (message.type === 'custom') return '';
	return message.content
		.filter(isTextContent)
		.map((content) => content.text)
		.join('\n');
}

function toEvalObservation(observation: {
	id: string;
	marker: MemoryEvalObservation['marker'];
	text: string;
	status: MemoryEvalObservation['status'];
	parentId: string | null;
	supersededBy: string | null;
	createdAt: Date;
}): MemoryEvalObservation {
	return {
		id: observation.id,
		marker: observation.marker,
		text: observation.text,
		status: observation.status,
		parentId: observation.parentId,
		supersededBy: observation.supersededBy,
		createdAt: observation.createdAt.toISOString(),
	};
}

function metricSummary(metric: MemoryEvalMetric) {
	const summary = {
		score: metric.score,
		numerator: metric.numerator,
		denominator: metric.denominator,
	};
	return metric.source ? { ...summary, source: metric.source } : summary;
}

function normalizeConcurrency(value: number | undefined): number {
	if (value === undefined) return 1;
	if (!Number.isFinite(value)) return 1;
	return Math.max(1, Math.floor(value));
}

async function mapWithConcurrency<TInput, TOutput>(
	items: TInput[],
	concurrency: number,
	mapper: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
	const results = new Array<TOutput>(items.length);
	let nextIndex = 0;

	async function worker() {
		while (nextIndex < items.length) {
			const currentIndex = nextIndex;
			nextIndex += 1;
			results[currentIndex] = await mapper(items[currentIndex], currentIndex);
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, async () => await worker()),
	);

	return results;
}

function summarizeScenarioScore(result: MemoryEvalRunResult): MemoryEvalSuiteScenarioScore {
	const observationCounts = {
		total: result.observations.length,
		active: result.observations.filter((observation) => observation.status === 'active').length,
		superseded: result.observations.filter((observation) => observation.status === 'superseded')
			.length,
		dropped: result.observations.filter((observation) => observation.status === 'dropped').length,
	};
	return {
		scenarioId: result.scenario.id,
		overall: result.scorecard.overall,
		metrics: {
			activeFactRecall: metricSummary(result.scorecard.metrics.activeFactRecall),
			activeFactPrecision: metricSummary(result.scorecard.metrics.activeFactPrecision),
			staleFactSuppression: metricSummary(result.scorecard.metrics.staleFactSuppression),
			exactIdentifierRecall: metricSummary(result.scorecard.metrics.exactIdentifierRecall),
			lifecycleAccuracy: metricSummary(result.scorecard.metrics.lifecycleAccuracy),
			contaminationRate: metricSummary(result.scorecard.metrics.contaminationRate),
			finalAnswerCorrectness: metricSummary(result.scorecard.metrics.finalAnswerCorrectness),
			answerFaithfulness: metricSummary(result.scorecard.metrics.answerFaithfulness),
		},
		observationCounts,
		...(result.scorecard.judge && {
			judge: {
				overall: result.scorecard.judge.overall,
				failures: result.scorecard.judge.failures,
			},
		}),
	};
}

export function createAgentMemoryEvalRuntime(options: AgentMemoryEvalRuntimeOptions) {
	return {
		async runUserTurn(input: string, _context: MemoryEvalRunContext): Promise<string> {
			const result = await options.agent.generate(input, options.runOptions);
			return result.messages.map(messageToText).filter(Boolean).join('\n');
		},
		async flush(): Promise<void> {
			await options.flush?.();
		},
		async readObservations(): Promise<MemoryEvalObservation[]> {
			const observations = await options.memory.getObservationLog(options.scope);
			return observations.map(toEvalObservation);
		},
	};
}

export async function runMemoryEvalScenario(
	scenario: MemoryEvalScenario,
	options: MemoryEvalRunnerOptions,
): Promise<MemoryEvalRunResult> {
	const turns: MemoryEvalTurnResult[] = [];
	for (const [turnIndex, turn] of scenario.turns.entries()) {
		const output = await options.runtime.runUserTurn(turn.user, {
			scenario,
			turnIndex,
			phase: 'conversation',
		});
		turns.push({ turnIndex, input: turn.user, output });
	}

	await options.runtime.flush();
	const observations = await options.runtime.readObservations();

	const finalAnswers: MemoryEvalFinalAnswer[] = [];
	for (const question of scenario.finalQuestions) {
		const answer = await options.runtime.runUserTurn(question.prompt, {
			scenario,
			question,
			phase: 'audit',
		});
		finalAnswers.push({ questionId: question.id, prompt: question.prompt, answer });
	}

	let scorecard = scoreMemoryEval({ scenario, observations, finalAnswers });
	if (options.judge) {
		const judgeScore = await options.judge.score({
			scenario,
			observations,
			finalAnswers,
			scorecard,
		});
		scorecard = applyMemoryJudgeScore(scorecard, judgeScore);
	}

	return {
		scenario,
		turns,
		observations,
		finalAnswers,
		scorecard,
	};
}

export async function runMemoryGoldenSuite(
	options: MemoryEvalSuiteOptions,
): Promise<MemoryEvalSuiteResult> {
	const scenarios = options.scenarios ?? memoryGoldenScenarios;
	const startedAt = new Date();
	const concurrency = normalizeConcurrency(options.concurrency);

	const results = await mapWithConcurrency(scenarios, concurrency, async (scenario) => {
		const runnerOptions = await options.createRuntime(scenario);
		return await runMemoryEvalScenario(scenario, runnerOptions);
	});

	const finishedAt = new Date();
	const scenarioScores = results.map((result) => ({
		...summarizeScenarioScore(result),
	}));
	const overall =
		scenarioScores.length === 0
			? 1
			: scenarioScores.reduce((sum, score) => sum + score.overall, 0) / scenarioScores.length;

	return {
		runId: options.runId ?? `memory-eval-${startedAt.toISOString()}`,
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		results,
		scorecard: {
			overall,
			scenarios: scenarioScores,
		},
	};
}

export async function writeMemoryEvalArtifacts(
	suite: MemoryEvalSuiteResult,
	outputDir: string,
): Promise<void> {
	await mkdir(outputDir, { recursive: true });
	await writeFile(join(outputDir, 'results.json'), `${JSON.stringify(suite.results, null, 2)}\n`);
	await writeFile(
		join(outputDir, 'observations.json'),
		`${JSON.stringify(
			suite.results.map((result) => ({
				scenarioId: result.scenario.id,
				observations: result.observations,
			})),
			null,
			2,
		)}\n`,
	);
	await writeFile(
		join(outputDir, 'scorecard.json'),
		`${JSON.stringify(suite.scorecard, null, 2)}\n`,
	);
}
