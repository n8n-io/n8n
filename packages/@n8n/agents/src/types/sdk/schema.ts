import type { JSONSchema7 } from 'json-schema';

import type { CredentialConfig } from './credential-provider';

export interface AgentSchema {
	model: {
		provider: string | null;
		name: string | null;
		raw?: string;
	};
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
		structuredOutput: {
			enabled: boolean;
			schemaSource: string | null; // original Zod source string
		};
		thinking: ThinkingSchema | null;
		toolCallConcurrency: number | null;
		requireToolApproval: boolean;
	};
}

export interface ToolSchema {
	name: string;
	description: string;
	editable: boolean;
	/**
	 * Arbitrary platform-specific metadata for this tool entry.
	 * The @n8n/agents package treats this as opaque and round-trips it without
	 * modification. Consumers (e.g. the n8n CLI) use it to carry workflow tool
	 * descriptors and other platform concepts.
	 */
	metadata: Record<string, unknown> | null;
	// Source strings — original TypeScript for lossless code generation
	inputSchemaSource: string | null;
	outputSchemaSource: string | null;
	handlerSource: string | null;
	suspendSchemaSource: string | null;
	resumeSchemaSource: string | null;
	toMessageSource: string | null;
	requireApproval: boolean;
	needsApprovalFnSource: string | null;
	providerOptions: Record<string, unknown> | null;
	// Display fields — JSON Schema for UI rendering
	inputSchema: JSONSchema7 | null;
	outputSchema: JSONSchema7 | null;
	// UI badge indicators
	hasSuspend: boolean;
	hasResume: boolean;
	hasToMessage: boolean;
}

export interface ProviderToolSchema {
	name: string;
	source: string; // full expression source, e.g. "providerTools.anthropicWebSearch({ maxUses: 5 })"
}

export type ConnectionParamValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| ConnectionParamsObject
	| CredentialConfig;
export type ConnectionParamsObject = {
	[key: string | number | symbol]: ConnectionParamValue | undefined;
};
export type ConnectionParams = ConnectionParamsObject | CredentialConfig;

export interface MemorySchema<TParams extends ConnectionParams = ConnectionParams> {
	source: string | null; // full Memory builder chain source for lossless regeneration
	// Backend descriptor — from BuiltMemory.describe()
	name: string; // e.g. 'postgres' | 'sqlite' | 'memory' | 'custom'
	connectionParams: TParams; // serializable, non-secret params (may contain CredentialConfig refs)
	lastMessages: number | null;
	semanticRecall: {
		topK: number;
		messageRange: { before: number; after: number } | null;
		embedder: string | null;
	} | null;
	workingMemory: {
		type: 'structured' | 'freeform';
		schema?: JSONSchema7;
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
	guardType: 'pii' | 'prompt-injection' | 'moderation' | 'custom';
	strategy: 'block' | 'redact' | 'warn';
	position: 'input' | 'output';
	config: Record<string, unknown>;
	source: string; // full guardrail source for lossless regeneration
}

export interface McpServerSchema {
	name: string;
	configSource: string; // full McpServerConfig object source
}

export interface TelemetrySchema {
	source: string; // full Telemetry builder chain source
}

export interface ThinkingSchema {
	provider: 'anthropic' | 'openai';
	budgetTokens?: number;
	reasoningEffort?: string;
}
