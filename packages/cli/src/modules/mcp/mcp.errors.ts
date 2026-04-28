import { Time } from '@n8n/constants';
import { UserError } from 'n8n-workflow';

import { AuthError } from '@/errors/response-errors/auth.error';

import type { WorkflowNotFoundReason } from './mcp.types';

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

/**
 * Error thrown when a user attempts to connect a new MCP client but has
 * already reached the per-user limit.
 */
export class McpClientLimitReachedError extends UserError {
	readonly limit: number;

	constructor(limit: number) {
		super(`Maximum number of connected MCP clients (${limit}) reached for this user`);
		this.name = 'McpClientLimitReachedError';
		this.limit = limit;
	}
}
