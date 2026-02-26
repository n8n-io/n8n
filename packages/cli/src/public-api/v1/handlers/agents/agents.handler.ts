import { Container } from '@n8n/di';
import type express from 'express';

import type { AuthenticatedRequest } from '@n8n/db';
import { sendErrorResponse } from '@/response-helper';
import { AgentsService } from '@/services/agents/agents.service';
import type { ExternalAgentConfig } from '@/services/agents/agents.types';
import { MAX_ITERATIONS, executeTaskOverSse } from '@/services/agents/agents.types';

import { apiKeyHasScope } from '../../shared/middlewares/global.middleware';

export = {
	getAgentCard: [
		apiKeyHasScope('agent:read'),
		async (
			req: AuthenticatedRequest<{ id: string }>,
			res: express.Response,
		): Promise<express.Response> => {
			const agentsService = Container.get(AgentsService);
			const baseUrl = `${req.protocol}://${req.get('host')}`;
			const card = await agentsService.getAgentCard(req.params.id, baseUrl);
			return res.json(card);
		},
	],
	dispatchAgentTask: [
		apiKeyHasScope('agent:execute'),
		async (req: AuthenticatedRequest<{ id: string }>, res: express.Response) => {
			const agentsService = Container.get(AgentsService);
			const agentId = req.params.id;

			try {
				await agentsService.enforceAccessLevel(agentId, req.user);
			} catch (error) {
				sendErrorResponse(res, error instanceof Error ? error : new Error(String(error)));
				return;
			}

			const { prompt, externalAgents, byokCredentials, callerId } = req.body as {
				prompt: string;
				externalAgents?: ExternalAgentConfig[];
				byokCredentials?: {
					anthropicApiKey?: string;
					workflowCredentials?: Record<string, Record<string, string>>;
				};
				callerId?: string;
			};
			const byokApiKey = byokCredentials?.anthropicApiKey;
			const workflowCredentials = byokCredentials?.workflowCredentials;
			const wantsStream = req.headers.accept?.includes('text/event-stream');
			const callChain = new Set<string>();

			const taskOptions = { externalAgents, callChain, byokApiKey, callerId, workflowCredentials };

			if (!wantsStream) {
				const result = await agentsService.executeAgentTask(
					agentId,
					prompt,
					{ remaining: MAX_ITERATIONS },
					taskOptions,
				);
				return res.json(result);
			}

			await executeTaskOverSse(req, res, (onStep) =>
				agentsService.executeAgentTask(
					agentId,
					prompt,
					{ remaining: MAX_ITERATIONS },
					{
						...taskOptions,
						onStep,
					},
				),
			);
			return res;
		},
	],
};
