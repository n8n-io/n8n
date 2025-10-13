import {
	ChatHubSendMessageRequest,
	ChatModelsResponse,
	ChatHubConversationsResponse,
	ChatHubMessagesResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Body, GlobalScope, Get } from '@n8n/decorators';
import type { Response } from 'express';
import { strict as assert } from 'node:assert';

import { ChatHubService } from './chat-hub.service';
import { ChatModelsRequestDto } from './dto/chat-models-request.dto';

@RestController('/chat')
export class ChatHubController {
	constructor(
		private readonly chatService: ChatHubService,
		private readonly logger: Logger,
	) {}

	@Post('/models')
	async getModels(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ChatModelsRequestDto,
	): Promise<ChatModelsResponse> {
		return await this.chatService.getModels(req.user, payload.credentials);
	}

	@GlobalScope('chatHub:message')
	@Post('/send')
	async sendMessage(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: ChatHubSendMessageRequest,
	) {
		res.header('Content-type', 'application/json-lines; charset=utf-8');
		res.header('Transfer-Encoding', 'chunked');
		res.header('Connection', 'keep-alive');
		res.header('Cache-Control', 'no-cache');
		res.flushHeaders();

		// TODO: Save human message to DB

		const replyId = crypto.randomUUID();

		this.logger.info(`Chat send request received: ${JSON.stringify(payload)}`);

		try {
			await this.chatService.askN8n(res, req.user, {
				...payload,
				userId: req.user.id,
				replyId,
			});
		} catch (executionError: unknown) {
			assert(executionError instanceof Error);

			this.logger.error('Error in chat send endpoint', { error: executionError });

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
						id: replyId,
					}) + '\n',
				);
				res.flush();
			}

			if (!res.writableEnded) res.end();
		}
	}

	@Get('/conversations')
	async getConversations(
		_req: AuthenticatedRequest,
		_res: Response,
	): Promise<ChatHubConversationsResponse> {
		return await this.chatService.getConversations();
	}

	@Get('/conversations/:id/messages')
	async getConversationMessages(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
	): Promise<ChatHubMessagesResponse> {
		return await this.chatService.getConversationMessages(req.params.id);
	}
}
