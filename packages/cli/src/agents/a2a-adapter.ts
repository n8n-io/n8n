import crypto from 'node:crypto';

import type { AgentTaskResult } from '@/services/agents/agents.types';

// ─── A2A Protocol Types (v0.3) ───────────────────────────────────────────────

export interface A2APart {
	text?: string;
	data?: unknown;
	metadata?: Record<string, unknown>;
}

export interface A2AMessage {
	message_id: string;
	role: 'user' | 'agent';
	parts: A2APart[];
	context_id?: string;
	task_id?: string;
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
	artifact_id: string;
	name?: string;
	description?: string;
	parts: A2APart[];
	metadata?: Record<string, unknown>;
}

export interface A2ATask {
	id: string;
	context_id: string;
	status: A2ATaskStatus;
	artifacts?: A2AArtifact[];
	history?: A2AMessage[];
	metadata?: Record<string, unknown>;
}

export interface A2ASendMessageRequest {
	message: A2AMessage;
	// A2A spec: task_id at request root level to continue an existing task
	task_id?: string;
	context_id?: string;
	configuration?: {
		accepted_output_modes?: string[];
		blocking?: boolean;
		history_length?: number;
	};
	metadata?: Record<string, unknown>;
}

export interface A2ASendMessageResponse {
	task: A2ATask;
}

export interface A2AStatusUpdateEvent {
	task_id: string;
	context_id: string;
	status: A2ATaskStatus;
}

export interface A2AArtifactUpdateEvent {
	task_id: string;
	context_id: string;
	artifact: A2AArtifact;
	last_chunk?: boolean;
}

export type A2AStreamResponse =
	| { status_update: A2AStatusUpdateEvent }
	| { artifact_update: A2AArtifactUpdateEvent }
	| { task: A2ATask };

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
		// A2A spec puts task_id/context_id at request root; fall back to message level for compat
		taskId: req.task_id ?? req.message.task_id ?? crypto.randomUUID(),
		contextId: req.context_id ?? req.message.context_id ?? crypto.randomUUID(),
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
			artifact_id: crypto.randomUUID(),
			name: 'result',
			parts: [{ text: result.summary }],
		});
	}

	if (result.steps.length > 0) {
		artifacts.push({
			artifact_id: crypto.randomUUID(),
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
			message_id: crypto.randomUUID(),
			role: 'agent',
			parts: [{ text: result.message }],
		};
	}

	return {
		task: {
			id: taskId,
			context_id: contextId,
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

	if (type === 'step') {
		const description =
			event.action === 'execute_workflow'
				? `Executing workflow: ${String(event.workflowName)}`
				: event.action === 'send_message'
					? `Delegating to agent: ${String(event.toAgent)}`
					: `Action: ${String(event.action)}`;

		const metadata: Record<string, unknown> = {
			reasoning: event.reasoning,
			action: event.action,
		};
		if (event.workflowName) metadata.workflowName = event.workflowName;
		if (event.toAgent) metadata.toAgent = event.toAgent;

		return {
			status_update: {
				task_id: taskId,
				context_id: contextId,
				status: {
					state: 'working',
					timestamp: new Date().toISOString(),
					message: {
						message_id: crypto.randomUUID(),
						role: 'agent',
						parts: [{ text: description, metadata }],
					},
				},
			},
		};
	}

	if (type === 'observation') {
		const obsData: Record<string, unknown> = {
			action: event.action,
			result: event.result,
		};
		if (event.workflowName) obsData.workflowName = event.workflowName;
		if (event.toAgent) obsData.toAgent = event.toAgent;
		if (event.summary) obsData.summary = event.summary;

		return {
			artifact_update: {
				task_id: taskId,
				context_id: contextId,
				artifact: {
					artifact_id: crypto.randomUUID(),
					name: `observation-${String(event.action)}`,
					parts: [{ data: obsData }],
				},
				last_chunk: false,
			},
		};
	}

	// 'done' events map to the final task object
	const status: A2ATaskStatus = {
		state: event.status === 'completed' ? 'completed' : 'failed',
		timestamp: new Date().toISOString(),
	};

	if (event.summary) {
		status.message = {
			message_id: crypto.randomUUID(),
			role: 'agent',
			parts: [{ text: String(event.summary) }],
		};
	}

	return {
		task: { id: taskId, context_id: contextId, status },
	};
}

export const A2A_VERSION = '0.3';
