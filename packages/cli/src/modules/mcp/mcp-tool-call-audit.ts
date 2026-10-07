import type { CallToolResult, InputRequiredResult } from '@modelcontextprotocol/server';
import type { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';

import type { McpCallerAuth } from '@/services/oauth-token-verifier-proxy.service';

import type { ToolHandlerResult } from './mcp.types';

/** Who called a tool and through which client. Every surface records calls with this. */
export type ToolCallAudit = {
	user: User;
	toolName: string;
	clientName?: string;
	caller?: McpCallerAuth;
};

/** Mirrors the SDK's `isInputRequiredResult` without a value import of the SDK at boot. */
function isInputRequired(result: ToolHandlerResult | undefined): result is InputRequiredResult {
	return result !== undefined && 'resultType' in result && result.resultType === 'input_required';
}

/**
 * There is no standard failure contract across MCP tools: most set MCP's
 * `isError` flag, but several catch their own errors and return a normal
 * result marked only in the structured output, via `status: 'error'`
 * (`execute_workflow`, `test_workflow`) or just an `error` message string
 * (`publish_workflow`, `unpublish_workflow`, `get_execution`). A string
 * `structuredContent.error` is set by every handled-failure shape and never
 * on success, so it doubles as failure marker and message source, with the
 * first text content item as fallback.
 */
function getToolCallOutcome(result: ToolHandlerResult | undefined): {
	status: 'success' | 'error';
	errorMessage?: string;
} {
	// A multi-round-trip handler asked the client for input; the write it reports on, if any,
	// has already been recorded by the handler itself.
	if (!result || isInputRequired(result)) return { status: 'success' };

	const { failed, errorMessage } = readFailureMarkers(result);
	if (!failed) return { status: 'success' };

	return { status: 'error', errorMessage: errorMessage ?? firstText(result) };
}

function readFailureMarkers(result: CallToolResult): { failed: boolean; errorMessage?: string } {
	// v2 types structuredContent as an arbitrary JSON value; narrow to an
	// object before reading the failure markers off it.
	const structured: Record<string, unknown> = isRecord(result.structuredContent)
		? result.structuredContent
		: {};
	const errorMessage = typeof structured.error === 'string' ? structured.error : undefined;
	const failed =
		result.isError === true || structured.status === 'error' || errorMessage !== undefined;
	return { failed, errorMessage };
}

function firstText(result: CallToolResult): string | undefined {
	return (result.content ?? []).flatMap((item) => (item.type === 'text' ? [item.text] : []))[0];
}

/**
 * Reads a `workflowId` off a tool's arguments or its structured output. Most
 * tools take the workflow they act on as an argument, but the ones that create
 * a workflow only report it back (`create_workflow_from_code`), so both sides
 * are checked.
 */
function getWorkflowId(source: unknown): string | undefined {
	if (!source || typeof source !== 'object' || !('workflowId' in source)) return undefined;
	const workflowId = source.workflowId;
	return typeof workflowId === 'string' ? workflowId : undefined;
}

/**
 * Runs one tool call and emits `mcp-tool-called` with its outcome, also when the call throws.
 * The event carries the target workflow but never the arguments, so that no input reaches
 * log streaming.
 */
export async function runAuditedToolCall<R extends ToolHandlerResult>(
	eventService: EventService,
	audit: ToolCallAudit,
	args: unknown,
	invoke: () => Promise<R>,
): Promise<R> {
	const { user, toolName, clientName, caller } = audit;
	const workflowId = getWorkflowId(args);

	try {
		const result = await invoke();
		const { status, errorMessage } = getToolCallOutcome(result);
		eventService.emit('mcp-tool-called', {
			user,
			toolName,
			workflowId:
				workflowId ??
				(isInputRequired(result) ? undefined : getWorkflowId(result?.structuredContent)),
			status,
			errorMessage,
			...caller,
			clientName,
		});
		return result;
	} catch (error) {
		eventService.emit('mcp-tool-called', {
			user,
			toolName,
			workflowId,
			status: 'error',
			errorMessage: error instanceof Error ? error.message : String(error),
			...caller,
			clientName,
		});
		throw error;
	}
}
