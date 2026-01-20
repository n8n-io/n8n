import type { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

export type ProgrammaticViolationType = 'critical' | 'major' | 'minor';

export const PROGRAMMATIC_VIOLATION_NAMES = [
	'tool-node-has-no-parameters',
	// this validation has been removed for now as it was throwing a lot of false positives
	'tool-node-static-parameters',
	'agent-static-prompt',
	'agent-no-system-prompt',
	'non-tool-node-uses-fromai',
	'workflow-has-no-nodes',
	'workflow-has-no-trigger',
	'workflow-exceeds-max-nodes-limit',
	'node-missing-required-input',
	'node-unsupported-connection-input',
	'node-merge-single-input',
	'node-merge-incorrect-num-inputs',
	'node-merge-missing-input',
	'sub-node-not-connected',
	'node-type-not-found',
	'failed-to-resolve-connections',
	'workflow-similarity-node-insert',
	'workflow-similarity-node-delete',
	'workflow-similarity-node-substitute',
	'workflow-similarity-edge-insert',
	'workflow-similarity-edge-delete',
	'workflow-similarity-edge-substitute',
	'workflow-similarity-evaluation-failed',
	'http-request-hardcoded-credentials',
	'set-node-credential-field',
] as const;

export type ProgrammaticViolationName = (typeof PROGRAMMATIC_VIOLATION_NAMES)[number];

export type TelemetryValidationStatus = Record<ProgrammaticViolationName, 'pass' | 'fail'>;

export interface ProgrammaticViolation {
	name: ProgrammaticViolationName;
	type: ProgrammaticViolationType;
	description: string;
	pointsDeducted: number;
	metadata?: Record<string, string>;
}

export interface SingleEvaluatorResult {
	violations: ProgrammaticViolation[];
	score: number;
}

export interface ProgrammaticChecksResult {
	connections: ProgrammaticViolation[];
	nodes: ProgrammaticViolation[];
	trigger: ProgrammaticViolation[];
	agentPrompt: ProgrammaticViolation[];
	tools: ProgrammaticViolation[];
	fromAi: ProgrammaticViolation[];
	credentials: ProgrammaticViolation[];
}

export interface ProgrammaticEvaluationResult {
	overallScore: number;
	connections: SingleEvaluatorResult;
	nodes: SingleEvaluatorResult;
	trigger: SingleEvaluatorResult;
	agentPrompt: SingleEvaluatorResult;
	tools: SingleEvaluatorResult;
	fromAi: SingleEvaluatorResult;
	credentials: SingleEvaluatorResult;
	similarity: SingleEvaluatorResult | null;
}

export interface ProgrammaticEvaluationInput {
	generatedWorkflow: SimpleWorkflow;
	userPrompt?: string;
	referenceWorkflows?: SimpleWorkflow[];
	preset?: 'strict' | 'standard' | 'lenient';
}

export interface NodeResolvedConnectionTypesInfo {
	node: SimpleWorkflow['nodes'][0];
	nodeType: INodeTypeDescription;
	resolvedInputs?: Array<{ type: NodeConnectionType; required: boolean }>;
	resolvedOutputs?: Set<NodeConnectionType>;
}
