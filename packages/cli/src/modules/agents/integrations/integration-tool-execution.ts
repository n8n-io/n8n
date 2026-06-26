import type { InterruptibleToolContext, ToolContext } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import type { z } from 'zod';

import { messageSchema, type IntegrationCardComponent } from './integration-tool-definitions';
import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import type {
	IntegrationAction,
	IntegrationActionExecutor,
	IntegrationMessageContext,
	IntegrationMessageContextStore,
	IntegrationMessageTarget,
	IntegrationContextQuery,
	IntegrationContextQueryExecutor,
	IntegrationToolConnectionDescriptor,
} from './integration-tool-types';
import type { RawActionToolOperation, RawContextToolOperation } from './integration-tool-schema';

export async function executeContextToolOperation(params: {
	operation: RawContextToolOperation;
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	queryExecutor: IntegrationContextQueryExecutor;
	persistence: ToolContext['persistence'];
}): Promise<unknown> {
	const { operation, descriptor, messageContextStore, queryExecutor, persistence } = params;

	if (isCurrentContextQuery(operation.query)) {
		if (!persistence) {
			return {
				ok: false,
				error: {
					code: INTEGRATION_ERROR_CODES.NO_THREAD_CONTEXT,
					message: 'There is no current agent thread context.',
				},
			};
		}
		const context = await messageContextStore.getLatest(persistence.threadId);
		if (!context || context.integrationConnectionId !== descriptor.integrationConnectionId) {
			if (operation.query === 'get_current_message_context') {
				return { ok: true, context: null };
			}
			if (operation.query === 'get_current_subject') {
				return { ok: true, subject: null };
			}
			return {
				ok: false,
				error: {
					code: INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
					message: 'There is no current message context for this integration connection.',
				},
			};
		}
		if (operation.query === 'get_current_message_context') {
			return { ok: true, context };
		}
		if (operation.query === 'get_current_subject') {
			return { ok: true, subject: context.subject ?? null };
		}
		if (operation.query === 'get_current_user') {
			if (!context.interactingUserId) {
				return {
					ok: false,
					error: {
						code: INTEGRATION_ERROR_CODES.NO_INTERACTING_USER_CONTEXT,
						message: 'The latest message context does not include an interacting user ID.',
					},
				};
			}
			return await queryExecutor.execute({
				descriptor,
				query: 'get_user',
				input: { userId: context.interactingUserId },
				persistence,
			});
		}

		const channelId = getTargetChannelId(context.target);
		if (!channelId) {
			return {
				ok: false,
				error: {
					code: INTEGRATION_ERROR_CODES.NO_CHANNEL_CONTEXT,
					message: 'The latest message context does not include a channel ID.',
				},
			};
		}
		return await queryExecutor.execute({
			descriptor,
			query: 'get_channel_info',
			input: { channelId },
			persistence,
		});
	}

	return await queryExecutor.execute({
		descriptor,
		query: operation.query,
		input: operation.input,
		persistence,
	});
}

export async function executeActionToolBatch(params: {
	operations: RawActionToolOperation[];
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	actionExecutor: IntegrationActionExecutor;
	ctx: ToolContext;
}): Promise<unknown> {
	const { operations, descriptor, messageContextStore, actionExecutor, ctx } = params;
	let currentMessageContext =
		ctx.persistence !== undefined
			? await getOptionalCurrentContext({
					descriptor,
					messageContextStore,
					threadId: ctx.persistence.threadId,
				})
			: undefined;

	const results: Array<{ action: IntegrationAction; result: unknown }> = [];
	for (const operation of operations) {
		const result = await executeActionToolOperation({
			operation,
			descriptor,
			messageContextStore,
			actionExecutor,
			ctx,
			currentMessageContext,
			allowSuspend: false,
		});

		const nextMessageContext = extractSuccessfulMessageContext(result);
		if (nextMessageContext) currentMessageContext = nextMessageContext;

		results.push({ action: operation.action, result });
	}

	return { ok: true, results };
}

export async function executeActionToolOperation(params: {
	operation: RawActionToolOperation;
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	actionExecutor: IntegrationActionExecutor;
	ctx: ToolContext;
	interruptCtx?: InterruptibleToolContext;
	currentMessageContext?: IntegrationMessageContext;
	allowSuspend: boolean;
}): Promise<unknown> {
	const {
		operation,
		descriptor,
		messageContextStore,
		actionExecutor,
		ctx,
		interruptCtx,
		allowSuspend,
	} = params;
	const persistence = ctx.persistence;
	const message = parseMessage(operation.input.message);
	const actionInput = message === undefined ? operation.input : { ...operation.input, message };
	const awaitsResponse = shouldAwaitResponse(message);

	if (awaitsResponse && !allowSuspend) {
		return {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.ACTION_FAILED,
				message:
					'Batch actions cannot include cards that wait for a user response. Send that action separately.',
			},
		};
	}

	let currentMessageContext = params.currentMessageContext;
	if (operation.action === 'respond') {
		if (!currentMessageContext) {
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
	} else if (!currentMessageContext && persistence) {
		currentMessageContext = await getOptionalCurrentContext({
			descriptor,
			messageContextStore,
			threadId: persistence.threadId,
		});
	}

	const result = await actionExecutor.execute({
		descriptor,
		action: operation.action,
		input: actionInput,
		awaitResponse: awaitsResponse,
		runId: ctx.runId,
		toolCallId: ctx.toolCallId,
		currentMessageContext,
	});

	if (!result.ok) return result;

	let actionResult = result;
	if (result.messageContext && persistence) {
		const messageContext = withPreviousSubject(result.messageContext, currentMessageContext);
		await messageContextStore.setLatest(
			persistence.threadId,
			persistence.resourceId,
			messageContext,
		);
		actionResult = { ...result, messageContext };
	}

	if (!awaitsResponse) return actionResult;

	return await interruptCtx?.suspend({
		type: 'integration_action',
		action: operation.action,
		integrationConnectionId: descriptor.integrationConnectionId,
		messageContext: actionResult.messageContext,
	});
}

function isCurrentContextQuery(query: IntegrationContextQuery): boolean {
	return (
		query === 'get_current_message_context' ||
		query === 'get_current_subject' ||
		query === 'get_current_user' ||
		query === 'get_current_channel_info'
	);
}

function parseMessage(value: unknown): z.infer<typeof messageSchema> | undefined {
	const result = messageSchema.safeParse(value);
	return result.success ? result.data : undefined;
}

function shouldAwaitResponse(message: z.infer<typeof messageSchema> | undefined): boolean {
	const card = message?.card;
	if (card?.awaitResponse === true) return true;
	return card?.components.some(isInteractiveCardComponent) ?? false;
}

function isInteractiveCardComponent(component: IntegrationCardComponent): boolean {
	switch (component.type) {
		case 'button':
		case 'select':
		case 'radio_select':
			return true;
		case 'section':
			return component.button !== undefined;
		default:
			return false;
	}
}

function withPreviousSubject(
	context: IntegrationMessageContext,
	previousContext: IntegrationMessageContext | undefined,
): IntegrationMessageContext {
	if (!previousContext) return context;
	if (context.integrationConnectionId !== previousContext.integrationConnectionId) return context;
	return {
		...context,
		...(!context.subject && previousContext.subject ? { subject: previousContext.subject } : {}),
		...(!context.agentUserId && previousContext.agentUserId
			? { agentUserId: previousContext.agentUserId }
			: {}),
	};
}

function extractSuccessfulMessageContext(result: unknown): IntegrationMessageContext | undefined {
	if (!isRecord(result) || result.ok !== true) return undefined;
	const messageContext = result.messageContext;
	return isIntegrationMessageContext(messageContext) ? messageContext : undefined;
}

function isIntegrationMessageContext(value: unknown): value is IntegrationMessageContext {
	return (
		isRecord(value) &&
		typeof value.integrationConnectionId === 'string' &&
		typeof value.platform === 'string' &&
		isRecord(value.target) &&
		(value.agentUserId === undefined || typeof value.agentUserId === 'string') &&
		typeof value.updatedAt === 'string'
	);
}

async function getOptionalCurrentContext(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	messageContextStore: IntegrationMessageContextStore;
	threadId: string;
}): Promise<IntegrationMessageContext | undefined> {
	try {
		const context = await params.messageContextStore.getLatest(params.threadId);
		if (context?.integrationConnectionId !== params.descriptor.integrationConnectionId) {
			return undefined;
		}
		return context;
	} catch {
		return undefined;
	}
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
				code: INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
				message: 'There is no current message context. Use an explicit send action.',
			},
		};
	}

	const context = await messageContextStore.getLatest(persistence.threadId);
	if (!context) {
		return {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
				message: 'There is no current message context. Use an explicit send action.',
			},
		};
	}

	if (context.integrationConnectionId !== descriptor.integrationConnectionId) {
		return {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT_FOR_INTEGRATION,
				message: 'The latest message context belongs to another integration connection.',
			},
		};
	}

	return { ok: true, context };
}

function getTargetChannelId(target: IntegrationMessageTarget): string | undefined {
	if (target.type === 'thread' || target.type === 'channel') {
		return target.channelId;
	}
	return undefined;
}
