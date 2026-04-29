/**
 * Local types for template API data.
 * These mirror the shapes returned by the n8n template API
 * without depending on n8n-workflow.
 */

// ── Template node & workflow shapes ─────────────────────────────────────────

export interface TemplateNode {
	id?: string;
	name: string;
	type: string;
	typeVersion: number;
	position: [number, number];
	parameters: Record<string, unknown>;
}

/**
 * Connection entry in the n8n connections format.
 * Each entry points to a target node with an optional input index.
 */
export interface ConnectionEntry {
	node: string;
	type?: string;
	index?: number;
}

/**
 * Connections map: sourceNode -> connectionType -> outputIndex[] -> ConnectionEntry[]
 * Example: { "Node A": { main: [[{ node: "Node B" }]] } }
 */
export type TemplateConnections = Record<string, Record<string, Array<ConnectionEntry[] | null>>>;

export interface TemplateWorkflow {
	name?: string;
	nodes: TemplateNode[];
	connections: TemplateConnections;
}

// ── Template API request/response shapes ────────────────────────────────────

// Retrieved from https://api.n8n.io/api/templates/categories
export const categories = [
	'AI',
	'AI Chatbot',
	'AI RAG',
	'AI Summarization',
	'Content Creation',
	'CRM',
	'Crypto Trading',
	'DevOps',
	'Document Extraction',
	'Document Ops',
	'Engineering',
	'File Management',
	'HR',
	'Internal Wiki',
	'Invoice Processing',
	'IT Ops',
	'Lead Generation',
	'Lead Nurturing',
	'Marketing',
	'Market Research',
	'Miscellaneous',
	'Multimodal AI',
	'Other',
	'Personal Productivity',
	'Project Management',
	'Sales',
	'SecOps',
	'Social Media',
	'Support',
	'Support Chatbot',
	'Ticket Management',
] as const;

export type Category = (typeof categories)[number];

export interface TemplateSearchQuery {
	search?: string;
	rows?: number;
	category?: Category;
	nodes?: string;
}

export interface TemplateWorkflowDescription {
	id: number;
	name: string;
	description: string;
}

export interface TemplateSearchResponse {
	totalWorkflows: number;
	workflows: TemplateWorkflowDescription[];
}

export interface TemplateFetchResponse {
	id: number;
	name: string;
	workflow: TemplateWorkflow;
}

// ── Processed workflow metadata ─────────────────────────────────────────────

export interface WorkflowMetadata {
	templateId: number;
	name: string;
	description?: string;
	workflow: TemplateWorkflow;
}

// ── Node configuration types ────────────────────────────────────────────────

export interface NodeConfigurationEntry {
	version: number;
	parameters: Record<string, unknown>;
}

/**
 * Map of node type to array of parameter configurations with version info.
 * Key: node type (e.g. 'n8n-nodes-base.telegram')
 * Value: array of configuration entries with version and parameters
 */
export type NodeConfigurationsMap = Record<string, NodeConfigurationEntry[]>;
