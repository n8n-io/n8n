import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { AgentKnowledgeService } from '../agent-knowledge.service';
import { AgentSandboxController } from '../agent-sandbox.controller';
import type { AgentsService } from '../agents.service';

describe('AgentSandboxController', () => {
	it('accepts knowledge sandbox warmup before files exist', async () => {
		const agentsService = mock<AgentsService>();
		agentsService.isKnowledgeBaseEnabled.mockReturnValue(true);
		const agentKnowledgeService = mock<AgentKnowledgeService>();
		const controller = new AgentSandboxController(
			agentsService,
			agentKnowledgeService,
			mock<Logger>(),
		);
		const req = { user: { id: 'user-1' } } as AuthenticatedRequest<{ projectId: string }>;
		const res = mock<Response>();

		await expect(
			controller.warmKnowledgeSandbox(req, res, 'project-1', 'agent-1'),
		).resolves.toEqual({ accepted: true });
		await new Promise<void>((resolve) => {
			setImmediate(resolve);
		});

		expect(res.status).toHaveBeenCalledWith(202);
		expect(agentKnowledgeService.warmSandbox).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			'user-1',
		);
	});
});
