import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AgentKnowledgeService } from '../agent-knowledge.service';
import { AgentSandboxController } from '../agent-sandbox.controller';
import { makeAgentKnowledgeGate } from './test-utils/agent-knowledge-gate';

describe('AgentSandboxController', () => {
	it('accepts knowledge sandbox warmup before files exist', async () => {
		const agentKnowledgeService = mock<AgentKnowledgeService>();
		const controller = new AgentSandboxController(
			agentKnowledgeService,
			mock<Logger>(),
			makeAgentKnowledgeGate(),
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
		expect(agentKnowledgeService.warmKnowledgeSandbox).toHaveBeenCalledWith('agent-1', 'project-1');
	});

	it.each([
		{ reason: 'the sandbox is disabled', gate: { sandboxEnabled: false } },
		{ reason: 'the knowledge module is inactive', gate: { knowledgeActive: false } },
	])('rejects warmup when $reason', async ({ gate }) => {
		const agentKnowledgeService = mock<AgentKnowledgeService>();
		const controller = new AgentSandboxController(
			agentKnowledgeService,
			mock<Logger>(),
			makeAgentKnowledgeGate(gate),
		);

		await expect(
			controller.warmKnowledgeSandbox(
				{} as AuthenticatedRequest<{ projectId: string }>,
				mock<Response>(),
				'project-1',
				'agent-1',
			),
		).rejects.toThrow('Agent knowledge base is not enabled');
		expect(agentKnowledgeService.warmKnowledgeSandbox).not.toHaveBeenCalled();
	});
});
