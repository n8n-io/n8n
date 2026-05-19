import type { AgentReviewCasesResponse } from './debug';

export const AGENT_EVALUATION_MIN_REVIEWED_CASES = 5;

export interface AgentEvaluationDatasetReadiness {
	isReady: boolean;
	minimumReviewedCases: number;
	reviewedCases: number;
	remainingCases: number;
}

export interface AgentEvaluationDatasetResponse extends AgentReviewCasesResponse {
	readiness: AgentEvaluationDatasetReadiness;
}

export type AgentEvaluationMetricType = 'check' | 'judge';

export interface AgentEvaluationMetricSuggestion {
	id: string;
	name: string;
	type: AgentEvaluationMetricType;
	description: string;
	enabled: boolean;
}

export interface AgentEvaluationSuiteDraft {
	id: string;
	name: string;
	description: string;
	caseCount: number;
	approvedCases: number;
	rejectedCases: number;
	toolMocking: string;
	memoryMocking: string;
	metrics: AgentEvaluationMetricSuggestion[];
}

export interface AgentEvaluationSuiteSetupResponse {
	readiness: AgentEvaluationDatasetReadiness;
	suite: AgentEvaluationSuiteDraft | null;
}

export interface AgentEvaluationRunMetricResult {
	id: string;
	name: string;
	score: number;
	pass: boolean;
	reason: string;
}

export interface AgentEvaluationRunToolCall {
	name: string;
	mocked: boolean;
	missingMock: boolean;
}

export interface AgentEvaluationRunCaseResult {
	caseId: string;
	input: string;
	expectedOutput: string;
	output: string;
	status: 'passed' | 'failed' | 'error';
	durationMs: number;
	error: string | null;
	metrics: AgentEvaluationRunMetricResult[];
	toolCalls: AgentEvaluationRunToolCall[];
	missingToolMocks: string[];
}

export interface AgentEvaluationRunSummary {
	totalCases: number;
	passedCases: number;
	failedCases: number;
	errorCases: number;
	averageScore: number;
}

export interface AgentEvaluationSuiteRun {
	id: string;
	suiteId: string;
	startedAt: string;
	completedAt: string;
	summary: AgentEvaluationRunSummary;
	cases: AgentEvaluationRunCaseResult[];
	warnings: string[];
}

export interface AgentEvaluationSuiteRunRequest {
	enabledMetricIds?: string[];
}

export interface AgentEvaluationSuiteRunResponse {
	readiness: AgentEvaluationDatasetReadiness;
	run: AgentEvaluationSuiteRun | null;
}
