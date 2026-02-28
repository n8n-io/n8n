import type { User } from '@n8n/db';

import type { WorkflowSkill } from './agent-schema-discovery';
import type {
	AgentTaskResult,
	ExternalAgentConfig,
	IterationBudget,
	LlmConfig,
	LlmMessage,
	StepCallback,
	TaskStep,
} from './agents.types';

export interface WorkflowInfo {
	id: string;
	name: string;
	active: boolean;
	description?: string | null;
}

export interface DelegationTarget {
	id: string;
	firstName: string;
	description: string;
}

export interface ExecutionDeps {
	runWorkflow(
		user: User,
		workflowId: string,
		agentPrompt?: string,
		callerId?: string,
		workflowCredentials?: Record<string, Record<string, string>>,
		typedInputs?: Record<string, unknown>,
	): Promise<{ success: boolean; executionId: string; data?: unknown }>;

	executeAgentTask(
		agentId: string,
		prompt: string,
		budget: IterationBudget,
		options?: {
			onStep?: StepCallback;
			callChain?: Set<string>;
			byokApiKey?: string;
			callerId?: string;
			workflowCredentials?: Record<string, Record<string, string>>;
		},
	): Promise<AgentTaskResult>;

	enforceAccessLevel(agentId: string, caller: User): Promise<void>;

	findAgentUser(id: string): Promise<User | null>;

	reflectBeforeComplete(
		messages: LlmMessage[],
		llmConfig: LlmConfig,
		originalPrompt: string,
		proposedSummary: string,
		steps: TaskStep[],
		budget: IterationBudget,
	): Promise<AgentTaskResult | null>;
}

export interface ExecutionContext {
	agentUser: User;
	agentName: string;
	llmConfig: LlmConfig;
	knownSecrets: string[];
	workflows: WorkflowInfo[];
	skills: WorkflowSkill[];
	otherAgents: DelegationTarget[];
	resolvedExternalAgents: ExternalAgentConfig[];
	canDelegate: boolean;
	steps: TaskStep[];
	messages: LlmMessage[];
	budget: IterationBudget;
	onStep: StepCallback | undefined;
	deps: ExecutionDeps;
}

export interface ParsedAction {
	action: string;
	workflowId?: string;
	inputs?: Record<string, unknown>;
	targetUserId?: string;
	message?: string;
	reasoning?: string;
	summary?: string;
}

export type ActionOutcome =
	| {
			kind: 'observed';
			action: string;
			result: string;
			message: string;
			extra?: Record<string, unknown>;
	  }
	| { kind: 'completed'; result: AgentTaskResult }
	| { kind: 'continue_loop' }
	| { kind: 'unknown_action'; validActions: string };
