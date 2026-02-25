import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Param } from '@n8n/decorators';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { InstanceAiService } from './instance-ai.service';

type FlushableResponse = Response & { flush?: () => void };

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

		// Stream response as newline-separated JSON chunks
		// Disable compression buffering for real-time streaming
		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		try {
			const fullStream = await this.instanceAiService.sendMessage(req.user, threadId, message);

			for await (const chunk of fullStream) {
				res.write(JSON.stringify(chunk) + '\n');
				res.flush?.();
			}

			res.write(JSON.stringify({ type: 'done' }) + '\n');
			res.flush?.();
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
				res.write(JSON.stringify({ type: 'error', content: 'An error occurred' }) + '\n');
				res.flush?.();
				res.end();
			}
		}
	}
}
