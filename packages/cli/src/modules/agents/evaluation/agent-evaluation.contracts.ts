import type { Agent } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';

import type { AgentRuntimeInstrumentation } from '../agent-runtime-instrumentation';

export interface AgentEvaluationSkippedFeature {
	feature: string;
	reason: string;
}

export interface AgentEvaluationToolSummary {
	name: string;
	kind: 'node' | 'workflow' | 'custom' | 'mcp' | 'other';
	description?: string;
	nodeType?: string;
}

export interface AgentEvaluationPreparation {
	config: AgentJsonConfig;
	tools: AgentEvaluationToolSummary[];
	skippedFeatures: AgentEvaluationSkippedFeature[];
	buildRuntime(
		instrumentation: Omit<AgentRuntimeInstrumentation, 'transformDelegatedAgentConfig'>,
	): Promise<Agent>;
}

export type AgentEvaluationPreparationResult =
	| { preparation: AgentEvaluationPreparation; error?: never }
	| { error: string; preparation?: never };
