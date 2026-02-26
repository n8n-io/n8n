import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import express from 'express';

import {
	A2A_VERSION,
	fromA2ARequest,
	internalStepToA2AStream,
	toA2AResponse,
} from '@/agents/a2a-adapter';
import type { A2ASendMessageRequest } from '@/agents/a2a-adapter';
import { AgentsService } from '@/services/agents/agents.service';
import { MAX_ITERATIONS, sseWrite, hardenSseConnection } from '@/services/agents/agents.types';
import { PublicApiKeyService } from '@/services/public-api-key.service';

type ApiKeyScope = 'agent:receive' | 'agent:execute';

async function resolveAgentFromApiKey(
	req: express.Request,
	res: express.Response,
	scope: ApiKeyScope,
): Promise<User | null> {
	const apiKey = req.headers['x-n8n-api-key'] as string | undefined;
	if (!apiKey) {
		res.status(401).json({ message: 'x-n8n-api-key header required' });
		return null;
	}

	const publicApiKeyService = Container.get(PublicApiKeyService);
	const user = await publicApiKeyService.resolveUserFromApiKey(apiKey);
	if (!user) {
		res.status(401).json({ message: 'Invalid API key' });
		return null;
	}

	if (user.type !== 'agent') {
		res.status(400).json({ message: 'API key does not belong to an agent' });
		return null;
	}

	const hasScope = await publicApiKeyService.apiKeyHasValidScopes(apiKey, scope);
	if (!hasScope) {
		res.status(403).json({ message: `API key missing ${scope} scope` });
		return null;
	}

	return user;
}

export function createA2ARouter(): express.Router {
	const router = express.Router();

	// A2A Discovery: GET /.well-known/agent.json
	router.get('/.well-known/agent.json', async (req: express.Request, res: express.Response) => {
		const user = await resolveAgentFromApiKey(req, res, 'agent:receive');
		if (!user) return;

		const agentsService = Container.get(AgentsService);
		const baseUrl = `${req.protocol}://${req.get('host')}`;
		const card = await agentsService.getAgentCard(user.id, baseUrl);
		res.set('A2A-Version', A2A_VERSION);
		res.json(card);
	});

	// A2A: POST /message:send — synchronous task dispatch
	router.post(
		'/message:send',
		express.json(),
		async (req: express.Request, res: express.Response) => {
			const user = await resolveAgentFromApiKey(req, res, 'agent:execute');
			if (!user) return;

			const a2aReq = req.body as A2ASendMessageRequest;
			if (!a2aReq.message?.parts?.length) {
				res.status(400).json({ message: 'Message must contain at least one part' });
				return;
			}

			const { prompt, taskId, contextId } = fromA2ARequest(a2aReq);
			const agentsService = Container.get(AgentsService);

			const byokCreds = a2aReq.metadata?.byokCredentials as
				| { anthropicApiKey?: string; workflowCredentials?: Record<string, Record<string, string>> }
				| undefined;
			const byokApiKey = byokCreds?.anthropicApiKey;
			const callerId = a2aReq.metadata?.callerId as string | undefined;
			const workflowCredentials = byokCreds?.workflowCredentials;

			const result = await agentsService.executeAgentTask(
				user.id,
				prompt,
				{ remaining: MAX_ITERATIONS },
				{ callChain: new Set<string>(), byokApiKey, callerId, workflowCredentials },
			);

			res.set('A2A-Version', A2A_VERSION);
			res.json(toA2AResponse(result, taskId, contextId));
		},
	);

	// A2A: POST /message:stream — streaming task dispatch (SSE)
	router.post(
		'/message:stream',
		express.json(),
		async (req: express.Request, res: express.Response) => {
			const user = await resolveAgentFromApiKey(req, res, 'agent:execute');
			if (!user) return;

			const a2aReq = req.body as A2ASendMessageRequest;
			if (!a2aReq.message?.parts?.length) {
				res.status(400).json({ message: 'Message must contain at least one part' });
				return;
			}

			const { prompt, taskId, contextId } = fromA2ARequest(a2aReq);
			const agentsService = Container.get(AgentsService);

			const streamByokCreds = a2aReq.metadata?.byokCredentials as
				| { anthropicApiKey?: string; workflowCredentials?: Record<string, Record<string, string>> }
				| undefined;
			const streamByokApiKey = streamByokCreds?.anthropicApiKey;
			const streamCallerId = a2aReq.metadata?.callerId as string | undefined;
			const streamWorkflowCredentials = streamByokCreds?.workflowCredentials;

			res.writeHead(200, {
				'Content-Type': 'text/event-stream; charset=UTF-8',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'A2A-Version': A2A_VERSION,
			});

			const cleanup = hardenSseConnection(req, res);

			// Initial status: submitted
			sseWrite(res, {
				status_update: {
					task_id: taskId,
					context_id: contextId,
					status: { state: 'submitted', timestamp: new Date().toISOString() },
				},
			});

			try {
				const result = await agentsService.executeAgentTask(
					user.id,
					prompt,
					{ remaining: MAX_ITERATIONS },
					{
						onStep: (event) => {
							sseWrite(res, internalStepToA2AStream(event, taskId, contextId));
						},
						callChain: new Set<string>(),
						byokApiKey: streamByokApiKey,
						callerId: streamCallerId,
						workflowCredentials: streamWorkflowCredentials,
					},
				);

				sseWrite(
					res,
					internalStepToA2AStream(
						{ type: 'done', status: result.status, summary: result.summary ?? result.message },
						taskId,
						contextId,
					),
				);
			} catch (error) {
				if (!res.writableEnded) {
					const msg = error instanceof Error ? error.message : String(error);
					sseWrite(res, {
						task: {
							id: taskId,
							context_id: contextId,
							status: {
								state: 'failed',
								timestamp: new Date().toISOString(),
								message: {
									message_id: `err-${Date.now()}`,
									role: 'agent',
									parts: [{ text: msg }],
								},
							},
						},
					});
				}
			} finally {
				cleanup();
			}

			res.end();
		},
	);

	return router;
}
