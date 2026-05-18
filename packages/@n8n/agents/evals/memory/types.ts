import type { BuiltAgent, ExecutionOptions, RunOptions } from '../../src';
import type {
	BuiltObservationLogStore,
	ObservationLogMarker,
	ObservationLogScope,
	ObservationLogStatus,
} from '../../src/types/sdk/observation-log';

export interface MemoryEvalTurn {
	user: string;
	note?: string;
}

export interface MemoryEvalFinalQuestion {
	id: string;
	prompt: string;
	expectedAnswerTerms?: string[];
	forbiddenAnswerTerms?: string[];
}

export interface MemoryEvalLifecycleExpectation {
	text: string;
	status: ObservationLogStatus;
}

export interface MemoryEvalOracle {
	activeFacts: string[];
	staleFacts: string[];
	forbiddenFacts: string[];
	exactTerms: string[];
	lifecycle?: MemoryEvalLifecycleExpectation[];
}

export interface MemoryEvalScenario {
	id: string;
	name: string;
	description: string;
	tags: string[];
	turns: MemoryEvalTurn[];
	finalQuestions: MemoryEvalFinalQuestion[];
	oracle: MemoryEvalOracle;
}

export interface MemoryEvalObservation {
	id: string;
	marker: ObservationLogMarker;
	text: string;
	status: ObservationLogStatus;
	parentId: string | null;
	supersededBy: string | null;
	createdAt: string;
}

export interface MemoryEvalTurnResult {
	turnIndex: number;
	input: string;
	output: string;
}

export interface MemoryEvalFinalAnswer {
	questionId: string;
	prompt: string;
	answer: string;
}

export type MemoryEvalMetricName =
	| 'activeFactRecall'
	| 'activeFactPrecision'
	| 'staleFactSuppression'
	| 'exactIdentifierRecall'
	| 'lifecycleAccuracy'
	| 'contaminationRate'
	| 'finalAnswerCorrectness'
	| 'answerFaithfulness';

export interface MemoryEvalMetric {
	score: number;
	numerator: number;
	denominator: number;
	source?: 'deterministic' | 'judge';
	missing?: string[];
	matched?: string[];
	evidenceObservationIds?: string[];
	irrelevantObservationIds?: string[];
	notes?: string[];
}

export interface MemoryEvalJudgeMetric {
	/** Judge rubric score from 0 to 5. */
	score: number;
	matched: string[];
	missing: string[];
	evidenceObservationIds: string[];
	irrelevantObservationIds?: string[];
	notes: string[];
}

export interface MemoryEvalJudgeScore {
	activeFactRecall: MemoryEvalJudgeMetric;
	activeFactPrecision: MemoryEvalJudgeMetric;
	lifecycleAccuracy: MemoryEvalJudgeMetric;
	finalAnswerCorrectness: MemoryEvalJudgeMetric;
	answerFaithfulness: MemoryEvalJudgeMetric;
	overall: number;
	failures: string[];
}

export interface MemoryEvalScorecard {
	scenarioId: string;
	metrics: Record<MemoryEvalMetricName, MemoryEvalMetric>;
	overall: number;
	judge?: MemoryEvalJudgeScore;
}

export interface MemoryEvalRunResult {
	scenario: MemoryEvalScenario;
	turns: MemoryEvalTurnResult[];
	observations: MemoryEvalObservation[];
	finalAnswers: MemoryEvalFinalAnswer[];
	scorecard: MemoryEvalScorecard;
}

export interface MemoryEvalSuiteScenarioScore {
	scenarioId: string;
	overall: number;
	metrics: Record<
		MemoryEvalMetricName,
		Pick<MemoryEvalMetric, 'score' | 'source' | 'numerator' | 'denominator'>
	>;
	observationCounts: {
		total: number;
		active: number;
		superseded: number;
		dropped: number;
	};
	judge?: {
		overall: number;
		failures: string[];
	};
}

export interface MemoryEvalSuiteResult {
	runId: string;
	startedAt: string;
	finishedAt: string;
	results: MemoryEvalRunResult[];
	scorecard: {
		overall: number;
		scenarios: MemoryEvalSuiteScenarioScore[];
	};
}

export interface MemoryEvalRunContext {
	scenario: MemoryEvalScenario;
	turnIndex?: number;
	question?: MemoryEvalFinalQuestion;
	phase: 'conversation' | 'audit';
}

export interface MemoryEvalRuntime {
	runUserTurn(input: string, context: MemoryEvalRunContext): Promise<string>;
	flush(): Promise<void>;
	readObservations(): Promise<MemoryEvalObservation[]>;
}

export interface AgentMemoryEvalRuntimeOptions {
	agent: BuiltAgent;
	memory: BuiltObservationLogStore;
	scope: ObservationLogScope;
	runOptions?: RunOptions & ExecutionOptions;
	flush?: () => Promise<void>;
}

export interface MemoryEvalJudge {
	score(input: {
		scenario: MemoryEvalScenario;
		observations: MemoryEvalObservation[];
		finalAnswers: MemoryEvalFinalAnswer[];
		scorecard: MemoryEvalScorecard;
	}): Promise<MemoryEvalJudgeScore>;
}

export interface MemoryEvalRunnerOptions {
	runtime: MemoryEvalRuntime;
	judge?: MemoryEvalJudge;
}

export interface MemoryEvalSuiteOptions {
	scenarios?: MemoryEvalScenario[];
	createRuntime: (
		scenario: MemoryEvalScenario,
	) => Promise<MemoryEvalRunnerOptions> | MemoryEvalRunnerOptions;
	runId?: string;
	/** Number of scenarios to run at once. Defaults to 1 for predictable provider usage. */
	concurrency?: number;
}
