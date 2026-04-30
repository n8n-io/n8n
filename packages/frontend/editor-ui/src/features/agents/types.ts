import type { BaseResource } from '@/Interface';
import type { AgentJsonToolRef as ApiAgentJsonToolRef, AgentSkill } from '@n8n/api-types';
import type { Agent, ToolDescriptor, CustomToolEntry } from './agent.types';

export type { ToolDescriptor, CustomToolEntry, AgentSkill };

/**
 * Agent resource type definition.
 * This extends the ModuleResources interface to add Agent as a resource type.
 */
export type AgentResource = BaseResource &
	Agent & {
		resourceType: 'agent';
	};

// Extend the ModuleResources interface to include Agent
declare module '@/Interface' {
	interface ModuleResources {
		agent: AgentResource;
	}
}

// Frontend-local copies of AgentSchema types from @n8n/agents

export interface AgentSchema {
	model: { provider: string | null; name: string | null; raw?: string };
	credential: string | null;
	instructions: string | null;
	description: string | null;
	tools: ToolSchema[];
	providerTools: ProviderToolSchema[];
	memory: MemorySchema | null;
	evaluations: EvalSchema[];
	guardrails: GuardrailSchema[];
	mcp: McpServerSchema[] | null;
	telemetry: TelemetrySchema | null;
	checkpoint: 'memory' | null;
	config: {
		structuredOutput: { enabled: boolean; schemaSource: string | null };
		thinking: ThinkingSchema | null;
		toolCallConcurrency: number | null;
		requireToolApproval: boolean;
	};
}

export interface ToolSchema {
	name: string;
	description: string;
	editable: boolean;
	metadata: Record<string, unknown> | null;
	inputSchemaSource: string | null;
	outputSchemaSource: string | null;
	handlerSource: string | null;
	suspendSchemaSource: string | null;
	resumeSchemaSource: string | null;
	toMessageSource: string | null;
	requireApproval: boolean;
	needsApprovalFnSource: string | null;
	providerOptions: Record<string, unknown> | null;
	inputSchema: Record<string, unknown> | null;
	outputSchema: Record<string, unknown> | null;
	hasSuspend: boolean;
	hasResume: boolean;
	hasToMessage: boolean;
}

export interface ProviderToolSchema {
	name: string;
	source: string;
}

export interface MemorySchema {
	source: string | null;
	storage: 'memory' | 'custom';
	lastMessages: number | null;
	semanticRecall: {
		topK: number;
		messageRange: { before: number; after: number } | null;
		embedder: string | null;
	} | null;
	workingMemory: {
		type: 'structured' | 'freeform';
		schema?: Record<string, unknown>;
		template?: string;
	} | null;
}

export interface EvalSchema {
	name: string;
	description: string | null;
	type: 'check' | 'judge';
	modelId: string | null;
	credentialName: string | null;
	hasCredential: boolean;
	handlerSource: string | null;
}

export interface GuardrailSchema {
	name: string;
	guardType: string;
	strategy: string;
	position: 'input' | 'output';
	config: Record<string, unknown>;
	source: string;
}

export interface McpServerSchema {
	name: string;
	configSource: string;
}

export interface TelemetrySchema {
	source: string;
}

export interface ThinkingSchema {
	provider: 'anthropic' | 'openai';
	budgetTokens?: number;
	reasoningEffort?: string;
}

export type WorkflowToolRef = ApiAgentJsonToolRef & { type: 'workflow' };

export type {
	NodeToolConfig,
	AgentJsonToolRef,
	AgentJsonSkillRef,
	AgentJsonConfigRef,
	AgentJsonConfig,
} from '@n8n/api-types';
