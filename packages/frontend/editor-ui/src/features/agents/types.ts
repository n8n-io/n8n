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
	type: 'custom' | 'workflow' | 'provider' | 'mcp';
	editable: boolean;
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
