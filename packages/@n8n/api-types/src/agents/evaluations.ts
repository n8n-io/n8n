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
