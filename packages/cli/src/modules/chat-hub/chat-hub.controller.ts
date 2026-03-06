import {
	ChatHubSendMessageRequest,
	ChatModelsResponse,
	ChatHubConversationsResponse,
	ChatHubConversationResponse,
	ChatHubEditMessageRequest,
	ChatHubRegenerateMessageRequest,
	ChatHubUpdateConversationRequest,
	ChatSessionId,
	ChatMessageId,
	ChatHubCreateAgentRequest,
	ChatHubUpdateAgentRequest,
	ChatHubCreateToolRequest,
	ChatHubUpdateToolRequest,
	ChatHubConversationsRequest,
	ViewableMimeTypes,
	type ChatSendMessageResponse,
	type ChatReconnectResponse,
	ChatReconnectRequest,
	ALWAYS_BLOCKED_CHAT_HUB_TOOL_TYPES,
	CHAT_USER_BLOCKED_CHAT_HUB_TOOL_TYPES,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	RestController,
	Post,
	Body,
	GlobalScope,
	Get,
	Delete,
	Param,
	Patch,
	Query,
} from '@n8n/decorators';
import { sanitizeFilename } from '@n8n/utils';
import type { Response } from 'express';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { ChatHubToolService } from './chat-hub-tool.service';
import { extractAuthenticationMetadata } from './chat-hub-extractor';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import { ChatHubModelsService } from './chat-hub.models.service';
import { ChatHubService } from './chat-hub.service';
import { ChatModelsRequestDto } from './dto/chat-models-request.dto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@RestController('/chat')
export class ChatHubController {
	constructor(
		private readonly chatService: ChatHubService,
		private readonly chatModelsService: ChatHubModelsService,
		private readonly chatAgentService: ChatHubAgentService,
		private readonly chatToolService: ChatHubToolService,
		private readonly chatAttachmentService: ChatHubAttachmentService,
	) {}

	@Post('/models')
	@GlobalScope('chatHub:message')
	async getModels(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ChatModelsRequestDto,
	): Promise<ChatModelsResponse> {
		return await this.chatModelsService.getModels(req.user, payload.credentials);
	}

	@Get('/conversations')
	@GlobalScope('chatHub:message')
	async getConversations(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ChatHubConversationsRequest,
	): Promise<ChatHubConversationsResponse> {
		return await this.chatService.getConversations(req.user.id, query.limit, query.cursor);
	}

	@Get('/conversations/:sessionId')
	@GlobalScope('chatHub:message')
	async getConversationMessages(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
	): Promise<ChatHubConversationResponse> {
		return await this.chatService.getConversation(req.user.id, sessionId);
	}

	@Get('/conversations/:sessionId/messages/:messageId/attachments/:index')
	@GlobalScope('chatHub:message')
	async getMessageAttachment(
		req: AuthenticatedRequest,
		res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
		@Param('messageId') messageId: ChatMessageId,
		@Param('index') index: string,
	) {
		const attachmentIndex = Number.parseInt(index, 10);

		if (isNaN(attachmentIndex)) {
			throw new BadRequestError('Invalid attachment index');
		}

		// Verify user has access to this session
		await this.chatService.ensureConversation(req.user.id, sessionId);

		const [{ mimeType, fileName }, attachmentAsStreamOrBuffer] =
			await this.chatAttachmentService.getAttachment(sessionId, messageId, attachmentIndex);

		res.setHeader('Content-Type', mimeType);

		if (attachmentAsStreamOrBuffer.fileSize) {
			res.setHeader('Content-Length', attachmentAsStreamOrBuffer.fileSize);
		}

		if (!mimeType || !ViewableMimeTypes.includes(mimeType.toLowerCase())) {
			// Force download if file is not viewable
			res.setHeader(
				'Content-Disposition',
				`attachment${fileName ? `; filename=${sanitizeFilename(fileName)}` : ''}`,
			);
		}

		if (attachmentAsStreamOrBuffer.type === 'buffer') {
			res.send(attachmentAsStreamOrBuffer.buffer);
			return;
		}

		return await new Promise<void>((resolve, reject) => {
			attachmentAsStreamOrBuffer.stream.on('end', resolve);
			attachmentAsStreamOrBuffer.stream.on('error', reject);
			attachmentAsStreamOrBuffer.stream.pipe(res);
		});
	}

	@GlobalScope('chatHub:message')
	@Post('/conversations/send')
	async sendMessage(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ChatHubSendMessageRequest,
	): Promise<ChatSendMessageResponse> {
		await this.chatService.sendHumanMessage(
			req.user,
			{
				...payload,
				userId: req.user.id,
			},
			extractAuthenticationMetadata(req),
		);

		return {
			status: 'streaming',
		};
	}

	@GlobalScope('chatHub:message')
	@Post('/conversations/:sessionId/messages/:messageId/edit')
	async editMessage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
		@Param('messageId') editId: ChatMessageId,
		@Body payload: ChatHubEditMessageRequest,
	): Promise<ChatSendMessageResponse> {
		await this.chatService.editMessage(
			req.user,
			{
				...payload,
				sessionId,
				editId,
				userId: req.user.id,
			},
			extractAuthenticationMetadata(req),
		);

		return {
			status: 'streaming',
		};
	}

	@GlobalScope('chatHub:message')
	@Post('/conversations/:sessionId/messages/:messageId/regenerate')
	async regenerateMessage(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
		@Param('messageId') retryId: ChatMessageId,
		@Body payload: ChatHubRegenerateMessageRequest,
	): Promise<ChatSendMessageResponse> {
		await this.chatService.regenerateAIMessage(
			req.user,
			{
				...payload,
				sessionId,
				retryId,
				userId: req.user.id,
			},
			extractAuthenticationMetadata(req),
		);

		return {
			status: 'streaming',
		};
	}

	@GlobalScope('chatHub:message')
	@Post('/conversations/:sessionId/messages/:messageId/stop')
	async stopGeneration(
		req: AuthenticatedRequest,
		res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
		@Param('messageId') messageId: ChatMessageId,
	) {
		await this.chatService.stopGeneration(req.user, sessionId, messageId);
		res.status(204).send();
	}

	/**
	 * Reconnect to an active chat stream after WebSocket reconnection.
	 * Returns pending chunks for replay.
	 */
	@GlobalScope('chatHub:message')
	@Post('/conversations/:sessionId/reconnect')
	async reconnectToStream(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
		@Query query: ChatReconnectRequest,
	): Promise<ChatReconnectResponse> {
		// Verify user has access to this session
		await this.chatService.ensureConversation(req.user.id, sessionId);

		const lastReceivedSequence = query.lastSequence ?? 0;

		return await this.chatService.reconnectToStream(sessionId, lastReceivedSequence);
	}

	@Patch('/conversations/:sessionId')
	@GlobalScope('chatHub:message')
	async updateConversation(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
		@Body payload: ChatHubUpdateConversationRequest,
	): Promise<ChatHubConversationResponse> {
		if (Object.keys(payload).length > 0) {
			await this.chatService.updateSession(req.user, sessionId, payload);
		}

		return await this.chatService.getConversation(req.user.id, sessionId);
	}

	@Delete('/conversations/:sessionId')
	@GlobalScope('chatHub:message')
	async deleteConversation(
		req: AuthenticatedRequest,
		res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
	): Promise<void> {
		await this.chatService.deleteSession(req.user.id, sessionId);

		res.status(204).send();
	}

	@Get('/tools')
	@GlobalScope('chatHub:message')
	async getTools(req: AuthenticatedRequest) {
		const tools = await this.chatToolService.getToolsByUserId(req.user.id);
		return tools.map((tool) => ChatHubToolService.toDto(tool));
	}

	@Post('/tools')
	@GlobalScope('chatHub:message')
	async createTool(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ChatHubCreateToolRequest,
	) {
		this.assertToolTypeAllowed(payload.definition.type, req.user);
		const tool = await this.chatToolService.createTool(req.user, payload);
		return ChatHubToolService.toDto(tool);
	}

	@Patch('/tools/:toolId')
	@GlobalScope('chatHub:message')
	async updateTool(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('toolId') toolId: string,
		@Body payload: ChatHubUpdateToolRequest,
	) {
		if (payload.definition?.type) {
			this.assertToolTypeAllowed(payload.definition.type, req.user);
		}
		const tool = await this.chatToolService.updateTool(toolId, req.user, payload);
		return ChatHubToolService.toDto(tool);
	}

	@Delete('/tools/:toolId')
	@GlobalScope('chatHub:message')
	async deleteTool(
		req: AuthenticatedRequest,
		res: Response,
		@Param('toolId') toolId: string,
	): Promise<void> {
		await this.chatToolService.deleteTool(toolId, req.user.id);
		res.status(204).send();
	}

	@Get('/agents')
	@GlobalScope('chatHubAgent:list')
	async getAgents(req: AuthenticatedRequest) {
		return await this.chatAgentService.getAgentsByUserIdAsDtos(req.user.id);
	}

	@Get('/agents/:agentId')
	@GlobalScope('chatHubAgent:read')
	async getAgent(req: AuthenticatedRequest, _res: Response, @Param('agentId') agentId: string) {
		return await this.chatAgentService.getAgentByIdAsDto(agentId, req.user.id);
	}

	@Post('/agents')
	@GlobalScope('chatHubAgent:create')
	async createAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ChatHubCreateAgentRequest,
	) {
		return await this.chatAgentService.createAgent(req.user, payload);
	}

	@Post('/agents/:agentId')
	@GlobalScope('chatHubAgent:update')
	async updateAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: ChatHubUpdateAgentRequest,
	) {
		return await this.chatAgentService.updateAgent(agentId, req.user, payload);
	}

	@Delete('/agents/:agentId')
	@GlobalScope('chatHubAgent:delete')
	async deleteAgent(
		req: AuthenticatedRequest,
		res: Response,
		@Param('agentId') agentId: string,
	): Promise<void> {
		await this.chatAgentService.deleteAgent(agentId, req.user.id);

		res.status(204).send();
	}

	private assertToolTypeAllowed(type: string, user: AuthenticatedRequest['user']) {
		if (ALWAYS_BLOCKED_CHAT_HUB_TOOL_TYPES.includes(type)) {
			throw new BadRequestError(`Tool type "${type}" is not supported in the Chat Hub`);
		}
		if (
			user.role.slug === 'global:chatUser' &&
			CHAT_USER_BLOCKED_CHAT_HUB_TOOL_TYPES.includes(type)
		) {
			throw new BadRequestError(`Tool type "${type}" is not available for your role`);
		}
	}
}
