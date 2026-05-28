import { Tool, type InterruptibleToolContext, type ToolContext } from '@n8n/agents';
import { z } from 'zod';

import type { AgentCredentialIntegrationConfig } from '@n8n/api-types';

export type IntegrationMessageTarget =
	| {
			type: 'thread';
			threadId: string;
			channelId?: string;
			userId?: string;
	  }
	| {
			type: 'channel';
			channelId: string;
			threadId?: string;
	  }
	| {
			type: 'dm';
			userId: string;
			threadId?: string;
	  };

export interface IntegrationMessageContext {
	integrationConnectionId: string;
	platform: string;
	target: IntegrationMessageTarget;
	messageId?: string;
	interactingUserId?: string;
	updatedAt: string;
}

export interface IntegrationToolConnectionDescriptor {
	agentId?: string;
	integration: AgentCredentialIntegrationConfig;
	integrationConnectionId: string;
	contextToolName: string;
	actionToolName: string;
	contextQueries: IntegrationContextQuery[];
	actions: IntegrationAction[];
}

export interface IntegrationMessageContextStore {
	getLatest(threadId: string): Promise<IntegrationMessageContext | null>;
	setLatest(
		threadId: string,
		resourceId: string,
		context: IntegrationMessageContext,
	): Promise<void>;
}

export interface IntegrationContextQueryExecutor {
	execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		query: IntegrationContextQuery;
		input: Record<string, unknown>;
		persistence?: { threadId: string; resourceId: string };
	}): Promise<unknown>;
}

export interface IntegrationActionExecutor {
	execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		action: IntegrationAction;
		input: Record<string, unknown>;
		awaitResponse: boolean;
		runId?: string;
		toolCallId?: string;
		currentMessageContext?: IntegrationMessageContext;
	}): Promise<IntegrationActionResult>;
}

export type IntegrationContextQuery =
	| 'get_current_message_context'
	| 'get_user'
	| 'get_channel_info';

export type IntegrationAction = 'respond' | 'send_dm' | 'send_channel_message';

export type IntegrationActionResult =
	| {
			ok: true;
			messageContext?: IntegrationMessageContext;
			[key: string]: unknown;
	  }
	| {
			ok: false;
			error: {
				code: string;
				message: string;
			};
	  };

export const DEFAULT_INTEGRATION_CONTEXT_QUERIES: IntegrationContextQuery[] = [
	'get_current_message_context',
	'get_user',
	'get_channel_info',
];

export const DEFAULT_INTEGRATION_ACTIONS: IntegrationAction[] = [
	'respond',
	'send_dm',
	'send_channel_message',
];

const fieldPairSchema = z.object({
	label: z.string(),
	value: z.string(),
});

const selectOptionSchema = z.object({
	label: z.string(),
	value: z.string(),
	description: z.string().optional(),
});

const richComponentSchema = z.object({
	type: z.string(),
	text: z.string().optional(),
	label: z.string().optional(),
	value: z.string().optional(),
	style: z.enum(['primary', 'danger']).optional(),
	url: z.string().optional(),
	alt: z.string().optional(),
	altText: z.string().optional(),
	id: z.string().optional(),
	placeholder: z.string().optional(),
	options: z.array(selectOptionSchema).optional(),
	fields: z.array(fieldPairSchema).optional(),
});

const messageSchema = z.object({
	text: z.string().optional(),
	richInteraction: z
		.object({
			awaitResponse: z.boolean().optional(),
			title: z.string().optional(),
			message: z.string().optional(),
			components: z.array(richComponentSchema).min(1),
		})
		.optional(),
});

function buildContextInputSchema(queries: IntegrationContextQuery[]) {
	return z.object({
		query: z.enum(toZodEnumValues(queries)),
		input: z.record(z.string(), z.unknown()).default({}),
	});
}

function buildActionInputSchema(actions: IntegrationAction[]) {
	return z.object({
		action: z.enum(toZodEnumValues(actions)),
		input: z.record(z.string(), z.unknown()),
	});
}

const actionSuspendSchema = z.object({
	type: z.literal('integration_action'),
	action: z.enum(['respond', 'send_dm', 'send_channel_message']),
	integrationConnectionId: z.string(),
	messageContext: z.unknown(),
});

const actionResumeSchema = z.record(z.string(), z.unknown());

export function getIntegrationToolConnectionDescriptors(
	integrations: AgentCredentialIntegrationConfig[],
	agentId?: string,
	capabilitiesFor?: (integration: AgentCredentialIntegrationConfig) => {
		contextQueries?: IntegrationContextQuery[];
		actions?: IntegrationAction[];
	},
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

		return {
			agentId,
			integration,
			integrationConnectionId: buildIntegrationConnectionId(integration),
			contextToolName: `${baseName}_context`,
			actionToolName: `${baseName}_action`,
			contextQueries: capabilities?.contextQueries ?? DEFAULT_INTEGRATION_CONTEXT_QUERIES,
			actions: capabilities?.actions ?? DEFAULT_INTEGRATION_ACTIONS,
		};
	});
}

export function buildIntegrationConnectionId(
	integration: Pick<AgentCredentialIntegrationConfig, 'type' | 'credentialId'>,
): string {
	return `${integration.type}:${integration.credentialId}`;
}

export function createIntegrationContextTool(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	queryExecutor: IntegrationContextQueryExecutor;
}) {
	const { descriptor, messageContextStore, queryExecutor } = params;

	return new Tool(descriptor.contextToolName)
		.description(buildContextToolDescription(descriptor))
		.input(buildContextInputSchema(descriptor.contextQueries))
		.handler(async (input, ctx) => {
			const persistence = ctx.persistence;
			if (input.query === 'get_current_message_context') {
				if (!persistence) {
					return {
						ok: false,
						error: {
							code: 'NO_THREAD_CONTEXT',
							message: 'There is no current agent thread context.',
						},
					};
				}
				const context = await messageContextStore.getLatest(persistence.threadId);
				if (!context || context.integrationConnectionId !== descriptor.integrationConnectionId) {
					return { ok: true, context: null };
				}
				return { ok: true, context };
			}

			return await queryExecutor.execute({
				descriptor,
				query: input.query,
				input: input.input,
				persistence,
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
		.input(buildActionInputSchema(descriptor.actions))
		.suspend(actionSuspendSchema)
		.resume(actionResumeSchema)
		.handler(async (input, ctx) => {
			if (ctx.resumeData) {
				return ctx.resumeData;
			}

			const interruptCtx = ctx as InterruptibleToolContext;
			const persistence = ctx.persistence;
			const actionInput = input.input;
			const message = parseMessage(actionInput.message);
			const awaitsResponse = shouldAwaitResponse(message);

			let currentMessageContext: IntegrationMessageContext | undefined;
			if (input.action === 'respond') {
				const contextResult = await getRespondContext({
					descriptor,
					messageContextStore,
					persistence,
				});
				if (!contextResult.ok) {
					return contextResult;
				}
				currentMessageContext = contextResult.context;
			}

			const result = await actionExecutor.execute({
				descriptor,
				action: input.action,
				input: actionInput,
				awaitResponse: awaitsResponse,
				runId: ctx.runId,
				toolCallId: ctx.toolCallId,
				currentMessageContext,
			});

			if (!result.ok) return result;

			if (result.messageContext && persistence) {
				await messageContextStore.setLatest(
					persistence.threadId,
					persistence.resourceId,
					result.messageContext,
				);
			}

			if (!awaitsResponse) return result;

			return await interruptCtx.suspend({
				type: 'integration_action',
				action: input.action,
				integrationConnectionId: descriptor.integrationConnectionId,
				messageContext: result.messageContext,
			});
		});
}

function buildContextToolDescription(descriptor: IntegrationToolConnectionDescriptor): string {
	return [
		`Read context from the ${descriptor.integration.type} integration connection.`,
		`Available queries: ${descriptor.contextQueries.join(', ')}.`,
		'Use this tool for read-only lookup before choosing an action target.',
	].join('\n\n');
}

function buildActionToolDescription(descriptor: IntegrationToolConnectionDescriptor): string {
	return [
		`Take actions in the ${descriptor.integration.type} integration connection.`,
		`Available actions: ${descriptor.actions.join(', ')}.`,
		'respond uses the latest message context for this integration connection.',
		'send_dm and send_channel_message require explicit platform target IDs.',
		'Messages may include richInteraction components. Interactive components suspend the agent until the user responds.',
	].join('\n\n');
}

function toZodEnumValues<T extends string>(values: T[]): [T, ...T[]] {
	if (values.length === 0) {
		throw new Error('Integration tools require at least one operation.');
	}
	return values as [T, ...T[]];
}

function parseMessage(value: unknown): z.infer<typeof messageSchema> | undefined {
	const result = messageSchema.safeParse(value);
	return result.success ? result.data : undefined;
}

function shouldAwaitResponse(message: z.infer<typeof messageSchema> | undefined): boolean {
	const richInteraction = message?.richInteraction;
	if (!richInteraction) return false;
	if (richInteraction.awaitResponse === true) return true;
	return richInteraction.components.some((component) =>
		['button', 'select', 'radio_select'].includes(component.type),
	);
}

async function getRespondContext(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	persistence: ToolContext['persistence'];
}): Promise<
	| { ok: true; context: IntegrationMessageContext }
	| { ok: false; error: { code: string; message: string } }
> {
	const { descriptor, messageContextStore, persistence } = params;
	if (!persistence) {
		return {
			ok: false,
			error: {
				code: 'NO_MESSAGE_CONTEXT',
				message: 'There is no current message context. Use an explicit send action.',
			},
		};
	}

	const context = await messageContextStore.getLatest(persistence.threadId);
	if (!context) {
		return {
			ok: false,
			error: {
				code: 'NO_MESSAGE_CONTEXT',
				message: 'There is no current message context. Use an explicit send action.',
			},
		};
	}

	if (context.integrationConnectionId !== descriptor.integrationConnectionId) {
		return {
			ok: false,
			error: {
				code: 'NO_MESSAGE_CONTEXT_FOR_INTEGRATION',
				message: 'The latest message context belongs to another integration connection.',
			},
		};
	}

	return { ok: true, context };
}
