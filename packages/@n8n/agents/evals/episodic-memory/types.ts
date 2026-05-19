export type EpisodicEvalFailureKind =
	| 'om_observation'
	| 'em_extraction'
	| 'em_reflection'
	| 'retrieval'
	| 'tool_policy'
	| 'answer_synthesis'
	| 'oracle_false_negative';

export interface FactMatcher {
	all?: string[];
	oneOf?: string[];
	regex?: string[];
}

export interface FactAssertion {
	id: string;
	description: string;
	match: FactMatcher;
}

export interface RecallAssertion {
	id: string;
	prompt: string;
	shouldCallRecallMemory: boolean;
	expectedFacts: string[];
	forbiddenFacts: string[];
}

export interface FinalQuestionAssertion {
	id: string;
	prompt: string;
	expectedFacts: string[];
	forbiddenFacts: string[];
}

export interface EpisodicMemoryScenario {
	id: string;
	name: string;
	threads: Array<{ id: string; prompts: string[] }>;
	isolatedThreads?: Array<{ id: string; resourceId: string; prompts: string[] }>;
	expectedActiveEpisodes: FactAssertion[];
	staleFacts: FactAssertion[];
	forbiddenFacts: FactAssertion[];
	exactIdentifiers: string[];
	recallQueries: RecallAssertion[];
	finalQuestions: FinalQuestionAssertion[];
}

export interface EpisodicEvalEntrySource {
	observationId: string;
	threadId: string;
	evidenceText: string;
	observationText?: string;
	observationMarker?: string;
}

export interface EpisodicEvalEntry {
	id: string;
	content: string;
	status: 'active' | 'superseded' | 'dropped';
	createdAt: string;
	updatedAt: string;
	lastSeenAt?: string;
	sources: EpisodicEvalEntrySource[];
}

export interface EpisodicEvalRecallEntry {
	entryId: string;
	content: string;
	score?: number;
}

export interface EpisodicEvalRecallResult {
	id: string;
	prompt: string;
	shouldCallRecallMemory: boolean;
	toolCalled: boolean;
	results: EpisodicEvalRecallEntry[];
	answer: string;
}

export interface EpisodicEvalFinalAnswer {
	id: string;
	prompt: string;
	answer: string;
}

export interface EpisodicDeterministicMetrics {
	entryCoverage: number;
	sourceBackedPrecision: number;
	exactIdentifierRecall: number;
	dedupeAccuracy: number;
	lifecycleAccuracy: number;
	scopeContaminationRate: number;
	recallTopKHitRate: number;
	mrr: number;
	ndcg: number;
	abstentionPrecision: number;
	toolCallAccuracy: number;
}

export interface EpisodicJudgeScores {
	answerCorrectness: number;
	answerFaithfulness: number;
	historicalFraming: number;
	inventoryCompleteness: number;
	distractorResistance: number;
	notes?: string[];
}

export interface EpisodicScorecard {
	deterministic: number;
	judge?: number;
	overall: number;
	metrics: EpisodicDeterministicMetrics;
	judgeScores?: EpisodicJudgeScores;
}

export interface EpisodicEvalScenarioResult {
	scenarioId: string;
	scenarioName: string;
	entries: EpisodicEvalEntry[];
	recalls: EpisodicEvalRecallResult[];
	finalAnswers: EpisodicEvalFinalAnswer[];
	scorecard: EpisodicScorecard;
	failures: Array<{
		kind: EpisodicEvalFailureKind;
		message: string;
	}>;
}
