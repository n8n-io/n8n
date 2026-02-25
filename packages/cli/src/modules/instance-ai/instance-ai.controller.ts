import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Param } from '@n8n/decorators';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { InstanceAiService } from './instance-ai.service';

type FlushableResponse = Response & { flush?: () => void };

const KEEP_ALIVE_INTERVAL_MS = 15_000;

@RestController('/instance-ai')
export class InstanceAiController {
	constructor(
		private readonly logger: Logger,
		private readonly instanceAiService: InstanceAiService,
		private readonly errorReporter: ErrorReporter,
	) {}

	@Post('/chat/:threadId')
	async chat(
		req: AuthenticatedRequest,
		res: FlushableResponse,
		@Param('threadId') threadId: string,
	) {
		const { message } = req.body as { message: string };

		if (!message?.trim()) {
			res.status(400).json({ error: 'Message is required' });
			return;
		}

		// Stream response as Server-Sent Events
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		// Keep-alive comment to prevent proxy/client timeouts during long tool calls
		const keepAlive = setInterval(() => {
			res.write(': ping\n\n');
			res.flush?.();
		}, KEEP_ALIVE_INTERVAL_MS);

		// Abort iteration if client disconnects
		let clientDisconnected = false;
		res.on('close', () => {
			clientDisconnected = true;
		});

		try {
			const fullStream = await this.instanceAiService.sendMessage(req.user, threadId, message);

			for await (const chunk of fullStream) {
				if (clientDisconnected) break;

				const typedChunk = chunk as { type?: string };
				const eventType = typedChunk.type ?? 'message';
				res.write(`event: ${eventType}\ndata: ${JSON.stringify(chunk)}\n\n`);
				res.flush?.();
			}

			if (!clientDisconnected) {
				res.write('data: [DONE]\n\n');
				res.flush?.();
			}
			res.end();
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error('Instance AI chat error', {
				error: error instanceof Error ? error.message : String(error),
				threadId,
			});

			if (!res.headersSent) {
				res.status(500).json({ error: 'Internal server error' });
			} else if (!clientDisconnected) {
				res.write(
					`event: error\ndata: ${JSON.stringify({ type: 'error', content: 'An error occurred' })}\n\n`,
				);
				res.flush?.();
				res.end();
			}
		} finally {
			clearInterval(keepAlive);
		}
	}
}
