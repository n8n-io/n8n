import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	getChildNodes,
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type IConnections,
} from 'n8n-workflow';

import type { AgentIntegrationSettings } from './agent-integration.schema';
import type { AgentJsonConfig } from './agent-json-config.schema';

export const SUPPORTED_WORKFLOW_TOOL_TRIGGERS = [
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
] as const;

export const INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES = [
	'n8n-nodes-base.wait',
	'n8n-nodes-base.form',
] as const;

export const AGENT_WORKFLOW_TRIGGER_TYPE = 'workflow';

/**
 * Why a workflow can't be attached as an agent tool. `null` means compatible.
 *
 * @remarks Computed from `nodes` (type/name/disabled) and `connections`, so it
 * stays pure and shareable between the backend validation service and the
 * frontend picker. Only nodes that can actually execute when the agent
 * invokes the workflow are considered: disabled body nodes are skipped, and
 * when `connections` is available only nodes reachable from the entry-point
 * trigger are checked. The entry point is the first supported trigger in node
 * order, matching the runtime `detectTriggerNode` selection — so with
 * multiple supported triggers the other trigger subgraphs never run and an
 * incompatible node there must not block the workflow. When `connections` is
 * absent the check degrades to scanning every enabled node, which is the
 * strict superset and stays safe. The runtime `validateCompatibility`/
 * `detectTriggerNode` throws still cover edge cases that a pure scan can't
 * (e.g. a trigger that resolves to a supported type only after parameter
 * materialisation), so this is a strict subset of the runtime check — never
 * relax the runtime check based on this.
 */
export type WorkflowToolIncompatibilityReason =
	| { reason: 'incompatible_nodes'; nodeTypes: string[] }
	| { reason: 'no_supported_trigger' };

export function getWorkflowToolIncompatibilityReason(workflow: {
	nodes?: Array<{ type: string; name: string; disabled?: boolean }>;
	connections?: IConnections;
}): WorkflowToolIncompatibilityReason | null {
	const nodes = workflow.nodes ?? [];

	// Entry point the agent invokes — the first supported trigger in node
	// order, matching the runtime `detectTriggerNode` selection. Runtime does
	// not skip disabled triggers, so neither do we; this keeps the picker and
	// the runtime from disagreeing on which subgraph executes.
	const triggerNode = nodes.find((n) =>
		(SUPPORTED_WORKFLOW_TOOL_TRIGGERS as readonly string[]).includes(n.type),
	);

	// Only nodes reachable from the entry-point trigger run when the workflow
	// is invoked as an agent tool. With no trigger (or no connections to
	// traverse) we fall back to every node — the safe superset that keeps
	// `incompatible_nodes` prioritised over `no_supported_trigger`.
	const reachableNames =
		triggerNode && workflow.connections
			? reachableNodesFromTriggers([triggerNode.name], workflow.connections)
			: new Set(nodes.map((n) => n.name));

	// Disabled body nodes never execute, so they can't make the workflow
	// incompatible even when they sit on a reachable branch.
	const incompatibleNodeTypes = nodes
		.filter((n) => !n.disabled && reachableNames.has(n.name))
		.filter((n) =>
			(INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES as readonly string[]).includes(n.type),
		)
		.map((n) => n.type);
	if (incompatibleNodeTypes.length > 0) {
		return { reason: 'incompatible_nodes', nodeTypes: incompatibleNodeTypes };
	}

	if (!triggerNode) return { reason: 'no_supported_trigger' };

	return null;
}

/**
 * All node names reachable from any of `triggerNames` (the triggers included),
 * following every connection type. `getChildNodes` is cycle-safe and returns
 * each descendant once, so one call per trigger and a union is enough.
 */
function reachableNodesFromTriggers(
	triggerNames: string[],
	connections: IConnections,
): Set<string> {
	const reachable = new Set<string>(triggerNames);
	for (const name of triggerNames) {
		for (const child of getChildNodes(connections, name, 'ALL')) {
			reachable.add(child);
		}
	}
	return reachable;
}

export interface ChatIntegrationDescriptor {
	type: string;
	label: string;
	icon: string;
	credentialTypes: string[];
	capabilities?: string[];
	useIntegrationWhen?: string[];
	useNodeToolWhen?: string[];
}

export interface AgentIntegrationStatusEntry {
	type: string;
	credentialId?: string;
	settings?: AgentIntegrationSettings;
}

export interface AgentIntegrationStatusResponse {
	status: 'configured' | 'connected' | 'disconnected';
	integrations: AgentIntegrationStatusEntry[];
}

export interface AgentDisconnectIntegrationResponse {
	status: 'disconnected';
	warning?: AgentIntegrationDisconnectWarning;
}

export interface AgentIntegrationDisconnectWarning {
	integrationType: string;
	code: string;
	action?: {
		type: 'open_url';
		url: string;
	};
	details?: Record<string, string>;
}

export interface AgentSkillReference {
	path: string;
	content: string;
}

export interface AgentSkill {
	name: string;
	description: string;
	instructions: string;
	allowedTools?: string[];
	references?: AgentSkillReference[];
}

export interface AgentSkillMutationResponse {
	id: string;
	skill: AgentSkill;
	versionId: string | null;
}

export interface AgentVersionDto {
	versionId: string;
	schema: AgentJsonConfig | null;
	skills: Record<string, AgentSkill> | null;
	author: string;
}

export interface AgentFileDto {
	id: string;
	agentId: string;
	fileName: string;
	mimeType: string;
	fileSizeBytes: number;
	createdAt: string;
}

export interface AgentVersionListItemDto {
	versionId: string;
	agentId: string;
	createdAt: string;
	updatedAt: string;
	author: string;
	isActive: boolean;
}

/**
 * Lightweight capability metadata for the AI Agent node card.
 */
export interface AgentCapabilityModel {
	/** Provider prefix of the model id, e.g. 'anthropic'. Empty when the id has no prefix. */
	provider: string;
	/** Model name, e.g. 'claude-sonnet-4-5'. */
	model: string;
}

export interface AgentCapabilityChannel {
	/** Integration platform, e.g. 'slack' | 'telegram' | 'linear'. */
	type: string;
}

export interface AgentCapabilityTool {
	type: 'custom' | 'workflow' | 'node';
	name: string;
	/**
	 * Node type + version for `type: 'node'` tools. Lets the card resolve the
	 * node's display name and group same-node-type tools.
	 * Absent for custom/workflow tools.
	 */
	nodeType?: string;
	nodeTypeVersion?: number;
}

export interface AgentCapabilitySkill {
	id: string;
	name: string;
}

/** MCP servers are named connections; the name is also the SDK tool-name prefix. */
export interface AgentCapabilityMcpServer {
	name: string;
}

export interface AgentCapabilityTask {
	id: string;
	name: string;
	enabled: boolean;
}

export interface AgentCapabilitySummary {
	id: string;
	name: string;
	/** Null when no model is configured yet. */
	model: AgentCapabilityModel | null;
	channels: AgentCapabilityChannel[];
	tools: AgentCapabilityTool[];
	mcpServers: AgentCapabilityMcpServer[];
	skills: AgentCapabilitySkill[];
	tasks: AgentCapabilityTask[];
}

export interface PersistedChildTraceSegment {
	id: string;
	content: string;
	startTime?: number;
	endTime?: number;
}

export interface PersistedChildTraceStep {
	toolCallId: string;
	toolName: string;
	running: boolean;
}

/** A delegated child's trace, captured from forwarded chunks and persisted on
 *  the parent's `delegate_subagent` tool call. */
export interface PersistedChildTrace {
	text: string;
	reasoningSegments: PersistedChildTraceSegment[];
	steps: PersistedChildTraceStep[];
}

export interface AgentPersistedMessageContentPart {
	type: 'text' | 'reasoning' | 'tool-call' | 'file' | (string & {});
	text?: string;
	toolName?: string;
	toolCallId?: string;
	input?: unknown;
	/** HITL payload associated with this tool call, when it suspended. */
	suspendPayload?: unknown;
	state?: string;
	output?: unknown;
	canceled?: boolean;
	error?: string;
	/** Epoch ms when this content part started. */
	startTime?: number;
	/** Epoch ms when this content part settled. */
	endTime?: number;
	/** File parts carry attachment metadata only — bytes are fetched via the attachment download route. */
	fileId?: string;
	fileName?: string;
	mimeType?: string;
	sizeBytes?: number;
	/** Live trace of a delegated child, present only on `delegate_subagent` parts. */
	childTrace?: PersistedChildTrace;
}

export interface AgentPersistedMessageDto {
	id: string;
	role: 'user' | 'assistant' | (string & {});
	content: AgentPersistedMessageContentPart[];
	/** Agent-execution turn id when this message was produced from an execution transcript. */
	executionId?: string;
	/** Outcome of the execution that produced this message. */
	executionStatus?: 'running' | 'success' | 'error' | 'cancelled' | 'interrupted';
}

export interface AgentBuilderOpenSuspension {
	toolCallId: string;
	runId: string;
	/** Client-visible suspend payload used to rebuild an interactive card after history reload. */
	suspendPayload?: unknown;
}

/** Chat history envelope returned by the agent chat messages endpoints. */
export interface AgentChatMessagesResponse {
	messages: AgentPersistedMessageDto[];
	openSuspensions: AgentBuilderOpenSuspension[];
}

export interface AgentSessionLangSmithExportResponse {
	traceId: string;
}

/**
 * Internal integration type for the in-app chat channel. Injected per-run for
 * `/chat` executions — never persisted in an agent's `integrations` array.
 */
export const N8N_CHAT_INTEGRATION_TYPE = 'n8n_chat' as const;
/** Fixed tool names for the implicit in-app chat integration (no credential suffixes). */
export const N8N_CHAT_ACTION_TOOL_NAME = 'chat_action' as const;
export const N8N_CHAT_CONTEXT_TOOL_NAME = 'chat_context' as const;
