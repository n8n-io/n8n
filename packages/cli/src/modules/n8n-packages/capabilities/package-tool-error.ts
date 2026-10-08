import type { CallToolResult } from '@modelcontextprotocol/server';
import { ResponseError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';

import { WorkflowAccessError } from '@/modules/mcp/mcp.errors';

import type { PackageFailureReason } from '../n8n-packages.types';
import { classifyPackageFailure } from '../package-failure-classifier';

/**
 * The `reason` of a failed package export or import for the audit log. A workflow that exists
 * but is kept out of MCP or archived is a denial or a block, not a missing entity.
 */
export function classifyWorkflowPackageFailure(error: unknown): PackageFailureReason {
	if (!(error instanceof WorkflowAccessError)) return classifyPackageFailure(error);
	if (error.reason === 'not_available_in_mcp') return 'access-denied';
	if (error.reason === 'workflow_archived') return 'blocked';
	return 'entity-not-found';
}

function isClientError(error: unknown): error is UserError | ResponseError {
	if (error instanceof UserError) return true;
	return error instanceof ResponseError && error.httpStatusCode < 500;
}

/** The blocking issues that an import error carries, for example credential type mismatches. */
function blockingIssues(error: UserError | ResponseError): unknown[] | undefined {
	if (!(error instanceof ResponseError) || !isRecord(error.meta)) return undefined;
	return Array.isArray(error.meta.issues) ? error.meta.issues : undefined;
}

/**
 * The MCP SDK keeps only the message of an error that a handler throws. Package errors that the
 * user can fix keep their details in `description` or in blocking issues, so this result keeps
 * them too. Returns undefined for other errors, which the caller throws again.
 */
export function packageToolError(error: unknown): CallToolResult | undefined {
	if (!isClientError(error)) return undefined;
	const issues = blockingIssues(error);
	const text = [
		error.message,
		error.description,
		issues ? `Issues: ${JSON.stringify(issues)}` : undefined,
	]
		.filter((part) => typeof part === 'string' && part.length > 0)
		.join(' ');
	return {
		content: [{ type: 'text', text }],
		structuredContent: { error: error.message, ...(issues ? { issues } : {}) },
		isError: true,
	};
}
