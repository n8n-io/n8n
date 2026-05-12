import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import { Readable } from 'stream';

import { AgentService } from './cloud-agent.service';

interface ChatRequestBody {
	threadId: string;
	message: string;
}

interface ToolResultRequestBody {
	toolCallId: string;
	output: unknown;
	isError: boolean;
}

/**
 * REST surface for the cloud agent. Forwards calls to ai-assistant-service
 * over the cloud agent transport (see AgentClient). The local n8n instance
 * is responsible for:
 *   - authenticating the user (RBAC via @GlobalScope)
 *   - relaying the SSE event stream from the service to the browser
 *   - posting tool-results back when the agent issues family=n8n tool calls
 *     (real dispatch lands in agent-tool-router.service in a follow-up)
 */
@RestController('/cloud-agent')
export class AgentController {
	constructor(private readonly agentService: AgentService) {}

	@Post('/chat')
	@GlobalScope('cloudAgent:message')
	async chat(req: AuthenticatedRequest, _res: Response, @Body body: ChatRequestBody) {
		return await this.agentService.startRun(body, req.user);
	}

	@Get('/events/:threadId', { usesTemplates: true })
	@GlobalScope('cloudAgent:message')
	async events(req: AuthenticatedRequest, res: Response, @Param('threadId') threadId: string) {
		const query = req.query as { lastEventId?: string };
		const lastEventIdNum =
			typeof query.lastEventId === 'string' ? Number.parseInt(query.lastEventId, 10) : undefined;
		const upstream = await this.agentService.openEventStream(threadId, req.user, lastEventIdNum);

		if (!upstream.ok || !upstream.body) {
			res.status(upstream.status || 502).end();
			return;
		}

		// Mirror instance-ai's SSE handling: disable Brotli (memory leak in
		// long-lived streams), pass headers through.
		res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('Content-Encoding', 'identity');
		res.flushHeaders();

		const bodyStream = Readable.fromWeb(upstream.body as never);
		const closeUpstream = () => bodyStream.destroy();
		req.on('close', closeUpstream);

		try {
			bodyStream.pipe(res);
			await new Promise<void>((resolve, reject) => {
				bodyStream.on('end', resolve);
				bodyStream.on('error', reject);
			});
		} finally {
			req.off('close', closeUpstream);
			if (!res.writableEnded) res.end();
		}
	}

	@Post('/runs/:runId/tool-result')
	@GlobalScope('cloudAgent:message')
	async postToolResult(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('runId') runId: string,
		@Body body: ToolResultRequestBody,
	) {
		await this.agentService.postToolResult(runId, body, req.user);
		return { ok: true };
	}

	@Post('/runs/:runId/cancel')
	@GlobalScope('cloudAgent:message')
	async cancel(req: AuthenticatedRequest, _res: Response, @Param('runId') runId: string) {
		return await this.agentService.cancelRun(runId, req.user);
	}
}
