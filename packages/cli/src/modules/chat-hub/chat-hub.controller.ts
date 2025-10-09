import type { ChatModelsResponse } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Body, GlobalScope } from '@n8n/decorators';
import type { Response } from 'express';
import { strict as assert } from 'node:assert';

import { ChatHubService } from './chat-hub.service';
import { AskAiWithCredentialsRequestDto } from './dto/ask-ai-with-credentials-request.dto';
import { ChatModelsRequestDto } from './dto/chat-models-request.dto';

@RestController('/chat')
export class ChatHubController {
	constructor(private readonly chatService: ChatHubService) {}

	@Post('/models')
	async getModels(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ChatModelsRequestDto,
	): Promise<ChatModelsResponse> {
		return await this.chatService.getModels(req.user.id, payload.credentials);
	}

	@GlobalScope('chatHub:message')
	@Post('/send')
	async sendMessage(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: AskAiWithCredentialsRequestDto,
	) {
		res.header('Content-type', 'application/json-lines; charset=utf-8');
		res.header('Transfer-Encoding', 'chunked');
		res.header('Connection', 'keep-alive');
		res.header('Cache-Control', 'no-cache');
		res.flushHeaders();

		// TODO: Save human message to DB

		const replyId = crypto.randomUUID();

		try {
			await this.chatService.askN8n(res, req.user, {
				...payload,
				userId: req.user.id,
				replyId,
			});
		} catch (executionError: unknown) {
			assert(executionError instanceof Error);

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
}
