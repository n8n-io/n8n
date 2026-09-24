import {
	APPROVAL_RESUME_SCHEMA,
	APPROVAL_SUSPEND_SCHEMA,
	Tool,
	type ApprovalResumePayload,
	type InterruptibleToolContext,
} from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import {
	DEFAULT_INTEGRATION_ACTION_TOOL_DEFINITIONS,
	DEFAULT_INTEGRATION_CONTEXT_TOOL_DEFINITIONS,
	resolveIntegrationActionDefinitions,
	resolveIntegrationContextQueryDefinitions,
} from './integration-tool-definitions';
import {
	buildActionToolDescription,
	buildContextToolDescription,
} from './integration-tool-descriptions';
import {
	executeActionToolBatch,
	executeActionToolOperation,
	executeContextToolOperation,
	INTEGRATION_ACTION_RESUME_SCHEMA,
	integrationActionApprovalKey,
} from './integration-tool-execution';
import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import {
	buildActionInputSchema,
	buildContextInputSchema,
	type RawContextToolInput,
	toSingleActionOperation,
	toSingleContextOperation,
} from './integration-tool-schema';
import type {
	IntegrationAction,
	IntegrationActionDefinition,
	IntegrationActionExecutor,
	IntegrationContextQuery,
	IntegrationContextQueryDefinition,
	IntegrationContextQueryExecutor,
	IntegrationMessageContextStore,
	IntegrationToolConnectionDescriptor,
	IntegrationToolConnectionSource,
} from './integration-tool-types';

export interface IntegrationToolCapabilities {
	contextQueries?: IntegrationContextQuery[];
	actions?: IntegrationAction[];
	contextToolDefinitions?: IntegrationContextQueryDefinition[];
	actionToolDefinitions?: IntegrationActionDefinition[];
	contextToolGuidance?: string[];
	actionToolGuidance?: string[];
}

// Suspend payload is intentionally looser than tool input: the action name has
// already been validated by the generated action schema before suspension.
const integrationActionSuspendSchema = z.object({
	type: z.literal('integration_action'),
	action: z.string(),
	integrationConnectionId: z.string(),
	messageContext: z.unknown(),
});

/**
 * The tool suspends for two unrelated reasons: an interactive card waiting on a
 * user response, and an action held for approval. The approval branch reuses the
 * SDK payload so the chat bridge renders its Approve/Deny card unchanged.
 */
const actionSuspendSchema = z.union([integrationActionSuspendSchema, APPROVAL_SUSPEND_SCHEMA]);

export function getIntegrationToolConnectionDescriptors(
	integrations: AgentIntegrationConfig[],
	agentId?: string,
	capabilitiesFor?: (
		integration: AgentIntegrationConfig,
	) => IntegrationToolCapabilities | undefined,
): IntegrationToolConnectionDescriptor[] {
	const sorted = [...integrations].sort((a, b) => {
		const byType = a.type.localeCompare(b.type);
		if (byType !== 0) return byType;
		return a.credentialId.localeCompare(b.credentialId);
	});

	const seenByType = new Map<string, number>();

	return sorted.map((integration) => {
		const seenCount = seenByType.get(integration.type) ?? 0;
		const nextCount = seenCount + 1;
		seenByType.set(integration.type, nextCount);
		const suffix = nextCount === 1 ? '' : `_${nextCount}`;
		const baseName = `${integration.type}${suffix}`;
		const capabilities = capabilitiesFor?.(integration);
		const contextToolDefinitions = getContextToolDefinitions(capabilities);
		const actionToolDefinitions = getActionToolDefinitions(capabilities);

		return {
			agentId,
			integration,
			integrationConnectionId: buildIntegrationConnectionId(integration),
			contextToolName: `${baseName}_context`,
			actionToolName: `${baseName}_action`,
			contextQueries: contextToolDefinitions.map((definition) => definition.name),
			actions: actionToolDefinitions.map((definition) => definition.name),
			contextToolDefinitions,
			actionToolDefinitions,
			contextToolGuidance: capabilities?.contextToolGuidance,
			actionToolGuidance: capabilities?.actionToolGuidance,
			...(integration.approval ? { approval: integration.approval } : {}),
		};
	});
}

export function buildIntegrationConnectionId(integration: IntegrationToolConnectionSource): string {
	return integration.credentialId === undefined
		? integration.type
		: `${integration.type}:${integration.credentialId}`;
}

export function createIntegrationContextTool(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	queryExecutor: IntegrationContextQueryExecutor;
}) {
	const { descriptor, queryExecutor } = params;

	return new Tool(descriptor.contextToolName)
		.description(buildContextToolDescription(descriptor))
		.input(buildContextInputSchema(descriptor.contextToolDefinitions))
		.handler(async (input, ctx) => {
			const toolInput = input as RawContextToolInput;
			if (toolInput.queries !== undefined) {
				const results = await Promise.all(
					toolInput.queries.map(async (rawOperation) => {
						const operation = toSingleContextOperation(rawOperation);
						return {
							query: operation.query,
							result: await executeContextToolOperation({
								operation,
								descriptor,
								queryExecutor,
								persistence: ctx.persistence,
							}),
						};
					}),
				);

				return { ok: true, results };
			}

			return await executeContextToolOperation({
				operation: toSingleContextOperation(toolInput),
				descriptor,
				queryExecutor,
				persistence: ctx.persistence,
			});
		});
}

export function createIntegrationActionTool(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	actionExecutor: IntegrationActionExecutor;
}) {
	const { descriptor, messageContextStore, actionExecutor } = params;

	return new Tool(descriptor.actionToolName)
		.description(buildActionToolDescription(descriptor))
		.input(buildActionInputSchema(descriptor.actionToolDefinitions))
		.suspend(actionSuspendSchema)
		.resume(INTEGRATION_ACTION_RESUME_SCHEMA)
		.handler(async (input, ctx) => {
			const interruptCtx = ctx as InterruptibleToolContext;
			const approvalDecision = readApprovalDecision(interruptCtx);

			// A card resume carries the user's answer straight back to the model. An
			// approval resume is a decision about work that has not run yet, so it
			// either falls through to execution below or stops here.
			if (approvalDecision === undefined && ctx.resumeData) {
				return ctx.resumeData;
			}
			if (approvalDecision) {
				const { action, ...decision } = approvalDecision;
				if (decision.scope === 'session' && !ctx.approvalContext) {
					throw new UserError('Session approvals are not available for this tool.');
				}
				await ctx.approvalContext?.onDecision(
					integrationActionApprovalKey(descriptor.integrationConnectionId, action),
					decision,
				);
				ctx.abortSignal?.throwIfAborted();
			}
			if (approvalDecision?.approved === false) {
				return {
					ok: false,
					error: {
						code: INTEGRATION_ERROR_CODES.ACTION_DECLINED,
						message: `The action "${approvalDecision.action}" was not approved.`,
					},
				};
			}

			const toolInput = input;

			if (toolInput.actions !== undefined) {
				return await executeActionToolBatch({
					operations: toolInput.actions.map(toSingleActionOperation),
					descriptor,
					messageContextStore,
					actionExecutor,
					ctx,
				});
			}

			return await executeActionToolOperation({
				operation: toSingleActionOperation(toolInput),
				descriptor,
				messageContextStore,
				actionExecutor,
				ctx,
				interruptCtx,
				allowSuspend: true,
				...(approvalDecision ? { approvedAction: approvalDecision.action } : {}),
			});
		});
}

/**
 * The decision a user made on an approval card, or undefined when this is not
 * an approval resume. `suspendPayload` is what the tool suspended with, so it
 * tells the two suspend reasons apart without guessing from the resume shape.
 */
function readApprovalDecision(
	ctx: InterruptibleToolContext,
): ({ action: string } & ApprovalResumePayload) | undefined {
	const payload = APPROVAL_SUSPEND_SCHEMA.safeParse(ctx.suspendPayload);
	if (!payload.success) return undefined;

	const resume = APPROVAL_RESUME_SCHEMA.safeParse(ctx.resumeData);
	return {
		action: payload.data.toolName,
		// An unreadable resume payload is not consent.
		...(resume.success ? resume.data : { approved: false }),
	};
}

function getContextToolDefinitions(
	capabilities: IntegrationToolCapabilities | undefined,
): IntegrationContextQueryDefinition[] {
	if (capabilities?.contextToolDefinitions) return [...capabilities.contextToolDefinitions];
	if (capabilities?.contextQueries)
		return resolveIntegrationContextQueryDefinitions(capabilities.contextQueries);
	return [...DEFAULT_INTEGRATION_CONTEXT_TOOL_DEFINITIONS];
}

function getActionToolDefinitions(
	capabilities: IntegrationToolCapabilities | undefined,
): IntegrationActionDefinition[] {
	if (capabilities?.actionToolDefinitions) return [...capabilities.actionToolDefinitions];
	if (capabilities?.actions) return resolveIntegrationActionDefinitions(capabilities.actions);
	return [...DEFAULT_INTEGRATION_ACTION_TOOL_DEFINITIONS];
}
