import type { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

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

export interface ProgrammaticChecksResult {
	connections: ProgrammaticViolation[];
	trigger: ProgrammaticViolation[];
	agentPrompt: ProgrammaticViolation[];
	tools: ProgrammaticViolation[];
	fromAi: ProgrammaticViolation[];
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

export interface NodeResolvedConnectionTypesInfo {
	node: SimpleWorkflow['nodes'][0];
	nodeType: INodeTypeDescription;
	resolvedInputs?: Array<{ type: NodeConnectionType; required: boolean }>;
	resolvedOutputs?: Set<NodeConnectionType>;
}
