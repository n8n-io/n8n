import type { BaseResource } from '@/Interface';
import type { Agent, ToolDescriptor, CustomToolEntry } from './agent.types';

export type { ToolDescriptor, CustomToolEntry };

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

export interface NodeToolConfig {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters?: Record<string, unknown>;
	credentials?: Record<string, { id: string; name: string }>;
}

export interface AgentJsonToolRef {
	type: 'custom' | 'workflow' | 'node';
	id?: string;
	workflow?: string;
	name?: string;
	description?: string;
	node?: NodeToolConfig;
	inputSchema?: Record<string, unknown>;
	requireApproval?: boolean;
}

export interface AgentJsonConfig {
	name: string;
	description?: string;
	model: string;
	credential: string;
	instructions: string;
	memory?: {
		enabled: boolean;
		storage: 'n8n' | 'sqlite' | 'postgres';
		connection?: Record<string, unknown>;
		lastMessages?: number;
		semanticRecall?: {
			topK: number;
			scope?: 'thread' | 'resource';
			messageRange?: { before: number; after: number };
			embedder?: string;
		};
	};
	tools?: AgentJsonToolRef[];
	providerTools?: Record<string, Record<string, unknown>>;
	config?: {
		thinking?: {
			provider: 'anthropic' | 'openai';
			budgetTokens?: number;
			reasoningEffort?: string;
		};
		toolCallConcurrency?: number;
		requireToolApproval?: boolean;
	};
}
