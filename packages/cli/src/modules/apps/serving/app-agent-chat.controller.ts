import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Options, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import { hashAgentSandboxPrincipal } from '@/modules/agents/agent-sandbox-principal';
import {
	initSseStream,
	pumpChunks,
	type FlushableResponse,
} from '@/modules/agents/agent-sse-stream';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { applyCors } from '@/utils/cors.util';

import { AppRequestAuth } from './app-request-auth';

const CORS_OPTIONS = { extraAllowedHeaders: ['Authorization'], maxAge: 600 };

const chatRequestSchema = z.object({
	message: z.string().min(1).max(4000),
	threadId: z.string().uuid().optional(),
});

const APP_CHAT_INTEGRATION_TYPE = 'n8n-app';

/**
 * Streams one turn of a chat with a published agent of the App's project to
 * the served page. `skipAuth` like the actions endpoint: the access token in
 * the `Authorization` header is the only credential.
 */
@RootLevelController('/apps')
export class AppAgentChatController {
	constructor(
		private readonly appRequestAuth: AppRequestAuth,
		private readonly logger: Logger,
	) {}

	@Options('/:namespace/_agents/:pageId/:blockId/chat', { skipAuth: true, usesTemplates: true })
	preflight(req: Request, res: Response) {
		applyCors(req, res, CORS_OPTIONS);
		res.status(204).end();
	}

	@Post('/:namespace/_agents/:pageId/:blockId/chat', { skipAuth: true, usesTemplates: true })
	async chat(req: Request, res: FlushableResponse) {
		applyCors(req, res, CORS_OPTIONS);
		const { namespace, pageId, blockId } = req.params as Record<string, string>;

		const body = chatRequestSchema.safeParse(req.body);
		if (!body.success) {
			res.status(400).json({ error: 'Invalid chat request' });
			return;
		}

		const authorized = await this.appRequestAuth.authorize(req, namespace);
		if ('error' in authorized) {
			res.status(authorized.status).json({ error: authorized.error });
			return;
		}
		const { app, viewer, pages } = authorized;

		const page = pages.find((p) => p.id === pageId);
		const block = page
			? [...(page.content ?? []), ...(page.layout ?? [])].find((b) => b.id === blockId)
			: undefined;
		if (!block || block.type !== 'agent-chat') {
			res.status(404).json({ error: 'Chat not found' });
			return;
		}

		if (!Container.get(ModuleRegistry).isActive('agents')) {
			res.status(404).json({ error: 'Agents are not enabled' });
			return;
		}

		const agent = await Container.get(AgentRepository).findByIdAndProjectId(
			block.data.agentId,
			app.projectId,
		);
		if (!agent?.activeVersionId) {
			res.status(404).json({ error: 'Agent is not published' });
			return;
		}

		const { message } = body.data;
		const threadId = body.data.threadId ?? randomUUID();
		// An `n8n` viewer keeps one memory across threads; a public visitor's memory
		// is the thread itself, which lives as long as the page script keeps the id.
		const resourceId = viewer
			? `app:${app.id}:viewer:${viewer.id}`
			: `app:${app.id}:session:${threadId}`;

		const { send } = initSseStream(res);
		let closed = false;
		const markClosed = () => {
			closed = true;
		};
		res.once('close', markClosed);
		try {
			await pumpChunks(
				Container.get(AgentExecutionOrchestratorService).executeForChatPublished({
					agentId: agent.id,
					projectId: app.projectId,
					message,
					memory: { threadId, resourceId },
					integrationType: APP_CHAT_INTEGRATION_TYPE,
					sandboxPrincipalHash: hashAgentSandboxPrincipal({
						type: 'project-session',
						projectId: app.projectId,
						sessionId: threadId,
					}),
				}),
				send,
			);
			send({ type: 'done', sessionId: threadId });
		} catch (error) {
			this.logger.warn('App agent chat failed', {
				appId: app.id,
				blockId,
				agentId: agent.id,
				error,
			});
			if (!closed) {
				send({ type: 'error', message: error instanceof Error ? error.message : 'Chat failed' });
			}
		} finally {
			res.off('close', markClosed);
			res.end();
		}
	}
}
