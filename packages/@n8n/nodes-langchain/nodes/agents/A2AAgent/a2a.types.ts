/**
 * A2A (Agent-to-Agent) Protocol Types
 * Based on the A2A protocol specification v0.3
 * https://github.com/google-a2a/A2A
 */

/**
 * A2A Task States
 * Maps to n8n ExecutionStatus via a2a-status-mapper.ts
 */
export const A2ATaskStateList = [
	'submitted',
	'working',
	'input-required',
	'auth-required',
	'completed',
	'failed',
	'rejected',
	'canceled',
	'unknown',
] as const;

export type A2ATaskState = (typeof A2ATaskStateList)[number];

/**
 * A2A Message Part - text only for initial implementation
 */
export interface A2ATextPart {
	type: 'text';
	text: string;
}

export type A2AMessagePart = A2ATextPart;

/**
 * A2A Message - communication between agents
 */
export interface A2AMessage {
	role: 'user' | 'agent';
	parts: A2AMessagePart[];
	messageId?: string;
	taskId?: string;
	metadata?: Record<string, unknown>;
}

/**
 * A2A Task Status
 */
export interface A2ATaskStatus {
	state: A2ATaskState;
	message?: A2AMessage;
}

/**
 * A2A Artifact - output produced by a task
 */
export interface A2AArtifact {
	type: 'artifact';
	artifactId: string;
	name?: string;
	description?: string;
	parts: A2AMessagePart[];
}

/**
 * A2A Task - the central unit of work
 */
export interface A2ATask {
	type: 'task';
	id: string;
	status: A2ATaskStatus;
	artifacts?: A2AArtifact[];
}

/**
 * Push notification configuration
 */
export interface A2APushNotificationAuth {
	type: 'bearer';
	token: string;
}

export interface A2APushNotification {
	url: string;
	authentication?: A2APushNotificationAuth;
}

/**
 * A2A Skill - describes an agent capability
 */
export interface A2ASkill {
	id: string;
	name: string;
	description?: string;
}

/**
 * A2A Agent Card - describes agent identity and capabilities
 */
export interface A2AAgentCard {
	name: string;
	description?: string;
	version: string;
	url: string;
	capabilities?: {
		streaming?: boolean;
		pushNotifications?: boolean;
	};
	defaultInputModes?: string[];
	defaultOutputModes?: string[];
	skills?: A2ASkill[];
}

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest<T = unknown> {
	jsonrpc: '2.0';
	id?: string | number;
	method: string;
	params?: T;
}

/**
 * JSON-RPC 2.0 Response
 */
export interface JsonRpcResponse<T = unknown> {
	jsonrpc: '2.0';
	id?: string | number;
	result?: T;
	error?: JsonRpcError;
}

/**
 * JSON-RPC 2.0 Error
 */
export interface JsonRpcError {
	code: number;
	message: string;
	data?: unknown;
}

/**
 * A2A message/send request params
 */
export interface A2AMessageSendParams {
	message: A2AMessage;
	pushNotification?: A2APushNotification;
	metadata?: Record<string, unknown>;
}

/**
 * A2A tasks/get request params
 */
export interface A2ATasksGetParams {
	taskId: string;
	includeHistory?: boolean;
}

/**
 * A2A tasks/cancel request params
 */
export interface A2ATasksCancelParams {
	taskId: string;
}

/**
 * Standard JSON-RPC error codes
 */
export const JsonRpcErrorCodes = {
	PARSE_ERROR: -32700,
	INVALID_REQUEST: -32600,
	METHOD_NOT_FOUND: -32601,
	INVALID_PARAMS: -32602,
	INTERNAL_ERROR: -32603,
	// Custom A2A error codes
	UNSUPPORTED_OPERATION: -32001,
	TASK_NOT_FOUND: -32002,
} as const;
