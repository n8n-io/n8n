import type { SimpleWorkflow } from '@/types';

export type ProgrammaticViolationType = 'critical' | 'major' | 'minor';

export interface ProgrammaticViolation {
	type: ProgrammaticViolationType;
	description: string;
	pointsDeducted: number;
}

export interface SingleEvaluatorResult {
	violations: ProgrammaticViolation[];
	score: number;
}

export interface ProgrammaticEvaluationResult {
	overallScore: number;
	connections: SingleEvaluatorResult;
	trigger: SingleEvaluatorResult;
	agentPrompt: SingleEvaluatorResult;
	tools: SingleEvaluatorResult;
	fromAi: SingleEvaluatorResult;
}

export interface ProgrammaticEvaluationInput {
	generatedWorkflow: SimpleWorkflow;
	userPrompt?: string;
	referenceWorkflow?: SimpleWorkflow;
}
