import { Tool, type InterruptibleToolContext } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
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
} from './integration-tool-execution';
import {
	buildActionInputSchema,
	buildContextInputSchema,
	type RawActionToolInput,
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
const actionSuspendSchema = z.object({
	type: z.literal('integration_action'),
	action: z.string(),
	integrationConnectionId: z.string(),
	messageContext: z.unknown(),
});

const actionResumeSchema = z.record(z.string(), z.unknown());

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
	messageContextStore: IntegrationMessageContextStore;
	queryExecutor: IntegrationContextQueryExecutor;
}) {
	const { descriptor, messageContextStore, queryExecutor } = params;

	return new Tool(descriptor.contextToolName)
		.description(buildContextToolDescription(descriptor))
		.input(buildContextInputSchema(descriptor.contextToolDefinitions))
		.handler(async (input, ctx) => {
			const toolInput = input as RawContextToolInput;
			if (toolInput.queries !== undefined) {
				const results = await Promise.all(
					toolInput.queries.map(async (operation) => ({
						query: operation.query,
						result: await executeContextToolOperation({
							operation,
							descriptor,
							messageContextStore,
							queryExecutor,
							persistence: ctx.persistence,
						}),
					})),
				);

				return { ok: true, results };
			}

			return await executeContextToolOperation({
				operation: toSingleContextOperation(toolInput),
				descriptor,
				messageContextStore,
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
		.resume(actionResumeSchema)
		.handler(async (input, ctx) => {
			if (ctx.resumeData) {
				return ctx.resumeData;
			}

			const interruptCtx = ctx as InterruptibleToolContext;
			const toolInput = input as RawActionToolInput;

			if (toolInput.actions !== undefined) {
				return await executeActionToolBatch({
					operations: toolInput.actions,
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
			});
		});
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
