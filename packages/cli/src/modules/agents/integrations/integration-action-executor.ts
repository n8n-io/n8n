import { richMessageSchema } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { SentMessage } from 'chat';
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

type MessagePayload = z.infer<typeof messageSchema>;

/**
 * Dispatches action invocations between cross-platform actions (`respond`,
 * `send_dm`, `send_channel_message`) and platform-specific actions
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
