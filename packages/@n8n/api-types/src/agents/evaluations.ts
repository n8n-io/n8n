import type { AgentReviewCasesResponse, AgentReviewSummary } from './debug';

export const AGENT_EVALUATION_MIN_REVIEWED_CASES = 5;

export interface AgentEvaluationDatasetReadiness {
	isReady: boolean;
	agentVersionId: string;
	agentVersionCanRun: boolean;
	minimumReviewedCases: number;
	reviewedCases: number;
	remainingCases: number;
}

export interface AgentEvaluationVersionSummary extends AgentReviewSummary {
	agentVersionId: string;
	isCurrent: boolean;
	isPublished: boolean;
	canRun: boolean;
	updatedAt: string | null;
}

export interface AgentEvaluationDatasetResponse extends AgentReviewCasesResponse {
	currentAgentVersionId: string;
	versions: AgentEvaluationVersionSummary[];
	recentRuns: AgentEvaluationSuiteRun[];
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
	agentVersionId: string;
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
	currentAgentVersionId: string;
	versions: AgentEvaluationVersionSummary[];
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
	input?: unknown;
	output?: unknown;
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
	agentVersionId: string;
	startedAt: string;
	completedAt: string;
	summary: AgentEvaluationRunSummary;
	cases: AgentEvaluationRunCaseResult[];
	warnings: string[];
}

export interface AgentEvaluationSuiteRunRequest {
	agentVersionId?: string;
	enabledMetricIds?: string[];
}

export interface AgentEvaluationSuiteRunResponse {
	currentAgentVersionId: string;
	versions: AgentEvaluationVersionSummary[];
	readiness: AgentEvaluationDatasetReadiness;
	run: AgentEvaluationSuiteRun | null;
}

export interface AgentEvaluationSuiteSetupRequest {
	agentVersionId?: string;
}
