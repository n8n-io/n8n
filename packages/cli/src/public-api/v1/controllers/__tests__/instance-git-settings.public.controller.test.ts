import type { InstanceGitSettingsPublicDto, UpdateInstanceGitSettingsDto } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { InstanceGitConnectionService } from '@/modules/git-connections.ee/instance-git-connection.service';

import { InstanceGitSettingsPublicController } from '../instance-git-settings.public.controller';

describe('InstanceGitSettingsPublicController', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const serviceMock = mock<InstanceGitConnectionService>();
	const controller = new InstanceGitSettingsPublicController(moduleRegistry);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(InstanceGitConnectionService, serviceMock);
		moduleRegistry.isActive.mockReturnValue(true);
	});

	it('returns 503 on GET when the git-connections module is inactive', async () => {
		moduleRegistry.isActive.mockReturnValue(false);

		await expect(controller.getInstanceGitSettings(req, res)).rejects.toThrow(
			ServiceUnavailableError,
		);
	});

	it('returns 503 on PUT when the git-connections module is inactive', async () => {
		moduleRegistry.isActive.mockReturnValue(false);

		await expect(
			controller.updateInstanceGitSettings(req, res, {} as UpdateInstanceGitSettingsDto),
		).rejects.toThrow(ServiceUnavailableError);
	});

	it('delegates GET to the service', async () => {
		const settings = mock<InstanceGitSettingsPublicDto>({ enabled: false });
		serviceMock.getSettings.mockResolvedValue(settings);

		await expect(controller.getInstanceGitSettings(req, res)).resolves.toBe(settings);
	});

	it('delegates PUT to the service with the request body', async () => {
		const input: UpdateInstanceGitSettingsDto = { enabled: false };
		const settings = mock<InstanceGitSettingsPublicDto>({ enabled: false });
		serviceMock.updateSettings.mockResolvedValue(settings);

		await expect(controller.updateInstanceGitSettings(req, res, input)).resolves.toBe(settings);
		expect(serviceMock.updateSettings).toHaveBeenCalledWith(input);
	});
});
