import type { User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { SelfHealingConfigurationService } from '../self-healing-configuration.service';
import { SelfHealingConfigurationsController } from '../self-healing-configurations.controller';

const start = vi.hoisted(() => vi.fn());
// Another service owns this file. The controller loads it on demand.
vi.mock('../agents/self-healing-agent-investigation.service.js', async () => {
	const { Service } = await import('@n8n/di');
	class SelfHealingAgentInvestigationService {
		start = start;
	}
	Service()(SelfHealingAgentInvestigationService);
	return { SelfHealingAgentInvestigationService };
});

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	SelfHealingConfigurationsController as never,
);

it.each([...metadata.routes.entries()])('%s requires authentication', (_name, route) => {
	expect(route.accessScope).toBeUndefined();
	expect(route.skipAuth).not.toBe(true);
});

it('checks configuration access on every route', () => {
	expect(metadata.middlewares).toContain('checkAccess');
});

describe('checkAccess', () => {
	const user = mock<User>({ id: 'user' });
	const service = mock<SelfHealingConfigurationService>();
	const controller = new SelfHealingConfigurationsController(service);
	const req = { user, params: { projectId: 'project', configurationId: '1' } } as never;

	beforeEach(() => service.canConfigure.mockReset());

	it('continues when the user can configure the project', async () => {
		service.canConfigure.mockResolvedValue(true);
		const res = mock<Response>();
		const next = vi.fn();

		await controller.checkAccess(req, res, next);

		expect(service.canConfigure).toHaveBeenCalledWith(user, 'project');
		expect(next).toHaveBeenCalledOnce();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('rejects a user who cannot configure the project', async () => {
		service.canConfigure.mockResolvedValue(false);
		const res = mock<Response>();
		res.status.mockReturnValue(res);
		const next = vi.fn();

		await controller.checkAccess(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
	});
});

describe('startAgentInvestigation', () => {
	it('starts a manual investigation of the agent in the configuration of the request', async () => {
		const controller = new SelfHealingConfigurationsController(
			mock<SelfHealingConfigurationService>(),
		);
		const req = { params: { projectId: 'project', configurationId: '7' } } as never;
		start.mockResolvedValue({ status: 'started' });

		const response = await controller.startAgentInvestigation(req, mock<Response>(), {
			agentId: 'agent',
		});

		expect(response).toEqual({ status: 'started' });
		expect(start).toHaveBeenCalledExactlyOnceWith({
			configurationId: 7,
			projectId: 'project',
			agentId: 'agent',
			trigger: 'manual',
		});
	});

	it('rejects a configuration ID that is not a positive integer', async () => {
		const controller = new SelfHealingConfigurationsController(
			mock<SelfHealingConfigurationService>(),
		);
		const req = { params: { projectId: 'project', configurationId: 'x' } } as never;

		await expect(
			controller.startAgentInvestigation(req, mock<Response>(), { agentId: 'agent' }),
		).rejects.toThrow('Invalid configuration ID.');
	});
});
