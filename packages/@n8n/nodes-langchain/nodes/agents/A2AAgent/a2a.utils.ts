/**
 * A2A Protocol Utility Functions
 */

import type { IDataObject, IHttpRequestOptions, IWebhookFunctions } from 'n8n-workflow';

import type {
	A2AAgentCard,
	A2AArtifact,
	A2AMessage,
	A2AMessageSendParams,
	A2APushNotification,
	A2ATask,
	A2ATaskState,
	JsonRpcError,
	JsonRpcRequest,
	JsonRpcResponse,
} from './a2a.types';
import { JsonRpcErrorCodes } from './a2a.types';

/**
 * Creates a JSON-RPC success response
 */
export function createJsonRpcResponse<T>(
	id: string | number | undefined,
	result: T,
): JsonRpcResponse<T> {
	return {
		jsonrpc: '2.0',
		id,
		result,
	};
}

/**
 * Creates a JSON-RPC error response
 */
export function createJsonRpcErrorResponse(
	id: string | number | undefined,
	code: number,
	message: string,
	data?: unknown,
): JsonRpcResponse {
	const error: JsonRpcError = { code, message };
	if (data !== undefined) {
		error.data = data;
	}
	return {
		jsonrpc: '2.0',
		id,
		error,
	};
}

/**
 * Creates an A2A Task response
 */
export function createA2ATask(
	taskId: string,
	state: A2ATaskState,
	message?: A2AMessage,
	artifacts?: A2AArtifact[],
): A2ATask {
	const task: A2ATask = {
		type: 'task',
		id: taskId,
		status: { state },
	};

	if (message) {
		task.status.message = message;
	}

	if (artifacts && artifacts.length > 0) {
		task.artifacts = artifacts;
	}

	return task;
}

/**
 * Creates an A2A Message
 */
export function createA2AMessage(role: 'user' | 'agent', text: string): A2AMessage {
	return {
		role,
		parts: [{ type: 'text', text }],
	};
}

/**
 * Creates an A2A Artifact
 */
export function createA2AArtifact(id: string, name: string, text: string): A2AArtifact {
	return {
		type: 'artifact',
		artifactId: id,
		name,
		parts: [{ type: 'text', text }],
	};
}

/**
 * Creates an Agent Card
 */
export function createAgentCard(
	name: string,
	url: string,
	description?: string,
	skills?: Array<{ id: string; name: string; description?: string }>,
): A2AAgentCard {
	return {
		name,
		description,
		version: '1.0.0',
		url,
		capabilities: {
			streaming: false,
			pushNotifications: true,
		},
		defaultInputModes: ['text/plain'],
		defaultOutputModes: ['text/plain'],
		skills,
	};
}

/**
 * Validates a JSON-RPC request
 */
export function validateJsonRpcRequest(body: IDataObject): {
	valid: boolean;
	request?: JsonRpcRequest;
	error?: JsonRpcResponse;
} {
	if (!body || typeof body !== 'object') {
		return {
			valid: false,
			error: createJsonRpcErrorResponse(
				undefined,
				JsonRpcErrorCodes.INVALID_REQUEST,
				'Invalid request: body must be an object',
			),
		};
	}

	if (body.jsonrpc !== '2.0') {
		return {
			valid: false,
			error: createJsonRpcErrorResponse(
				body.id as string | number | undefined,
				JsonRpcErrorCodes.INVALID_REQUEST,
				'Invalid request: jsonrpc version must be "2.0"',
			),
		};
	}

	if (typeof body.method !== 'string') {
		return {
			valid: false,
			error: createJsonRpcErrorResponse(
				body.id as string | number | undefined,
				JsonRpcErrorCodes.INVALID_REQUEST,
				'Invalid request: method must be a string',
			),
		};
	}

	return {
		valid: true,
		request: body as unknown as JsonRpcRequest,
	};
}

/**
 * Extracts message text from A2A message parts
 */
export function extractMessageText(message: A2AMessage): string {
	return message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('\n');
}

/**
 * Parses message/send params
 */
export function parseMessageSendParams(params: unknown): {
	valid: boolean;
	data?: A2AMessageSendParams;
	error?: string;
} {
	if (!params || typeof params !== 'object') {
		return { valid: false, error: 'params must be an object' };
	}

	const p = params as IDataObject;

	if (!p.message || typeof p.message !== 'object') {
		return { valid: false, error: 'params.message is required' };
	}

	const message = p.message as IDataObject;

	if (!message.parts || !Array.isArray(message.parts)) {
		return { valid: false, error: 'params.message.parts must be an array' };
	}

	return {
		valid: true,
		data: params as unknown as A2AMessageSendParams,
	};
}

/**
 * Sends a push notification to the callback URL
 */
export async function sendPushNotification(
	ctx: IWebhookFunctions,
	pushNotification: A2APushNotification,
	task: A2ATask,
): Promise<void> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: pushNotification.url,
		body: task,
		headers: {
			'Content-Type': 'application/json',
		},
	};

	if (pushNotification.authentication?.type === 'bearer') {
		options.headers = {
			...options.headers,
			Authorization: `Bearer ${pushNotification.authentication.token}`,
		};
	}

	try {
		await ctx.helpers.httpRequest(options);
	} catch (error) {
		ctx.logger.error('Failed to send A2A push notification', {
			error: error instanceof Error ? error.message : String(error),
			url: pushNotification.url,
			taskId: task.id,
		});
		// Don't throw - push notification failure shouldn't fail the workflow
	}
}
