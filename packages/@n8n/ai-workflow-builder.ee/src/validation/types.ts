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
	// Graph validation violations (from workflow-sdk validate())
	'graph-no-nodes',
	'graph-disconnected-node',
	'graph-merge-single-input',
	'graph-from-ai-in-non-tool',
	'graph-agent-static-prompt',
	'graph-agent-no-system-message',
	'graph-hardcoded-credentials',
	'graph-set-credential-field',
	'graph-tool-no-parameters',
	'graph-missing-trigger',
	'graph-parse-error',
	'webhook-response-mode-missing-respond-node',
	'webhook-response-mode-mismatch',
	'data-table-missing-set-node',
	'node-missing-required-parameter',
	'node-invalid-options-value',
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
	nodeUsage: ProgrammaticViolation[];
	parameters: ProgrammaticViolation[];
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
	nodeUsage: SingleEvaluatorResult;
	parameters: SingleEvaluatorResult;
	similarity: SingleEvaluatorResult | null;
	graphValidation: SingleEvaluatorResult;
}

export interface ProgrammaticEvaluationInput {
	generatedWorkflow: SimpleWorkflow;
	userPrompt?: string;
	referenceWorkflows?: SimpleWorkflow[];
	preset?: 'strict' | 'standard' | 'lenient';
	/** Generated TypeScript SDK code for graph validation */
	generatedCode?: string;
}

export interface NodeResolvedConnectionTypesInfo {
	node: SimpleWorkflow['nodes'][0];
	nodeType: INodeTypeDescription;
	resolvedInputs?: Array<{ type: NodeConnectionType; required: boolean }>;
	resolvedOutputs?: Set<NodeConnectionType>;
}
