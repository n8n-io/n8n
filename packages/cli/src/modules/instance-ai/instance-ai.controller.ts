import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Param } from '@n8n/decorators';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { InstanceAiService } from './instance-ai.service';

@RestController('/instance-ai')
export class InstanceAiController {
	constructor(
		private readonly logger: Logger,
		private readonly instanceAiService: InstanceAiService,
		private readonly errorReporter: ErrorReporter,
	) {}

	@Post('/chat/:threadId')
	async chat(req: AuthenticatedRequest, res: Response, @Param('threadId') threadId: string) {
		const { message } = req.body as { message: string };

		if (!message?.trim()) {
			res.status(400).json({ error: 'Message is required' });
			return;
		}

		// Set up SSE headers
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		try {
			const textStream = await this.instanceAiService.sendMessage(req.user, threadId, message);

			const reader = textStream.getReader();
			let done = false;

			while (!done) {
				const result = await reader.read();
				done = result.done;

				if (!done && result.value) {
					res.write(`data: ${JSON.stringify({ type: 'chunk', content: result.value })}\n\n`);
				}
			}

			res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
			res.end();
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error('Instance AI chat error', {
				error: error instanceof Error ? error.message : String(error),
				threadId,
			});

			if (!res.headersSent) {
				res.status(500).json({ error: 'Internal server error' });
			} else {
				res.write(`data: ${JSON.stringify({ type: 'error', content: 'An error occurred' })}\n\n`);
				res.end();
			}
		}
	}
}
