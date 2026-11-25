import type { User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { SelfHealingConfigurationService } from '../self-healing-configuration.service';
import { SelfHealingConfigurationsController } from '../self-healing-configurations.controller';

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
