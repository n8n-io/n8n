import crypto from 'node:crypto';

import type { AgentTaskResult } from '@/services/agents/agents.types';

// ─── A2A Protocol Types (v0.3, ProtoJSON camelCase) ─────────────────────────

export interface A2APart {
	text?: string;
	data?: unknown;
	metadata?: Record<string, unknown>;
}

export interface A2AMessage {
	messageId: string;
	role: 'user' | 'agent';
	parts: A2APart[];
	contextId?: string;
	taskId?: string;
	metadata?: Record<string, unknown>;
}

export interface A2ATaskStatus {
	state:
		| 'submitted'
		| 'working'
		| 'completed'
		| 'failed'
		| 'canceled'
		| 'input-required'
		| 'rejected'
		| 'auth-required';
	message?: A2AMessage;
	timestamp?: string;
}

export interface A2AArtifact {
	artifactId: string;
	name?: string;
	description?: string;
	parts: A2APart[];
	metadata?: Record<string, unknown>;
}

export interface A2ATask {
	id: string;
	contextId: string;
	status: A2ATaskStatus;
	artifacts?: A2AArtifact[];
	history?: A2AMessage[];
	metadata?: Record<string, unknown>;
}

export interface A2ASendMessageRequest {
	message: A2AMessage;
	// A2A spec: taskId at request root level to continue an existing task
	taskId?: string;
	contextId?: string;
	configuration?: {
		acceptedOutputModes?: string[];
		blocking?: boolean;
		historyLength?: number;
	};
	metadata?: Record<string, unknown>;
}

export interface A2ASendMessageResponse {
	task: A2ATask;
}

export interface A2AStatusUpdateEvent {
	taskId: string;
	contextId: string;
	status: A2ATaskStatus;
}

export interface A2AArtifactUpdateEvent {
	taskId: string;
	contextId: string;
	artifact: A2AArtifact;
	lastChunk?: boolean;
}

export type A2AStreamResponse =
	| { statusUpdate: A2AStatusUpdateEvent }
	| { artifactUpdate: A2AArtifactUpdateEvent }
	| { task: A2ATask };

// ─── A2A Agent Card Types ────────────────────────────────────────────────────

export interface A2AAgentCard {
	name: string;
	description?: string;
	url?: string;
	version?: string;
	capabilities?: {
		streaming?: boolean;
		pushNotifications?: boolean;
		multiTurn?: boolean;
	};
	skills?: Array<{ id?: string; name: string; description?: string }>;
	securitySchemes?: unknown;
	// n8n-specific fields
	requiredCredentials?: Array<{ type: string; description?: string }>;
	interfaces?: Record<string, unknown>;
}

// ─── JSON-RPC 2.0 Helpers ───────────────────────────────────────────────────

export interface JsonRpcRequest {
	jsonrpc: '2.0';
	method: string;
	id: string;
	params: Record<string, unknown>;
	[key: string]: unknown;
}

/** Wraps params in a JSON-RPC 2.0 envelope. */
export function wrapJsonRpc(method: string, params: Record<string, unknown>): JsonRpcRequest {
	return {
		jsonrpc: '2.0',
		method,
		id: crypto.randomUUID(),
		params,
	};
}

/** Extracts params from a JSON-RPC envelope, or returns the data as-is if not wrapped. */
export function unwrapJsonRpc(data: Record<string, unknown>): Record<string, unknown> {
	if (data.jsonrpc === '2.0' && typeof data.params === 'object' && data.params !== null) {
		return data.params as Record<string, unknown>;
	}
	return data;
}

// ─── Type Guard: A2A vs Internal Stream Events ──────────────────────────────

/** Returns true if the parsed JSON is an A2A SSE event (statusUpdate, artifactUpdate, or task). */
export function isA2AStreamEvent(
	event: Record<string, unknown>,
): event is { statusUpdate: unknown } | { artifactUpdate: unknown } | { task: unknown } {
	return 'statusUpdate' in event || 'artifactUpdate' in event || 'task' in event;
}

// ─── Reverse Adapter: A2A → Internal ────────────────────────────────────────

/** Converts a single A2A SSE event to n8n internal format. Returns null for events to skip. */
export function a2aStreamEventToInternal(event: A2AStreamResponse): Record<string, unknown> | null {
	if ('statusUpdate' in event) {
		const { state, message } = event.statusUpdate.status;

		// Skip initial ack and input-required states — no UI representation
		if (state === 'submitted' || state === 'input-required') return null;

		const text = message?.parts?.[0]?.text ?? 'Working...';
		const metadata = message?.parts?.[0]?.metadata;

		// If metadata has n8n-specific fields (from another n8n instance via A2A), preserve them
		if (metadata?.action) {
			const step: Record<string, unknown> = {
				type: 'task.action',
				action: metadata.action,
				origin: 'external',
			};
			if (metadata.workflowName) step.workflowName = metadata.workflowName;
			if (metadata.targetUserName) step.targetUserName = metadata.targetUserName;
			if (metadata.reasoning) step.reasoning = metadata.reasoning;
			return step;
		}

		// Generic A2A agent — use text as action
		return { type: 'task.action', action: text, origin: 'external' };
	}

	if ('artifactUpdate' in event) {
		const { parts } = event.artifactUpdate.artifact;
		const textPart = parts.find((p) => p.text !== undefined);
		const dataPart = parts.find((p) => p.data !== undefined);

		// If data part has n8n observation structure, extract it
		if (
			dataPart?.data &&
			typeof dataPart.data === 'object' &&
			'action' in (dataPart.data as Record<string, unknown>)
		) {
			const obsData = dataPart.data as Record<string, unknown>;
			const obs: Record<string, unknown> = {
				type: 'task.observation',
				action: obsData.action,
				result: obsData.result,
			};
			if (obsData.workflowName) obs.workflowName = obsData.workflowName;
			if (obsData.targetUserName) obs.targetUserName = obsData.targetUserName;
			if (obsData.summary) obs.summary = obsData.summary;
			return obs;
		}

		// Generic artifact
		return {
			type: 'task.observation',
			result: textPart?.text ?? JSON.stringify(dataPart?.data ?? ''),
		};
	}

	if ('task' in event) {
		const { state, message } = event.task.status;
		const summary =
			message?.parts?.[0]?.text ??
			event.task.artifacts?.[0]?.parts?.[0]?.text ??
			(state === 'completed' ? 'Task completed' : 'Task failed');
		return {
			type: 'task.completion',
			status: state === 'completed' ? 'completed' : 'error',
			summary,
		};
	}

	return null;
}

// ─── Forward Adapter: Internal → A2A Request ────────────────────────────────

/** Builds an A2A v0.3 message/stream request wrapped in JSON-RPC 2.0. */
export function toA2ASendMessageRequest(
	prompt: string,
	byokCredentials?: Record<string, unknown>,
): JsonRpcRequest {
	const message: A2AMessage = {
		messageId: crypto.randomUUID(),
		role: 'user',
		parts: [{ text: prompt }],
	};

	const params: Record<string, unknown> = { message };

	if (byokCredentials) {
		params.metadata = { byokCredentials };
	}

	return wrapJsonRpc('message/stream', params);
}

/** Builds an A2A v0.2 tasks/send request wrapped in JSON-RPC 2.0. */
export function toA2ATaskSendRequest(
	prompt: string,
	byokCredentials?: Record<string, unknown>,
): JsonRpcRequest {
	const params: Record<string, unknown> = {
		id: crypto.randomUUID(),
		message: {
			role: 'user',
			parts: [{ type: 'text', text: prompt }],
		},
	};

	if (byokCredentials) {
		params.metadata = { byokCredentials };
	}

	return wrapJsonRpc('tasks/send', params);
}

// ─── Endpoint Classification ────────────────────────────────────────────────

export type EndpointType = 'n8n' | 'a2a-v03' | 'a2a-v02';

/** Classifies a remote URL to determine the correct request format. */
export function classifyEndpoint(url: string): EndpointType {
	if (/\/api\/v\d+\/agents\//.test(url)) return 'n8n';
	if (/\/message:(stream|send)/.test(url)) return 'a2a-v03';
	return 'a2a-v02';
}

/** Builds the correct request body for the given endpoint type. */
export function buildRequestBody(
	endpointType: EndpointType,
	prompt: string,
	byokCredentials?: Record<string, unknown>,
): Record<string, unknown> {
	switch (endpointType) {
		case 'n8n':
			return { prompt, ...(byokCredentials ? { byokCredentials } : {}) };
		case 'a2a-v03':
			return toA2ASendMessageRequest(prompt, byokCredentials);
		case 'a2a-v02':
			return toA2ATaskSendRequest(prompt, byokCredentials);
	}
}

/** Builds request headers for the given endpoint type. */
export function buildRequestHeaders(
	endpointType: EndpointType,
	apiKey?: string,
): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	if (endpointType === 'n8n') {
		headers.Accept = 'text/event-stream';
		if (apiKey) headers['x-n8n-api-key'] = apiKey;
	} else {
		// Standard A2A agents use X-API-Key
		headers.Accept = 'application/json';
		if (apiKey) headers['X-API-Key'] = apiKey;
	}

	return headers;
}

// ─── Response Translation ───────────────────────────────────────────────────

/** Translates a non-streaming A2A JSON response to n8n's internal format. */
export function a2aResponseToInternal(data: Record<string, unknown>): Record<string, unknown> {
	// Unwrap JSON-RPC envelope if present
	const result = (
		data.jsonrpc === '2.0' ? ((data.result as Record<string, unknown>) ?? data) : data
	) as Record<string, unknown>;

	// Handle A2A task object (has status.state)
	const status = result.status as { state?: string; message?: A2AMessage } | undefined;
	if (status?.state) {
		const artifacts = result.artifacts as A2AArtifact[] | undefined;
		const summary =
			status.message?.parts?.[0]?.text ??
			artifacts?.[0]?.parts?.[0]?.text ??
			(status.state === 'completed' ? 'Task completed' : 'Task failed');

		return {
			status: status.state === 'completed' ? 'completed' : 'error',
			summary,
			message: status.state !== 'completed' ? summary : undefined,
		};
	}

	return data;
}

// ─── Agent Card Normalization ───────────────────────────────────────────────

/** Normalizes a standard A2A agent card to n8n's expected shape. */
export function normalizeAgentCard(card: Record<string, unknown>): A2AAgentCard {
	// If it already has n8n-specific fields, pass through
	if ('requiredCredentials' in card || 'interfaces' in card) {
		return card as unknown as A2AAgentCard;
	}

	const capabilities = card.capabilities as Record<string, unknown> | undefined;
	const skills = card.skills as
		| Array<{ id?: string; name: string; description?: string }>
		| undefined;

	return {
		name: String(card.name ?? 'Unknown Agent'),
		description: card.description ? String(card.description) : undefined,
		url: card.url ? String(card.url) : undefined,
		version: card.version ? String(card.version) : undefined,
		capabilities: {
			streaming: Boolean(capabilities?.streaming ?? false),
			multiTurn: Boolean(capabilities?.multiTurn ?? false),
		},
		skills: skills ?? [],
		requiredCredentials: [],
		interfaces: {},
	};
}

// ─── Adapter: A2A ↔ Internal ─────────────────────────────────────────────────

export function fromA2ARequest(req: A2ASendMessageRequest): {
	prompt: string;
	taskId: string;
	contextId: string;
} {
	const textParts = req.message.parts.filter((p) => p.text !== undefined).map((p) => p.text!);
	const prompt = textParts.join('\n') || '';

	return {
		prompt,
		// A2A spec puts taskId/contextId at request root; fall back to message level for compat
		taskId: req.taskId ?? req.message.taskId ?? crypto.randomUUID(),
		contextId: req.contextId ?? req.message.contextId ?? crypto.randomUUID(),
	};
}

export function toA2AResponse(
	result: AgentTaskResult,
	taskId: string,
	contextId: string,
): A2ASendMessageResponse {
	const state = result.status === 'completed' ? 'completed' : 'failed';

	const artifacts: A2AArtifact[] = [];

	if (result.summary) {
		artifacts.push({
			artifactId: crypto.randomUUID(),
			name: 'result',
			parts: [{ text: result.summary }],
		});
	}

	if (result.steps.length > 0) {
		artifacts.push({
			artifactId: crypto.randomUUID(),
			name: 'execution-log',
			parts: [{ data: result.steps }],
		});
	}

	const status: A2ATaskStatus = {
		state,
		timestamp: new Date().toISOString(),
	};

	if (result.message) {
		status.message = {
			messageId: crypto.randomUUID(),
			role: 'agent',
			parts: [{ text: result.message }],
		};
	}

	return {
		task: {
			id: taskId,
			contextId,
			status,
			artifacts: artifacts.length > 0 ? artifacts : undefined,
		},
	};
}

export function internalStepToA2AStream(
	event: Record<string, unknown>,
	taskId: string,
	contextId: string,
): A2AStreamResponse {
	const type = event.type as string;

	if (type === 'task.action') {
		const description =
			event.action === 'execute_workflow'
				? `Executing workflow: ${String(event.workflowName)}`
				: event.action === 'delegate'
					? `Delegating to agent: ${String(event.targetUserName)}`
					: `Action: ${String(event.action)}`;

		const metadata: Record<string, unknown> = {
			reasoning: event.reasoning,
			action: event.action,
		};
		if (event.workflowName) metadata.workflowName = event.workflowName;
		if (event.targetUserName) metadata.targetUserName = event.targetUserName;

		return {
			statusUpdate: {
				taskId,
				contextId,
				status: {
					state: 'working',
					timestamp: new Date().toISOString(),
					message: {
						messageId: crypto.randomUUID(),
						role: 'agent',
						parts: [{ text: description, metadata }],
					},
				},
			},
		};
	}

	if (type === 'task.observation') {
		const obsData: Record<string, unknown> = {
			action: event.action,
			result: event.result,
		};
		if (event.workflowName) obsData.workflowName = event.workflowName;
		if (event.targetUserName) obsData.targetUserName = event.targetUserName;
		if (event.summary) obsData.summary = event.summary;

		return {
			artifactUpdate: {
				taskId,
				contextId,
				artifact: {
					artifactId: crypto.randomUUID(),
					name: `observation-${String(event.action)}`,
					parts: [{ data: obsData }],
				},
				lastChunk: false,
			},
		};
	}

	// 'task.completion' events map to the final task object
	const status: A2ATaskStatus = {
		state: event.status === 'completed' ? 'completed' : 'failed',
		timestamp: new Date().toISOString(),
	};

	if (event.summary) {
		status.message = {
			messageId: crypto.randomUUID(),
			role: 'agent',
			parts: [{ text: String(event.summary) }],
		};
	}

	return {
		task: { id: taskId, contextId, status },
	};
}

export const A2A_VERSION = '0.3';
