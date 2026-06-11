import { Logger } from '@n8n/backend-common';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import type { AgentKnowledgeService } from '../agent-knowledge.service';
import { AgentSandboxController } from '../agent-sandbox.controller';
import type { AgentsService } from '../agents.service';

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	AgentSandboxController as never,
);

async function waitForBackgroundWarmup() {
	await new Promise((resolve) => setImmediate(resolve));
}

function makeController({
	agentsService = mock<AgentsService>(),
	agentKnowledgeService = mock<AgentKnowledgeService>(),
	logger = mock<Logger>(),
}: {
	agentsService?: jest.Mocked<AgentsService>;
	agentKnowledgeService?: jest.Mocked<AgentKnowledgeService>;
	logger?: jest.Mocked<Logger>;
} = {}) {
	agentsService.isKnowledgeBaseEnabled.mockReturnValue(true);

	const controller = new AgentSandboxController(agentsService, agentKnowledgeService, logger);
	const res = mock<Response>();
	res.status.mockReturnValue(res);

	return { controller, agentsService, agentKnowledgeService, logger, res };
}

describe('AgentSandboxController route access scopes', () => {
	it('gates knowledge sandbox warmup with agent:execute', () => {
		const route = metadata.routes.get('warmKnowledgeSandbox');

		expect(route?.accessScope).toBeDefined();
		expect(route?.accessScope?.globalOnly).toBe(false);
		expect(route?.accessScope?.scope).toBe('agent:execute');
	});
});

describe('AgentSandboxController knowledge sandbox warmup', () => {
	it('returns accepted without awaiting sandbox warmup', async () => {
		const { controller, agentKnowledgeService, res } = makeController();
		let resolveWarmup: () => void;
		const pendingWarmup = new Promise<void>((resolve) => {
			resolveWarmup = resolve;
		});
		agentKnowledgeService.warmSandbox.mockReturnValue(pendingWarmup);

		const result = controller.warmKnowledgeSandbox(
			{ user: { id: 'user-1' } } as never,
			res,
			'project-1',
			'agent-1',
		);

		expect(result).toEqual({ accepted: true });
		expect(res.status).toHaveBeenCalledWith(202);
		expect(agentKnowledgeService.warmSandbox).not.toHaveBeenCalled();

		await waitForBackgroundWarmup();
		expect(agentKnowledgeService.warmSandbox).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			'user-1',
		);

		resolveWarmup!();
	});

	it('returns accepted and skips background warmup when the knowledge base is disabled', async () => {
		const { controller, agentsService, agentKnowledgeService, res } = makeController();
		agentsService.isKnowledgeBaseEnabled.mockReturnValue(false);

		const result = controller.warmKnowledgeSandbox(
			{ user: { id: 'user-1' } } as never,
			res,
			'project-1',
			'agent-1',
		);
		await waitForBackgroundWarmup();

		expect(result).toEqual({ accepted: true });
		expect(res.status).toHaveBeenCalledWith(202);
		expect(agentKnowledgeService.warmSandbox).not.toHaveBeenCalled();
	});

	it('logs background warmup failures without surfacing them', async () => {
		const { controller, agentKnowledgeService, logger, res } = makeController();
		agentKnowledgeService.warmSandbox.mockRejectedValue(new Error('daytona unavailable'));

		const result = controller.warmKnowledgeSandbox(
			{ user: { id: 'user-1' } } as never,
			res,
			'project-1',
			'agent-1',
		);
		await waitForBackgroundWarmup();

		expect(result).toEqual({ accepted: true });
		expect(logger.warn).toHaveBeenCalledWith('Failed to warm agent knowledge sandbox', {
			projectId: 'project-1',
			agentId: 'agent-1',
			error: 'daytona unavailable',
		});
	});
});
