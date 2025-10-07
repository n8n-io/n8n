import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Get, Post, Body } from '@n8n/decorators';
import type { Response } from 'express';
import { strict as assert } from 'node:assert';

import { ChatHubService } from './chat-hub.service';
import { ChatMessageRequestDto } from './dto/chat-message-request.dto';

export type FlushableResponse = Response & { flush: () => void };

@RestController('/chat')
export class ChatHubController {
	constructor(private readonly chatService: ChatHubService) {}

	@Get('/agents/models/openai')
	async getModels(_req: AuthenticatedRequest, res: FlushableResponse) {
		const models = await this.chatService.getModels();
		res.json(models);
	}

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

			const aiResponse = this.chatService.ask(payload, req.user, signal);

			try {
				// Handle the stream
				for await (const chunk of aiResponse) {
					res.flush();
					res.write(JSON.stringify(chunk) + '⧉⇋⇋➽⌑⧉§§\n');
				}
			} catch (streamError) {
				// If an error occurs during streaming, send it as part of the stream
				// This prevents "Cannot set headers after they are sent" error
				assert(streamError instanceof Error);

				// Send error as proper error type now that frontend supports it
				const errorChunk = {
					messages: [
						{
							role: 'assistant',
							type: 'error',
							content: streamError.message,
						},
					],
				};
				res.write(JSON.stringify(errorChunk) + '⧉⇋⇋➽⌑⧉§§\n');
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
}
