import { Service } from '@n8n/di';
import type { SentMessage } from 'chat';
import { z } from 'zod';

import { ChatIntegrationService } from './chat-integration.service';
import { ComponentMapper } from './component-mapper';
import type {
	IntegrationAction,
	IntegrationActionExecutor,
	IntegrationActionResult,
	IntegrationMessageContext,
	IntegrationMessageSubject,
	IntegrationToolConnectionDescriptor,
} from './integration-tools';
import { normalizeLinearComment, normalizeLinearIssue } from './integration-context-query-executor';

const messageSchema = z.object({
	text: z.string().optional(),
	richInteraction: z
		.object({
			awaitResponse: z.boolean().optional(),
			title: z.string().optional(),
			message: z.string().optional(),
			components: z.array(z.object({ type: z.string() }).passthrough()).min(1),
		})
		.optional(),
});

const respondInputSchema = z.object({
	message: messageSchema,
});

const sendDmInputSchema = z.object({
	userId: z.string().min(1),
	message: messageSchema,
});

const sendChannelMessageInputSchema = z.object({
	channelId: z.string().min(1),
	message: messageSchema,
});

const addReactionInputSchema = z.object({
	emoji: z.string().min(1),
	threadId: z.string().min(1).optional(),
	messageId: z.string().min(1).optional(),
});

const createIssueInputSchema = z.object({
	teamId: z.string().min(1),
	title: z.string().min(1),
	description: z.string().min(1).optional(),
	assigneeId: z.string().min(1).optional(),
	projectId: z.string().min(1).optional(),
	labelIds: z.array(z.string().min(1)).optional(),
	priority: z.number().int().optional(),
	stateId: z.string().min(1).optional(),
	parentId: z.string().min(1).optional(),
});

const createCommentInputSchema = z.object({
	issueId: z.string().min(1),
	body: z.string().min(1),
	parentCommentId: z.string().min(1).optional(),
});

const integrationActionResumeSchema = {
	type: 'object',
	properties: {
		type: { type: 'string' },
		id: { type: 'string' },
		value: { type: 'string' },
	},
};

@Service()
export class ChatIntegrationActionExecutor implements IntegrationActionExecutor {
	private readonly componentMapper = new ComponentMapper();

	constructor(private readonly chatIntegrationService: ChatIntegrationService) {}

	async execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		action: IntegrationAction;
		input: Record<string, unknown>;
		awaitResponse: boolean;
		runId?: string;
		toolCallId?: string;
		currentMessageContext?: IntegrationMessageContext;
	}): Promise<IntegrationActionResult> {
		if (!params.descriptor.agentId) {
			return connectionUnavailable();
		}

		const chat = this.chatIntegrationService.getChatInstance(params.descriptor.agentId, {
			type: params.descriptor.integration.type,
			credentialId: params.descriptor.integration.credentialId,
		});
		if (!chat) {
			return connectionUnavailable();
		}

		try {
			if (params.action === 'respond') {
				const input = respondInputSchema.parse(params.input);
				if (!params.currentMessageContext?.target.threadId) {
					return {
						ok: false,
						error: {
							code: 'NO_MESSAGE_CONTEXT',
							message: 'There is no current message context. Use an explicit send action.',
						},
					};
				}
				const thread = chat.thread(params.currentMessageContext.target.threadId);
				await subscribeSlackThread(params.descriptor, thread);
				const sent = await thread.post(
					await this.toPostableMessage(params.descriptor, input.message, params),
				);
				return {
					ok: true,
					messageContext: buildMessageContextFromSentMessage({
						descriptor: params.descriptor,
						sent,
						target: params.currentMessageContext.target,
					}),
				};
			}

			if (params.action === 'send_dm') {
				const input = sendDmInputSchema.parse(params.input);
				const thread = await chat.openDM(input.userId);
				await subscribeSlackThread(params.descriptor, thread);
				const sent = await thread.post(
					await this.toPostableMessage(params.descriptor, input.message, params),
				);
				return {
					ok: true,
					messageContext: buildMessageContextFromSentMessage({
						descriptor: params.descriptor,
						sent,
						target: { type: 'dm', userId: input.userId, threadId: thread.id },
					}),
				};
			}

			if (params.descriptor.integration.type === 'slack') {
				const result = await executeSlackAction({
					chat,
					descriptor: params.descriptor,
					action: params.action,
					input: params.input,
					currentMessageContext: params.currentMessageContext,
				});
				if (result !== undefined) return result;
			}

			if (params.descriptor.integration.type === 'linear') {
				const result = await executeLinearAction({
					chat,
					descriptor: params.descriptor,
					action: params.action,
					input: params.input,
				});
				if (result !== undefined) return result;
			}

			const input = sendChannelMessageInputSchema.parse(params.input);
			const channelId = normalizePlatformId(params.descriptor.integration.type, input.channelId);
			const channel = chat.channel(channelId);
			const sent = await channel.post(
				await this.toPostableMessage(params.descriptor, input.message, params),
			);
			await subscribeSlackThread(params.descriptor, chat.thread(sent.threadId));
			return {
				ok: true,
				messageContext: buildMessageContextFromSentMessage({
					descriptor: params.descriptor,
					sent,
					target: { type: 'channel', channelId, threadId: sent.threadId },
				}),
			};
		} catch (error) {
			return {
				ok: false,
				error: {
					code: 'ACTION_FAILED',
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	}

	private async toPostableMessage(
		descriptor: IntegrationToolConnectionDescriptor,
		message: z.infer<typeof messageSchema>,
		params: { awaitResponse: boolean; runId?: string; toolCallId?: string },
	) {
		const richInteraction = message.richInteraction;
		if (!richInteraction) {
			return message.text ?? '';
		}

		if (params.awaitResponse && (!params.runId || !params.toolCallId)) {
			throw new Error('Interactive integration actions require runId and toolCallId.');
		}

		const card = await this.componentMapper.toCard(
			{
				title: richInteraction.title ?? message.text,
				message: richInteraction.message,
				components: richInteraction.components,
			},
			params.runId ?? '',
			params.toolCallId ?? '',
			integrationActionResumeSchema,
			undefined,
			descriptor.integration.type,
		);

		return { card };
	}
}

function connectionUnavailable(): IntegrationActionResult {
	return {
		ok: false,
		error: {
			code: 'CONNECTION_NOT_AVAILABLE',
			message: 'The integration connection is not currently available.',
		},
	};
}

function normalizePlatformId(platform: string, id: string): string {
	return id.includes(':') ? id : `${platform}:${id}`;
}

function buildMessageContextFromSentMessage(params: {
	descriptor: IntegrationToolConnectionDescriptor;
	sent: SentMessage;
	target: IntegrationMessageContext['target'];
}): IntegrationMessageContext {
	return {
		integrationConnectionId: params.descriptor.integrationConnectionId,
		platform: params.descriptor.integration.type,
		target: params.target,
		messageId: params.sent.id,
		updatedAt: new Date().toISOString(),
	};
}

async function subscribeSlackThread(
	descriptor: IntegrationToolConnectionDescriptor,
	thread: { subscribe?: () => Promise<void> },
): Promise<void> {
	if (descriptor.integration.type !== 'slack') return;
	await thread.subscribe?.();
}

type CreateIssueInput = z.infer<typeof createIssueInputSchema>;
type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
type AddReactionInput = z.infer<typeof addReactionInputSchema>;

interface SlackAdapter {
	addReaction(threadId: string, messageId: string, emoji: string): Promise<void>;
}

interface LinearAdapter {
	client: Record<string, unknown>;
}

interface LinearClientWithCreateIssue {
	createIssue(input: Record<string, unknown>): Promise<unknown>;
}

interface LinearClientWithCreateComment {
	createComment(input: Record<string, unknown>): Promise<unknown>;
}

async function executeSlackAction(params: {
	chat: { getAdapter(name: string): unknown };
	descriptor: IntegrationToolConnectionDescriptor;
	action: IntegrationAction;
	input: Record<string, unknown>;
	currentMessageContext?: IntegrationMessageContext;
}): Promise<IntegrationActionResult | undefined> {
	if (params.action !== 'add_reaction') return undefined;

	return await addSlackReaction({
		chat: params.chat,
		descriptor: params.descriptor,
		input: addReactionInputSchema.parse(params.input),
		currentMessageContext: params.currentMessageContext,
	});
}

async function addSlackReaction(params: {
	chat: { getAdapter(name: string): unknown };
	descriptor: IntegrationToolConnectionDescriptor;
	input: AddReactionInput;
	currentMessageContext?: IntegrationMessageContext;
}): Promise<IntegrationActionResult> {
	const adapter = getSlackAdapter(params.chat);
	if (!adapter) {
		return {
			ok: false,
			error: {
				code: 'UNSUPPORTED_ACTION',
				message: 'The active Slack connection does not support add_reaction.',
			},
		};
	}

	const threadId = params.input.threadId ?? params.currentMessageContext?.target.threadId;
	const messageId = params.input.messageId ?? params.currentMessageContext?.messageId;
	if (!threadId || !messageId) {
		return {
			ok: false,
			error: {
				code: 'NO_MESSAGE_CONTEXT',
				message: 'Slack reactions require a messageId and threadId or current message context.',
			},
		};
	}

	await adapter.addReaction(threadId, messageId, params.input.emoji);

	return {
		ok: true,
		reaction: {
			emoji: params.input.emoji,
			threadId,
			messageId,
		},
		messageContext: {
			integrationConnectionId: params.descriptor.integrationConnectionId,
			platform: params.descriptor.integration.type,
			target: buildSlackReactionTarget(threadId, params.currentMessageContext),
			messageId,
			updatedAt: new Date().toISOString(),
		},
	};
}

function getSlackAdapter(chat: { getAdapter(name: string): unknown }): SlackAdapter | undefined {
	const adapter = chat.getAdapter('slack');
	return isSlackAdapter(adapter) ? adapter : undefined;
}

function isSlackAdapter(value: unknown): value is SlackAdapter {
	return isRecord(value) && typeof value.addReaction === 'function';
}

function buildSlackReactionTarget(
	threadId: string,
	currentMessageContext: IntegrationMessageContext | undefined,
): IntegrationMessageContext['target'] {
	if (currentMessageContext?.target.threadId === threadId) return currentMessageContext.target;

	const channelId = parseSlackChannelId(threadId);
	return {
		type: 'thread',
		threadId,
		...(channelId ? { channelId } : {}),
	};
}

function parseSlackChannelId(threadId: string): string | undefined {
	const [platform, channel] = threadId.split(':');
	if (platform !== 'slack' || !channel) return undefined;
	return `${platform}:${channel}`;
}

async function executeLinearAction(params: {
	chat: { getAdapter(name: string): unknown };
	descriptor: IntegrationToolConnectionDescriptor;
	action: IntegrationAction;
	input: Record<string, unknown>;
}): Promise<IntegrationActionResult | undefined> {
	if (params.action === 'create_issue') {
		return await createLinearIssue(
			params.chat,
			params.descriptor,
			createIssueInputSchema.parse(params.input),
		);
	}

	if (params.action === 'create_comment') {
		return await createLinearComment(
			params.chat,
			params.descriptor,
			createCommentInputSchema.parse(params.input),
		);
	}

	return undefined;
}

async function createLinearIssue(
	chat: { getAdapter(name: string): unknown },
	descriptor: IntegrationToolConnectionDescriptor,
	input: CreateIssueInput,
): Promise<IntegrationActionResult> {
	const adapter = getLinearAdapter(chat);
	if (!adapter || !hasLinearCreateIssueClient(adapter.client)) {
		return unsupportedLinearAction('create_issue');
	}

	const payload = await adapter.client.createIssue(removeUndefinedValues({ ...input }));
	const rawIssue = await awaitablePayloadProperty(payload, 'issue');
	const normalizedIssue = await normalizeLinearIssue(rawIssue ?? payload);
	const issueId =
		stringRecordProperty(normalizedIssue, 'issueId') ??
		stringPayloadProperty(payload, 'issueId') ??
		stringRecordProperty(normalizedIssue, 'identifier');

	if (!issueId) {
		return {
			ok: false,
			error: {
				code: 'ACTION_FAILED',
				message: 'Linear did not return an issue ID for the created issue.',
			},
		};
	}

	return {
		ok: true,
		issue: normalizedIssue,
		messageContext: {
			integrationConnectionId: descriptor.integrationConnectionId,
			platform: descriptor.integration.type,
			target: { type: 'thread', threadId: `linear:${issueId}` },
			subject: buildLinearIssueSubject(normalizedIssue, issueId),
			updatedAt: new Date().toISOString(),
		},
	};
}

async function createLinearComment(
	chat: { getAdapter(name: string): unknown },
	descriptor: IntegrationToolConnectionDescriptor,
	input: CreateCommentInput,
): Promise<IntegrationActionResult> {
	const adapter = getLinearAdapter(chat);
	if (!adapter || !hasLinearCreateCommentClient(adapter.client)) {
		return unsupportedLinearAction('create_comment');
	}

	const payload = await adapter.client.createComment(
		removeUndefinedValues({
			issueId: input.issueId,
			body: input.body,
			parentId: input.parentCommentId,
		}),
	);
	const rawComment = await awaitablePayloadProperty(payload, 'comment');
	const normalizedComment = await normalizeLinearComment(rawComment ?? payload);
	const commentId =
		stringRecordProperty(normalizedComment, 'commentId') ??
		stringPayloadProperty(payload, 'commentId');

	return {
		ok: true,
		comment: normalizedComment,
		messageContext: {
			integrationConnectionId: descriptor.integrationConnectionId,
			platform: descriptor.integration.type,
			target: {
				type: 'thread',
				threadId: input.parentCommentId
					? `linear:${input.issueId}:c:${input.parentCommentId}`
					: `linear:${input.issueId}`,
			},
			...(commentId ? { messageId: commentId } : {}),
			subject: { type: 'issue', id: input.issueId },
			updatedAt: new Date().toISOString(),
		},
	};
}

function getLinearAdapter(chat: { getAdapter(name: string): unknown }): LinearAdapter | undefined {
	const adapter = chat.getAdapter('linear');
	if (!isRecord(adapter) || !isRecord(adapter.client)) return undefined;
	return { client: adapter.client };
}

function hasLinearCreateIssueClient(
	client: Record<string, unknown>,
): client is Record<string, unknown> & LinearClientWithCreateIssue {
	return typeof client.createIssue === 'function';
}

function hasLinearCreateCommentClient(
	client: Record<string, unknown>,
): client is Record<string, unknown> & LinearClientWithCreateComment {
	return typeof client.createComment === 'function';
}

function unsupportedLinearAction(
	action: 'create_issue' | 'create_comment',
): IntegrationActionResult {
	return {
		ok: false,
		error: {
			code: 'UNSUPPORTED_ACTION',
			message: `The active Linear connection does not support ${action}.`,
		},
	};
}

function buildLinearIssueSubject(
	issue: Record<string, unknown>,
	fallbackIssueId: string,
): IntegrationMessageSubject {
	const identifier = stringRecordProperty(issue, 'identifier');
	const title = stringRecordProperty(issue, 'title');
	const description = stringRecordProperty(issue, 'description');
	const url = stringRecordProperty(issue, 'url');
	const status = stringRecordProperty(recordProperty(issue, 'state'), 'name');
	const labels = linearLabelNames(issue);
	const assignee = linearSubjectPerson(recordProperty(issue, 'assignee'));

	return {
		type: 'issue',
		id: identifier ?? fallbackIssueId,
		...(title ? { title } : {}),
		...(description ? { description } : {}),
		...(url ? { url } : {}),
		...(status ? { status } : {}),
		...(labels.length > 0 ? { labels } : {}),
		...(assignee ? { assignee } : {}),
	};
}

function linearLabelNames(issue: Record<string, unknown>): string[] {
	const labels = issue.labels;
	if (!Array.isArray(labels)) return [];
	return labels
		.map((label) => stringRecordProperty(label, 'name'))
		.filter((label): label is string => label !== undefined);
}

function linearSubjectPerson(value: unknown): IntegrationMessageSubject['assignee'] {
	if (!isRecord(value)) return undefined;
	const id = stringRecordProperty(value, 'userId') ?? stringRecordProperty(value, 'id');
	const name = stringRecordProperty(value, 'name') ?? stringRecordProperty(value, 'displayName');
	if (!id || !name) return undefined;
	return { id, name };
}

async function awaitablePayloadProperty(
	payload: unknown,
	key: string,
): Promise<unknown | undefined> {
	if (!isRecord(payload)) return undefined;
	return await Promise.resolve(payload[key]);
}

function stringPayloadProperty(payload: unknown, key: string): string | undefined {
	return stringRecordProperty(payload, key);
}

function recordProperty(record: Record<string, unknown>, key: string): unknown {
	return record[key];
}

function stringRecordProperty(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) return undefined;
	const property = value[key];
	return typeof property === 'string' && property.length > 0 ? property : undefined;
}

function removeUndefinedValues<T extends Record<string, unknown>>(
	value: T,
): Record<string, unknown> {
	return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
