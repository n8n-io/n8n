import { Service } from '@n8n/di';
import type { SentMessage } from 'chat';
import { z } from 'zod';

import { ChatIntegrationRegistry } from './agent-chat-integration';
import { ChatIntegrationService, type ChatInstance } from './chat-integration.service';
import { ComponentMapper, RICH_INTERACTION_RESUME_JSON_SCHEMA } from './component-mapper';
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

const respondInputSchema = z.object({ message: messageSchema });
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

		const chat = this.chatIntegrationService.getChatInstance(params.descriptor.agentId, {
			type: params.descriptor.integration.type,
			credentialId: params.descriptor.integration.credentialId,
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
			const integration = this.integrationRegistry.get(params.descriptor.integration.type);
			if (integration?.executeAction) {
				const result = await integration.executeAction({
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

			return integrationError(
				INTEGRATION_ERROR_CODES.UNSUPPORTED_ACTION,
				`The ${params.descriptor.integration.type} integration does not support ${params.action}.`,
			);
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
		await maybeSubscribeSlackThread(params.descriptor, chat.thread(sent.threadId));

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
		const richInteraction = message.richInteraction;
		if (!richInteraction) return message.text ?? '';

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
			RICH_INTERACTION_RESUME_JSON_SCHEMA,
			undefined,
			descriptor.integration.type,
		);

		return { card };
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
