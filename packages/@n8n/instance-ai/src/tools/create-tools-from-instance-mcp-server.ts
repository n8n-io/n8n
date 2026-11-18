import { Tool, hasMcpMediaContent, mcpContentToModelParts } from '@n8n/agents';
import type { InstanceAiPermissions, McpToolCallResult } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import { recordSessionOwnedWorkflow } from './workflows/workflow-build-context';
import type { McpToolNameValidationError } from '../agent/mcp-tool-name-validation';
import { addSafeMcpTools, createClaimedToolNames } from '../agent/mcp-tool-name-validation';
import type { McpSchemaSanitizationError } from '../agent/sanitize-mcp-schemas';
import { sanitizeMcpToolSchemas } from '../agent/sanitize-mcp-schemas';
import type { Logger } from '../logger';
import { createToolRegistry } from '../tool-registry';
import type {
	InstanceAiContext,
	InstanceAiToolRegistry,
	InstanceMcpCallToolOptions,
	InstanceMcpCallToolResult,
	InstanceMcpInputRequiredResult,
	InstanceMcpServer,
	InstanceMcpToolDefinition,
} from '../types';
import {
	approvalSuspendPayload,
	elicitationResumeSchema,
	elicitationSuspendSchema,
	formContinuation,
	formSuspendPayload,
	readContinuation,
	readElicitation,
	resolveApprovalPolicy,
	toElicitResult,
	type ElicitationContinuation,
	type ElicitationResumeData,
	type ElicitationSuspendPayload,
} from './instance-mcp-elicitation';

export const INSTANCE_MCP_SOURCE = 'instance MCP';

/** The `_meta` key the instance server stamps on a tool to name its tool group. */
export const INSTANCE_MCP_GROUP_META_KEY = 'n8n/group';

export interface InstanceMcpBridgedTools {
	tools: InstanceAiToolRegistry;
	/** Tool group by tool name, read from the server's `_meta`. */
	groups: Map<string, string>;
}

function isInputRequired(
	result: InstanceMcpCallToolResult,
): result is InstanceMcpInputRequiredResult {
	return 'resultType' in result && result.resultType === 'input_required';
}

function isMcpToolCallResult(value: unknown): value is McpToolCallResult {
	return isRecord(value) && Array.isArray(value.content);
}

function unsupportedInputRequest(result: InstanceMcpInputRequiredResult): McpToolCallResult {
	const methods = Object.values(result.inputRequests ?? {}).map((request) => request.method);
	return {
		content: [
			{
				type: 'text',
				text: `The tool asked for input the Assistant cannot provide (${methods.join(', ') || 'unknown'}).`,
			},
		],
		isError: true,
	};
}

/**
 * Admin rules the native tools checked before a write that asks no confirmation.
 * The server does not ask for a create, so the client applies the rule itself.
 */
const BLOCKING_PERMISSION_BY_TOOL: Readonly<Record<string, keyof InstanceAiPermissions>> = {
	create_workflow_from_code: 'createWorkflow',
};

/** Server tools whose success creates or changes a workflow the chat should show. */
const WORKFLOW_WRITE_TOOLS: ReadonlySet<string> = new Set([
	'create_workflow_from_code',
	'update_workflow',
	'build_workflow',
]);

/** The server names a caller's workspace by key; the Assistant binds it to its thread. */
const WORKSPACE_KEY_PARAM = 'workspaceKey';

/**
 * Hides `workspaceKey` from the model: the server is stateless and asks the
 * caller to name its workspace, the Assistant always means the thread's.
 */
function withoutWorkspaceKey(schema: InstanceMcpToolDefinition['inputSchema']): {
	schema: InstanceMcpToolDefinition['inputSchema'];
	bound: boolean;
} {
	const properties = isRecord(schema.properties) ? schema.properties : undefined;
	if (!properties || !(WORKSPACE_KEY_PARAM in properties)) return { schema, bound: false };
	const { [WORKSPACE_KEY_PARAM]: _hidden, ...rest } = properties;
	const required = Array.isArray(schema.required)
		? schema.required.filter((name) => name !== WORKSPACE_KEY_PARAM)
		: undefined;
	return {
		schema: { ...schema, properties: rest, ...(required ? { required } : {}) },
		bound: true,
	};
}

/**
 * What the native build tool did after a save and the protocol cannot carry:
 * the workflow tab in the chat, and the thread's ownership of a workflow it
 * created (which lets later edits of it skip the approval card).
 */
async function afterWorkflowWrite(
	context: InstanceAiContext,
	toolName: string,
	result: InstanceMcpCallToolResult,
): Promise<void> {
	if (!WORKFLOW_WRITE_TOOLS.has(toolName) || !isMcpToolCallResult(result) || result.isError) return;
	const output = result.structuredContent;
	const workflowId =
		output && typeof output.workflowId === 'string' ? output.workflowId : undefined;
	if (!workflowId) return;
	const name = output && typeof output.name === 'string' ? output.name : undefined;
	if (toolName === 'create_workflow_from_code')
		await recordSessionOwnedWorkflow(context, workflowId);
	await context.onArtifactChanged?.({
		type: 'workflow',
		id: workflowId,
		...(name ? { name } : {}),
	});
}

interface BridgeToolContext {
	resumeData: ElicitationResumeData | undefined;
	continuation?: unknown;
	abortSignal?: AbortSignal;
	suspend: (
		payload: ElicitationSuspendPayload,
		options?: { continuation?: ElicitationContinuation },
	) => Promise<never>;
}

/**
 * Builds native tools from the tools the instance MCP server lists. Names stay
 * as the server names them: these tools stand in for the Assistant's own
 * domain tools, and the catalog groups them by the server's `n8n/group`.
 *
 * Input schemas are the server's JSON Schema, passed through unchanged, so
 * the model sees exactly what an external MCP client sees.
 *
 * A tool that answers `input_required` (a confirmation before a write, or a
 * form) suspends the run on the matching card. The resumed call retries the
 * same request with the answer and the server's `requestState`, as any
 * 2026-07-28 client does. Admin rules, "Always allow" grants and Auto mode
 * apply before a card shows, as they do for the Assistant's own tools.
 */
export function createToolsFromInstanceMcpServer({
	server,
	logger,
	context,
}: {
	server: InstanceMcpServer;
	logger: Logger;
	context: InstanceAiContext;
}): InstanceMcpBridgedTools {
	const tools = createToolRegistry();
	const groups = new Map<string, string>();

	for (const definition of server.getTools()) {
		const toolName = definition.name;
		const group = definition._meta?.[INSTANCE_MCP_GROUP_META_KEY];
		if (typeof group === 'string') groups.set(toolName, group);

		const { schema: inputSchema, bound: bindsWorkspace } = withoutWorkspaceKey(
			definition.inputSchema,
		);
		const tool = new Tool(toolName)
			.description(definition.description ?? toolName)
			.input(inputSchema)
			.suspend(elicitationSuspendSchema)
			.resume(elicitationResumeSchema)
			.handler(async (input: unknown, ctx: BridgeToolContext) => {
				const args = {
					...(isRecord(input) ? input : {}),
					...(bindsWorkspace && context.threadId
						? { [WORKSPACE_KEY_PARAM]: context.threadId }
						: {}),
				};
				const call = async (
					retry?: Pick<InstanceMcpCallToolOptions, 'inputResponses' | 'requestState'>,
				) =>
					await server.callTool(
						{ name: toolName, arguments: args },
						{ abortSignal: ctx.abortSignal, ...retry },
					);

				const answerInputRequired = async (
					result: InstanceMcpInputRequiredResult,
				): Promise<unknown> => {
					const elicitation = readElicitation(result);
					if (!elicitation) return unsupportedInputRequest(result);

					if (elicitation.approval) {
						const { decision, grantKey } = resolveApprovalPolicy(
							context,
							elicitation.approval,
							args,
							toolName,
						);
						if (decision === 'blocked') {
							return { success: false, denied: true, reason: 'Action blocked by admin' };
						}
						if (decision === 'allowed') {
							const retried = await call({
								inputResponses: {
									[elicitation.key]: { action: 'accept', content: { confirm: true } },
								},
								requestState: result.requestState,
							});
							if (isInputRequired(retried)) return unsupportedInputRequest(retried);
							await afterWorkflowWrite(context, toolName, retried);
							return retried;
						}
						return await ctx.suspend(approvalSuspendPayload(elicitation), {
							continuation: formContinuation(
								elicitation,
								'approval',
								result.requestState,
								grantKey,
							),
						});
					}

					return await ctx.suspend(formSuspendPayload(elicitation), {
						continuation: formContinuation(elicitation, 'form', result.requestState),
					});
				};

				const { resumeData } = ctx;
				if (resumeData !== undefined && resumeData !== null) {
					let continuation = readContinuation(ctx.continuation);
					if (!continuation) {
						// No state survived (e.g. a resume without its checkpoint): ask the server
						// again to learn the request key and a fresh state, then answer it.
						const first = await call();
						if (!isInputRequired(first)) return first;
						const elicitation = readElicitation(first);
						if (!elicitation) return unsupportedInputRequest(first);
						continuation = formContinuation(
							elicitation,
							elicitation.approval ? 'approval' : 'form',
							first.requestState,
						);
					}
					const answer = toElicitResult(continuation, resumeData);
					if (
						continuation.kind === 'approval' &&
						answer.action === 'accept' &&
						continuation.grantKey &&
						'scope' in resumeData &&
						resumeData.scope === 'session'
					) {
						await context.grantSessionToolApproval?.(continuation.grantKey);
					}
					const result = await call({
						inputResponses: { [continuation.key]: answer },
						...(continuation.requestState !== undefined
							? { requestState: continuation.requestState }
							: {}),
					});
					// The server may ask another round; a card shows again for it.
					if (isInputRequired(result)) return await answerInputRequired(result);
					await afterWorkflowWrite(context, toolName, result);
					return result;
				}

				const blockingPermission = BLOCKING_PERMISSION_BY_TOOL[toolName];
				if (blockingPermission && context.permissions?.[blockingPermission] === 'blocked') {
					return { success: false, denied: true, reason: 'Action blocked by admin' };
				}

				const result = await call();
				if (isInputRequired(result)) return await answerInputRequired(result);
				await afterWorkflowWrite(context, toolName, result);
				return result;
			})
			// A plain value lands in the message as JSON; only media needs the content shape.
			.toModelOutput((result: unknown) => {
				if (!isMcpToolCallResult(result)) return result;
				if (result.isError) return { error: mcpTextOf(result) };
				if (hasMcpMediaContent(result.content)) {
					return { type: 'content', value: mcpContentToModelParts(result.content) };
				}
				return result.structuredContent ?? mcpTextOf(result);
			})
			.build();

		tools.set(toolName, tool);
	}

	const sanitizedTools = sanitizeMcpToolSchemas(tools, {
		onError: (error: McpSchemaSanitizationError) => {
			logger.warn('Skipped instance MCP tool with unsupported schema', {
				toolName: error.details.toolName,
				source: INSTANCE_MCP_SOURCE,
				reason: error.message,
			});
		},
	});
	const safeTools = createToolRegistry();
	addSafeMcpTools(safeTools, sanitizedTools, {
		source: INSTANCE_MCP_SOURCE,
		claimedToolNames: createClaimedToolNames([]),
		warn: (error: McpToolNameValidationError) => {
			logger.warn('Skipped instance MCP tool with unsafe name', {
				toolName: error.toolName,
				source: error.source,
				reason: error.message,
			});
		},
	});
	return { tools: safeTools, groups };
}

function mcpTextOf(result: McpToolCallResult): string {
	return result.content
		.filter((block) => block.type === 'text')
		.map((block) => block.text)
		.join('\n');
}
