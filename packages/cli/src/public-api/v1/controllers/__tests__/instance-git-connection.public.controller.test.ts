import type {
	InstanceGitConnectionPublicDto,
	UpdateInstanceGitConnectionDto,
} from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { InstanceGitConnectionService } from '@/modules/git-connections.ee/instance-git-connection.service';

import { InstanceGitConnectionPublicController } from '../instance-git-connection.public.controller';

describe('InstanceGitConnectionPublicController', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const serviceMock = mock<InstanceGitConnectionService>();
	const controller = new InstanceGitConnectionPublicController(moduleRegistry);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(InstanceGitConnectionService, serviceMock);
		moduleRegistry.isActive.mockReturnValue(true);
	});

	it('returns 503 on GET when the git-connections module is inactive', async () => {
		moduleRegistry.isActive.mockReturnValue(false);

		await expect(controller.getInstanceGitConnection(req, res)).rejects.toThrow(
			ServiceUnavailableError,
		);
	});

	it('returns 503 on PUT when the git-connections module is inactive', async () => {
		moduleRegistry.isActive.mockReturnValue(false);

		await expect(
			controller.updateInstanceGitConnection(req, res, {} as UpdateInstanceGitConnectionDto),
		).rejects.toThrow(ServiceUnavailableError);
	});

	it('delegates GET to the service', async () => {
		const connection = mock<InstanceGitConnectionPublicDto>({ enabled: false });
		serviceMock.get.mockResolvedValue(connection);

		await expect(controller.getInstanceGitConnection(req, res)).resolves.toBe(connection);
	});

	it('delegates PUT to the service with the request body', async () => {
		const input: UpdateInstanceGitConnectionDto = { enabled: false };
		const connection = mock<InstanceGitConnectionPublicDto>({ enabled: false });
		serviceMock.update.mockResolvedValue(connection);

		await expect(controller.updateInstanceGitConnection(req, res, input)).resolves.toBe(connection);
		expect(serviceMock.update).toHaveBeenCalledWith(input);
	});
});
