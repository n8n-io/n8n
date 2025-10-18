import {
	ChatHubSendMessageRequest,
	ChatModelsResponse,
	ChatHubConversationsResponse,
	ChatHubConversationResponse,
	ChatHubEditMessageRequest,
	ChatHubRegenerateMessageRequest,
	ChatHubChangeConversationTitleRequest,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Body, GlobalScope, Get, Delete } from '@n8n/decorators';
import type { Response } from 'express';
import { strict as assert } from 'node:assert';

import { ChatHubService } from './chat-hub.service';
import { ChatModelsRequestDto } from './dto/chat-models-request.dto';

/* eslint-disable @typescript-eslint/naming-convention */
const JSONL_STREAM_HEADERS = {
	'Content-Type': 'application/json-lines; charset=utf-8',
	'Transfer-Encoding': 'chunked',
	'Cache-Control': 'no-cache',
	Connection: 'keep-alive',
};
/* eslint-enable @typescript-eslint/naming-convention */

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

	@Get('/conversations/:id')
	@GlobalScope('chatHub:message')
	async getConversationMessages(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
	): Promise<ChatHubConversationResponse> {
		return await this.chatService.getConversation(req.user.id, req.params.id);
	}

	@GlobalScope('chatHub:message')
	@Post('/conversations/send')
	async sendMessage(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: ChatHubSendMessageRequest,
	) {
		res.writeHead(200, JSONL_STREAM_HEADERS);
		res.flushHeaders();

		this.logger.debug(`Chat send request received: ${JSON.stringify(payload)}`);

		try {
			await this.chatService.sendHumanMessage(res, req.user, {
				...payload,
				userId: req.user.id,
			});
		} catch (executionError: unknown) {
			assert(executionError instanceof Error);

			this.logger.error(`Error in chat send endpoint: ${executionError}`);

			if (!res.headersSent) {
				res.status(500).json({
					code: 500,
					message: executionError.message,
				});
			} else {
				res.write(
					JSON.stringify({
						type: 'error',
						content: executionError.message,
						id: payload.replyId,
					}) + '\n',
				);
				res.flush();
			}

			if (!res.writableEnded) res.end();
		}
	}

	@GlobalScope('chatHub:message')
	@Post('/conversations/edit')
	async editMessage(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: ChatHubEditMessageRequest,
	) {
		res.writeHead(200, JSONL_STREAM_HEADERS);
		res.flushHeaders();

		this.logger.debug(`Chat edit request received: ${JSON.stringify(payload)}`);

		try {
			await this.chatService.editHumanMessage(res, req.user, {
				...payload,
				userId: req.user.id,
			});
		} catch (executionError: unknown) {
			assert(executionError instanceof Error);

			this.logger.error(`Error in chat edit endpoint: ${executionError}`);

			if (!res.headersSent) {
				res.status(500).json({
					code: 500,
					message: executionError.message,
				});
			} else {
				res.write(
					JSON.stringify({
						type: 'error',
						content: executionError.message,
						id: payload.replyId,
					}) + '\n',
				);
				res.flush();
			}

			if (!res.writableEnded) res.end();
		}
	}

	@GlobalScope('chatHub:message')
	@Post('/conversations/regenerate')
	async regenerateMessage(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: ChatHubRegenerateMessageRequest,
	) {
		res.writeHead(200, JSONL_STREAM_HEADERS);
		res.flushHeaders();

		this.logger.debug(`Chat retry request received: ${JSON.stringify(payload)}`);

		try {
			await this.chatService.regenerateAIMessage(res, req.user, {
				...payload,
				userId: req.user.id,
			});
		} catch (executionError: unknown) {
			assert(executionError instanceof Error);

			this.logger.error(`Error in chat retry endpoint: ${executionError}`);

			if (!res.headersSent) {
				res.status(500).json({
					code: 500,
					message: executionError.message,
				});
			} else {
				res.write(
					JSON.stringify({
						type: 'error',
						content: executionError.message,
						id: payload.replyId,
					}) + '\n',
				);
				res.flush();
			}

			if (!res.writableEnded) res.end();
		}
	}

	@Post('/conversations/:id/rename')
	@GlobalScope('chatHub:message')
	async updateConversationTitle(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
		@Body payload: ChatHubChangeConversationTitleRequest,
	): Promise<ChatHubConversationResponse> {
		await this.chatService.updateSessionTitle(req.user.id, req.params.id, payload.title);

		return await this.chatService.getConversation(req.user.id, req.params.id);
	}

	@Delete('/conversations/:id')
	@GlobalScope('chatHub:message')
	async deleteConversation(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
	): Promise<void> {
		await this.chatService.deleteSession(req.user.id, req.params.id);
	}
}
