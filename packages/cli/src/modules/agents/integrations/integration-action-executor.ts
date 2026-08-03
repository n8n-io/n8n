import { richMessageSchema } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { Adapter, SentMessage } from 'chat';
import { z } from 'zod';

import { ChatIntegrationRegistry } from './agent-chat-integration';
import { ChatIntegrationService, type ChatInstance } from './chat-integration.service';
import {
	ComponentMapper,
	INTERACTIVE_CARD_RESUME_JSON_SCHEMA,
	type ShortenCallback,
} from './component-mapper';
import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import {
	connectionUnavailable,
	integrationError,
	normalizePlatformId,
} from './integration-helpers';
import type {
	IntegrationAction,
	IntegrationActionExecutor,
	IntegrationActionResult,
	IntegrationMessageContext,
	IntegrationToolConnectionDescriptor,
} from './integration-tools';
import { subscribeSlackThread } from './platforms/slack-operations';

// The shared wire schema from @n8n/api-types — the same definition the tool
// boundary validates against and the editor-ui renderer parses with.
const messageSchema = richMessageSchema;

export const respondInputSchema = z.object({ message: messageSchema });
const sendDmInputSchema = z.object({
	userId: z.string().min(1),
	message: messageSchema,
});
const sendChannelMessageInputSchema = z.object({
	channelId: z.string().min(1),
	message: messageSchema,
});
const editMessageInputSchema = z
	.object({
		messageId: z.string().min(1),
		message: messageSchema,
	})
	.strict();

type MessagePayload = z.infer<typeof messageSchema>;

/**
 * Dispatches action invocations between cross-platform actions (`respond`,
 * `send_dm`, `send_channel_message`, `edit_message`) and platform-specific actions
 * (`add_reaction`, `create_issue`, `create_comment`, …) owned by each
 * {@link AgentChatIntegration} subclass.
 */
@Service()
export class ChatIntegrationActionExecutor implements IntegrationActionExecutor {
	private readonly componentMapper = new ComponentMapper();

	constructor(
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly integrationRegistry: ChatIntegrationRegistry,
	) {}

	async execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		action: IntegrationAction;
		input: Record<string, unknown>;
		awaitResponse: boolean;
		runId?: string;
		toolCallId?: string;
		currentMessageContext?: IntegrationMessageContext;
	}): Promise<IntegrationActionResult> {
		if (!params.descriptor.agentId) return connectionUnavailable();

		if (params.action === 'do_not_respond') {
			return this.doNotRespond(params);
		}

		const unsupportedAction = () =>
			integrationError(
				INTEGRATION_ERROR_CODES.UNSUPPORTED_ACTION,
				`The ${params.descriptor.integration.type} integration does not support ${params.action}.`,
			);

		const integrationDef = this.integrationRegistry.get(params.descriptor.integration.type);
		if (integrationDef && !integrationDef.requiresChatInstance) {
			if (!integrationDef.executeAction) {
				return unsupportedAction();
			}
			try {
				const result = await integrationDef.executeAction({
					chat: undefined,
					descriptor: params.descriptor,
					action: params.action,
					input: params.input,
					currentMessageContext: params.currentMessageContext,
				});
				return result ?? unsupportedAction();
			} catch (error) {
				return integrationError(
					INTEGRATION_ERROR_CODES.ACTION_FAILED,
					error instanceof Error ? error.message : String(error),
				);
			}
		}

		const { credentialId } = params.descriptor.integration;
		if (!credentialId) return connectionUnavailable();

		const chat = this.chatIntegrationService.getChatInstance(params.descriptor.agentId, {
			type: params.descriptor.integration.type,
			credentialId,
		});
		if (!chat) return connectionUnavailable();

		try {
			if (params.action === 'respond') {
				return await this.respondInCurrentThread(chat, params);
			}
			if (params.action === 'send_dm') {
				return await this.sendDirectMessage(chat, params);
			}
			if (params.action === 'edit_message') {
				return await this.editMessageInCurrentThread(chat, params);
			}

			// Platform-specific actions delegate to the integration implementation.
			if (integrationDef?.executeAction) {
				const result = await integrationDef.executeAction({
					chat,
					descriptor: params.descriptor,
					action: params.action,
					input: params.input,
					currentMessageContext: params.currentMessageContext,
				});
				if (result !== undefined) return result;
			}

			if (params.action === 'send_channel_message') {
				return await this.sendChannelMessage(chat, params);
			}

			return unsupportedAction();
		} catch (error) {
			return integrationError(
				INTEGRATION_ERROR_CODES.ACTION_FAILED,
				error instanceof Error ? error.message : String(error),
			);
		}
	}

	/**
	 * End the turn without posting anything. Allowed only when the latest
	 * inbound message marked the reply as optional.
	 */
	private doNotRespond(params: ExecuteParams): IntegrationActionResult {
		if (params.currentMessageContext?.replyExpectation !== 'optional') {
			return integrationError(
				INTEGRATION_ERROR_CODES.REPLY_REQUIRED,
				'A reply is expected here — this is a direct message, a direct mention, or a conversation you were asked to join. Respond normally instead of staying silent.',
			);
		}

		return {
			ok: true,
			silent: true,
			note: 'No reply will be sent. End your turn now without writing any text.',
		};
	}

	private async respondInCurrentThread(
		chat: ChatInstance,
		params: ExecuteParams,
	): Promise<IntegrationActionResult> {
		const input = respondInputSchema.parse(params.input);
		const threadId = params.currentMessageContext?.target.threadId;
		if (!threadId) {
			return integrationError(
				INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
				'There is no current message context. Use an explicit send action.',
			);
		}

		// `replyExpectation` marks a turn triggered by an inbound chat message,
		// where the bridge already posts the assistant's reply text to this
		// thread — a text-only respond would deliver the same content twice.
		if (!input.message.card && params.currentMessageContext?.replyExpectation) {
			return integrationError(
				INTEGRATION_ERROR_CODES.ACTION_FAILED,
				'Plain text is already delivered to this conversation as your normal reply — write the text directly in your reply instead of calling respond. Call respond only with message.card, or use an explicit send action for a different target.',
			);
		}

		const thread = chat.thread(threadId);
		await maybeSubscribeSlackThread(params.descriptor, thread);
		const sent = await thread.post(await this.toPostable(params.descriptor, input.message, params));

		return {
			ok: true,
			messageContext: buildMessageContextFromSentMessage({
				descriptor: params.descriptor,
				sent,
				target: params.currentMessageContext!.target,
			}),
		};
	}

	private async sendDirectMessage(
		chat: ChatInstance,
		params: ExecuteParams,
	): Promise<IntegrationActionResult> {
		const input = sendDmInputSchema.parse(params.input);
		const thread = await chat.openDM(input.userId);
		await maybeSubscribeSlackThread(params.descriptor, thread);
		const sent = await thread.post(await this.toPostable(params.descriptor, input.message, params));

		return {
			ok: true,
			messageContext: buildMessageContextFromSentMessage({
				descriptor: params.descriptor,
				sent,
				target: { type: 'dm', userId: input.userId, threadId: thread.id },
			}),
		};
	}

	private async editMessageInCurrentThread(
		chat: ChatInstance,
		params: ExecuteParams,
	): Promise<IntegrationActionResult> {
		const input = editMessageInputSchema.parse(params.input);
		const currentMessageContext = params.currentMessageContext;
		const threadId = currentMessageContext?.target.threadId;
		if (!currentMessageContext || !threadId) {
			return integrationError(
				INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
				'There is no current conversation to edit. Send a message first, then try again.',
			);
		}

		const adapter = chat.getAdapter(params.descriptor.integration.type);
		if (!supportsMessageEditing(adapter)) {
			return integrationError(
				INTEGRATION_ERROR_CODES.UNSUPPORTED_ACTION,
				`The ${params.descriptor.integration.type} integration can't edit messages. Use a supported action instead.`,
			);
		}

		const edited = await adapter.editMessage(
			threadId,
			input.messageId,
			await this.toPostable(params.descriptor, input.message, params),
		);

		return {
			ok: true,
			messageContext: {
				...currentMessageContext,
				messageId: edited.id,
				updatedAt: new Date().toISOString(),
			},
		};
	}

	private async sendChannelMessage(
		chat: ChatInstance,
		params: ExecuteParams,
	): Promise<IntegrationActionResult> {
		const input = sendChannelMessageInputSchema.parse(params.input);
		const channelId = normalizePlatformId(params.descriptor.integration.type, input.channelId);
		const channel = chat.channel(channelId);
		const sent = await channel.post(
			await this.toPostable(params.descriptor, input.message, params),
		);
		await maybeSubscribeSlackSentThread(params.descriptor, chat, sent.threadId);

		return {
			ok: true,
			messageContext: buildMessageContextFromSentMessage({
				descriptor: params.descriptor,
				sent,
				target: { type: 'channel', channelId, threadId: sent.threadId },
			}),
		};
	}

	private async toPostable(
		descriptor: IntegrationToolConnectionDescriptor,
		message: MessagePayload,
		params: { awaitResponse: boolean; runId?: string; toolCallId?: string },
	) {
		const cardPayload = message.card;
		if (!cardPayload) return message.text ?? '';

		if (params.awaitResponse && (!params.runId || !params.toolCallId)) {
			throw new Error('Interactive integration actions require runId and toolCallId.');
		}

		const card = await this.componentMapper.toCard(
			{
				title: cardPayload.title ?? message.text,
				message: cardPayload.message,
				components: cardPayload.components,
			},
			params.runId ?? '',
			params.toolCallId ?? '',
			INTERACTIVE_CARD_RESUME_JSON_SCHEMA,
			this.getShortenCallback(descriptor),
			descriptor.integration.type,
		);

		return { card };
	}

	private getShortenCallback(
		descriptor: IntegrationToolConnectionDescriptor,
	): ShortenCallback | undefined {
		const { agentId, integration } = descriptor;
		if (!agentId) return undefined;
		const { credentialId } = integration;
		if (!credentialId) return undefined;
		return this.chatIntegrationService.getShortenCallback(agentId, {
			type: integration.type,
			credentialId,
		});
	}
}

function supportsMessageEditing(adapter: unknown): adapter is Pick<Adapter, 'editMessage'> {
	return isRecord(adapter) && typeof adapter.editMessage === 'function';
}

interface ExecuteParams {
	descriptor: IntegrationToolConnectionDescriptor;
	action: IntegrationAction;
	input: Record<string, unknown>;
	awaitResponse: boolean;
	runId?: string;
	toolCallId?: string;
	currentMessageContext?: IntegrationMessageContext;
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

async function maybeSubscribeSlackThread(
	descriptor: IntegrationToolConnectionDescriptor,
	thread: { subscribe?: () => Promise<void> },
): Promise<void> {
	if (descriptor.integration.type !== 'slack') return;
	await subscribeSlackThread(thread);
}

async function maybeSubscribeSlackSentThread(
	descriptor: IntegrationToolConnectionDescriptor,
	chat: ChatInstance,
	threadId: string | undefined,
): Promise<void> {
	if (descriptor.integration.type !== 'slack' || !threadId) return;
	await subscribeSlackThread(chat.thread(threadId));
}
