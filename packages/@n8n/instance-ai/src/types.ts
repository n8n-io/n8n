// Service interfaces — dependency inversion so the package stays decoupled from n8n internals.
// The backend module provides concrete implementations via InstanceAiAdapterService.

// ── Data shapes ──────────────────────────────────────────────────────────────

export interface WorkflowSummary {
	id: string;
	name: string;
	active: boolean;
	createdAt: string;
	updatedAt: string;
	tags?: string[];
}

export interface WorkflowDetail extends WorkflowSummary {
	nodes: WorkflowNode[];
	connections: Record<string, unknown>;
	settings?: Record<string, unknown>;
}

export interface WorkflowNode {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
	position: number[];
}

export interface ExecutionResult {
	executionId: string;
	status: 'running' | 'success' | 'error' | 'waiting';
	data?: Record<string, unknown>;
	error?: string;
	startedAt?: string;
	finishedAt?: string;
}

export interface CredentialSummary {
	id: string;
	name: string;
	type: string;
	createdAt: string;
	updatedAt: string;
}

export interface CredentialDetail extends CredentialSummary {
	// NOTE: never include decrypted credential data
	nodesWithAccess?: Array<{ nodeType: string }>;
}

export interface NodeSummary {
	name: string;
	displayName: string;
	description: string;
	group: string[];
	version: number;
}

export interface NodeDescription extends NodeSummary {
	properties: Array<{
		displayName: string;
		name: string;
		type: string;
		required?: boolean;
		description?: string;
		default?: unknown;
		options?: Array<{ name: string; value: string | number | boolean }>;
	}>;
	credentials?: Array<{ name: string; required?: boolean }>;
	inputs: string[];
	outputs: string[];
}

// ── Service interfaces ───────────────────────────────────────────────────────

export interface InstanceAiWorkflowService {
	list(options?: { query?: string; limit?: number }): Promise<WorkflowSummary[]>;
	get(workflowId: string): Promise<WorkflowDetail>;
	create(workflow: {
		name: string;
		nodes?: WorkflowNode[];
		connections?: Record<string, unknown>;
		settings?: Record<string, unknown>;
	}): Promise<WorkflowDetail>;
	update(
		workflowId: string,
		updates: Partial<{
			name: string;
			nodes: WorkflowNode[];
			connections: Record<string, unknown>;
			settings: Record<string, unknown>;
		}>,
	): Promise<WorkflowDetail>;
	delete(workflowId: string): Promise<void>;
	activate(workflowId: string): Promise<void>;
	deactivate(workflowId: string): Promise<void>;
}

export interface ExecutionSummary {
	id: string;
	workflowId: string;
	workflowName: string;
	status: string;
	startedAt: string;
	finishedAt?: string;
	mode: string;
}

export interface InstanceAiExecutionService {
	list(options?: {
		workflowId?: string;
		status?: string;
		limit?: number;
	}): Promise<ExecutionSummary[]>;
	run(workflowId: string, inputData?: Record<string, unknown>): Promise<{ executionId: string }>;
	getStatus(executionId: string): Promise<ExecutionResult>;
	getResult(executionId: string): Promise<ExecutionResult>;
}

export interface InstanceAiCredentialService {
	list(options?: { type?: string }): Promise<CredentialSummary[]>;
	get(credentialId: string): Promise<CredentialDetail>;
	create(credential: {
		name: string;
		type: string;
		data: Record<string, unknown>;
	}): Promise<CredentialSummary>;
	update(
		credentialId: string,
		updates: Partial<{
			name: string;
			data: Record<string, unknown>;
		}>,
	): Promise<CredentialSummary>;
	delete(credentialId: string): Promise<void>;
	test(credentialId: string): Promise<{ success: boolean; message?: string }>;
}

export interface InstanceAiNodeService {
	listAvailable(options?: { query?: string }): Promise<NodeSummary[]>;
	getDescription(nodeType: string): Promise<NodeDescription>;
}

// ── Context bundle ───────────────────────────────────────────────────────────

export interface InstanceAiContext {
	userId: string;
	workflowService: InstanceAiWorkflowService;
	executionService: InstanceAiExecutionService;
	credentialService: InstanceAiCredentialService;
	nodeService: InstanceAiNodeService;
}

// ── MCP ──────────────────────────────────────────────────────────────────────

export interface McpServerConfig {
	name: string;
	url?: string;
	command?: string;
	args?: string[];
	env?: Record<string, string>;
}

// ── Memory ───────────────────────────────────────────────────────────────────

export interface InstanceAiMemoryConfig {
	postgresUrl: string;
	embedderModel?: string;
	lastMessages?: number;
	semanticRecallTopK?: number;
}

// ── Agent factory options ────────────────────────────────────────────────────

export interface CreateInstanceAgentOptions {
	modelId: string;
	context: InstanceAiContext;
	mcpServers?: McpServerConfig[];
	memoryConfig: InstanceAiMemoryConfig;
}
