import {
	ChatHubSendMessageRequest,
	ChatModelsResponse,
	ChatHubConversationsResponse,
	ChatHubConversationResponse,
	ChatHubEditMessageRequest,
	ChatHubRegenerateMessageRequest,
	ChatHubChangeConversationTitleRequest,
	ChatSessionId,
	ChatMessageId,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Body, GlobalScope, Get, Delete, Param } from '@n8n/decorators';
import type { Response } from 'express';
import { strict as assert } from 'node:assert';

import { ChatHubService } from './chat-hub.service';
import { ChatModelsRequestDto } from './dto/chat-models-request.dto';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';

@RestController('/chat')
export class ChatHubController {
	constructor(
		private readonly chatService: ChatHubService,
		private readonly logger: Logger,
	) {}

	@Post('/models')
	@GlobalScope('chatHub:message')
	async getModels(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ChatModelsRequestDto,
	): Promise<ChatModelsResponse> {
		return await this.chatService.getModels(req.user, payload.credentials);
	}

	@Get('/conversations')
	@GlobalScope('chatHub:message')
	async getConversations(
		req: AuthenticatedRequest,
		_res: Response,
	): Promise<ChatHubConversationsResponse> {
		return await this.chatService.getConversations(req.user.id);
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

	@GlobalScope('chatHub:message')
	@Post('/conversations/send')
	async sendMessage(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: ChatHubSendMessageRequest,
	) {
		this.logger.debug(`Chat send request received: ${JSON.stringify(payload)}`);

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
					JSON.stringify({
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
		this.logger.debug(`Chat edit request received: ${JSON.stringify(payload)}`);

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
					JSON.stringify({
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
		this.logger.debug(`Chat retry request received: ${JSON.stringify(payload)}`);

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
					JSON.stringify({
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
		this.logger.debug(`Chat stop request received: ${JSON.stringify({ sessionId, messageId })}`);

		await this.chatService.stopGeneration(req.user, sessionId, messageId);
		res.status(204).send();
	}

	@Post('/conversations/:sessionId/rename')
	@GlobalScope('chatHub:message')
	async updateConversationTitle(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sessionId') sessionId: ChatSessionId,
		@Body payload: ChatHubChangeConversationTitleRequest,
	): Promise<ChatHubConversationResponse> {
		await this.chatService.updateSessionTitle(req.user.id, sessionId, payload.title);

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
}
