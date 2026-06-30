import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AgentKnowledgeService } from '../agent-knowledge.service';
import { AgentSandboxController } from '../agent-sandbox.controller';

describe('AgentSandboxController', () => {
	it('accepts knowledge sandbox warmup before files exist', async () => {
		const agentKnowledgeService = mock<AgentKnowledgeService>();
		const controller = new AgentSandboxController(agentKnowledgeService, mock<Logger>(), {
			sandboxEnabled: true,
			sandboxProvider: 'daytona',
			daytonaVolumeId: 'volume-1',
		} as AgentsConfig);
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
