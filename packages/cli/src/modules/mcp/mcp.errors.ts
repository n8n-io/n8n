import { ServerError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { Time } from '@n8n/constants';
import { UserError } from 'n8n-workflow';

import { AuthError } from '@/errors/response-errors/auth.error';

import type { WorkflowNotFoundReason } from './mcp.types';

export const buildMcpClientLimitReachedMessage = (limit: number): string =>
	`This n8n instance has reached its maximum of ${limit} registered MCP clients. Ask an administrator to revoke unused clients or raise N8N_MCP_MAX_REGISTERED_CLIENTS.`;

/**
 * Thrown from the DCR registration path when the instance-wide registered-client
 * cap is hit. Subclasses the MCP SDK's `ServerError` so that the SDK's register
 * handler surfaces our descriptive body instead of its generic
 * "Internal Server Error" fallback.
 */
export class McpClientLimitReachedError extends ServerError {
	readonly limit: number;

	constructor(limit: number) {
		super(buildMcpClientLimitReachedMessage(limit));
		this.name = 'McpClientLimitReachedError';
		this.limit = limit;
	}
}

/**
 * Error thrown when MCP workflow execution times out
 */
export class McpExecutionTimeoutError extends UserError {
	executionId: string | null;
	timeoutMs: number;

	constructor(executionId: string | null, timeoutMs: number) {
		const timeoutSeconds = timeoutMs * Time.milliseconds.toSeconds;
		super(`Workflow execution timed out after ${timeoutSeconds} seconds`);

		this.name = 'McpExecutionTimeoutError';
		this.executionId = executionId;
		this.timeoutMs = timeoutMs;
	}
}

export class JWTVerificationError extends AuthError {
	constructor() {
		super('JWT Verification Failed');
		this.name = 'JWTVerificationError';
	}
}

export class AccessTokenNotFoundError extends AuthError {
	constructor() {
		super('Access Token Not Found in Database');
		this.name = 'AccessTokenNotFoundError';
	}
}

/**
 * Error thrown when workflow access fails during MCP execution.
 * Includes a reason for better error messages and telemetry.
 */
export class WorkflowAccessError extends UserError {
	readonly reason: WorkflowNotFoundReason;

	constructor(message: string, reason: WorkflowNotFoundReason) {
		super(message);
		this.name = 'WorkflowAccessError';
		this.reason = reason;
	}
}
