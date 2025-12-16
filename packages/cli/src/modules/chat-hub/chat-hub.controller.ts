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
	ChatHubConversationsRequest,
	ViewableMimeTypes,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
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
import { jsonStringify } from 'n8n-workflow';
import { strict as assert } from 'node:assert';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import { ChatHubModelsService } from './chat-hub.models.service';
import { ChatHubService } from './chat-hub.service';
import { ChatModelsRequestDto } from './dto/chat-models-request.dto';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@RestController('/chat')
export class ChatHubController {
	constructor(
		private readonly chatService: ChatHubService,
		private readonly chatModelsService: ChatHubModelsService,
		private readonly chatAgentService: ChatHubAgentService,
		private readonly chatAttachmentService: ChatHubAttachmentService,
		private readonly logger: Logger,
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
		await this.chatService.getConversation(req.user.id, sessionId);

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
		res: Response,
		@Body payload: ChatHubSendMessageRequest,
	) {
		try {
			await this.chatService.sendHumanMessage(res, req.user, {
				...payload,
				userId: req.user.id,
			});
		} catch (error: unknown) {
			assert(error instanceof Error);

			this.logger.error(`Error in chat send endpoint: ${error}`);

			if (!res.headersSent) {
				if (error instanceof ResponseError) {
					throw error;
				}

				res.status(500).json({
					code: 500,
					message: error.message,
				});
			} else if (!res.writableEnded) {
				res.write(
					jsonStringify({
						type: 'error',
						content: error.message,
					}) + '\n',
				);
				res.flush();
			}

			if (!res.writableEnded) res.end();
		}
	}

	@GlobalScope('chatHub:message')
	@Post('/conversations/:sessionId/messages/:messageId/edit')
	async editMessage(
		req: AuthenticatedRequest,
		res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
		@Param('messageId') editId: ChatMessageId,
		@Body payload: ChatHubEditMessageRequest,
	) {
		try {
			await this.chatService.editMessage(res, req.user, {
				...payload,
				sessionId,
				editId,
				userId: req.user.id,
			});
		} catch (error: unknown) {
			assert(error instanceof Error);

			this.logger.error(`Error in chat edit endpoint: ${error}`);

			if (!res.headersSent) {
				if (error instanceof ResponseError) {
					throw error;
				}

				res.status(500).json({
					code: 500,
					message: error.message,
				});
			} else if (!res.writableEnded) {
				res.write(
					jsonStringify({
						type: 'error',
						content: error.message,
					}) + '\n',
				);
				res.flush();
			}

			if (!res.writableEnded) res.end();
		}
	}

	@GlobalScope('chatHub:message')
	@Post('/conversations/:sessionId/messages/:messageId/regenerate')
	async regenerateMessage(
		req: AuthenticatedRequest,
		res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
		@Param('messageId') retryId: ChatMessageId,
		@Body payload: ChatHubRegenerateMessageRequest,
	) {
		try {
			await this.chatService.regenerateAIMessage(res, req.user, {
				...payload,
				sessionId,
				retryId,
				userId: req.user.id,
			});
		} catch (error: unknown) {
			assert(error instanceof Error);

			this.logger.error(`Error in chat retry endpoint: ${error}`);

			if (!res.headersSent) {
				if (error instanceof ResponseError) {
					throw error;
				}

				res.status(500).json({
					code: 500,
					message: error.message,
				});
			} else if (!res.writableEnded) {
				res.write(
					jsonStringify({
						type: 'error',
						content: error.message,
					}) + '\n',
				);
				res.flush();
			}

			if (!res.writableEnded) res.end();
		}
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

	@Get('/agents')
	@GlobalScope('chatHubAgent:list')
	async getAgents(req: AuthenticatedRequest) {
		return await this.chatAgentService.getAgentsByUserId(req.user.id);
	}

	@Get('/agents/:agentId')
	@GlobalScope('chatHubAgent:read')
	async getAgent(req: AuthenticatedRequest, _res: Response, @Param('agentId') agentId: string) {
		return await this.chatAgentService.getAgentById(agentId, req.user.id);
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
}
