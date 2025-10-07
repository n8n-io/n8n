import type { ChatModelsResponse } from '@n8n/api-types';
import type { StreamOutput } from '@n8n/chat-hub';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Body, GlobalScope } from '@n8n/decorators';
import type { Response } from 'express';
import { strict as assert } from 'node:assert';

import { ChatHubService } from './chat-hub.service';
import { AskAiWithCredentialsRequestDto } from './dto/ask-ai-with-credentials-request.dto';
import { ChatMessageRequestDto } from './dto/chat-message-request.dto';
import { ChatModelsRequestDto } from './dto/chat-models-request.dto';

import { STREAM_SEPARATOR } from '@/constants';

export type FlushableResponse = Response & { flush: () => void };

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
	@Post('/agents/openai')
	async ask(
		req: AuthenticatedRequest,
		res: FlushableResponse,
		@Body payload: ChatMessageRequestDto,
	) {
		try {
			const abortController = new AbortController();
			const { signal } = abortController;

			const handleClose = () => abortController.abort();

			res.on('close', handleClose);

			const messageId = crypto.randomUUID();
			const aiResponse = this.chatService.ask(
				{
					...payload,
					userId: req.user.id,
					messageId,
					provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				},
				signal,
			);

			res.header('Content-type', 'application/json-lines').flush();

			try {
				// Handle the stream
				for await (const chunk of aiResponse) {
					res.flush();
					res.write(JSON.stringify(chunk) + STREAM_SEPARATOR);
				}
			} catch (streamError) {
				// If an error occurs during streaming, send it as part of the stream
				// This prevents "Cannot set headers after they are sent" error
				assert(streamError instanceof Error);

				// Send error as proper error type now that frontend supports it
				const errorChunk: StreamOutput = {
					messages: [
						{
							id: messageId,
							role: 'assistant',
							type: 'error',
							content: streamError.message,
						},
					],
				};
				res.write(JSON.stringify(errorChunk) + STREAM_SEPARATOR);
			} finally {
				// Clean up event listener
				res.off('close', handleClose);
			}

			res.end();
		} catch (e: unknown) {
			// This catch block handles errors that occur before streaming starts
			// Since headers haven't been sent yet, we can still send a proper error response
			assert(e instanceof Error);
			if (!res.headersSent) {
				res.status(500).json({
					code: 500,
					message: e.message,
				});
			} else {
				// If headers were already sent dont't send a second error response
				res.end();
			}
		}
	}

	@GlobalScope('chatHub:message')
	@Post('/agents/n8n')
	async askN8n(
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
