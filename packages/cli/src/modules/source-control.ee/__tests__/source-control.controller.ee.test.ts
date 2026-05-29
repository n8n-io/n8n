import type { PullWorkFolderRequestDto, PushWorkFolderRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { EventService } from '@/events/event.service';

import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlScopedService } from '../source-control-scoped.service';
import { SourceControlController } from '../source-control.controller.ee';
import type { SourceControlService } from '../source-control.service.ee';
import type { SourceControlRequest } from '../types/requests';
import type { SourceControlGetStatus } from '../types/source-control-get-status';

jest.mock('@n8n/permissions', () => ({
	...jest.requireActual('@n8n/permissions'),
	hasGlobalScope: jest.fn(),
}));

describe('SourceControlController', () => {
	let controller: SourceControlController;
	let sourceControlService: SourceControlService;
	let sourceControlPreferencesService: SourceControlPreferencesService;
	let sourceControlScopedService: SourceControlScopedService;
	let eventService: EventService;

	beforeEach(() => {
		jest.mocked(hasGlobalScope).mockReset().mockReturnValue(false);

		sourceControlService = {
			pushWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			pullWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			getStatus: jest.fn().mockResolvedValue([]),
			setGitUserDetails: jest.fn(),
		} as unknown as SourceControlService;

		sourceControlPreferencesService = mock<SourceControlPreferencesService>();
		sourceControlScopedService = mock<SourceControlScopedService>();
		eventService = mock<EventService>();

		controller = new SourceControlController(
			sourceControlService,
			sourceControlPreferencesService,
			sourceControlScopedService,
			eventService,
		);
	});

	describe('pushWorkfolder', () => {
		it('should push workfolder with expected parameters', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();
			const payload = { force: true } as PushWorkFolderRequestDto;

			await controller.pushWorkfolder(req, res, payload);
			expect(sourceControlService.setGitUserDetails).toHaveBeenCalledWith(
				'John Doe',
				'john.doe@example.com',
			);
			expect(sourceControlService.pushWorkfolder).toHaveBeenCalledWith(req.user, payload);
		});

		it('should return commit info when push result includes commit hash', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();
			const payload = { force: true, commitMessage: 'Test commit' } as PushWorkFolderRequestDto;

			(sourceControlService.pushWorkfolder as jest.Mock).mockResolvedValueOnce({
				statusCode: 200,
				statusResult: [{ file: 'test.json', status: 'modified' }],
				pushResult: {
					update: {
						hash: { to: 'abc123def456' },
						head: { local: 'main' },
					},
				},
			});

			const result = await controller.pushWorkfolder(req, res, payload);

			expect(result).toEqual({
				files: [{ file: 'test.json', status: 'modified' }],
				commit: {
					hash: 'abc123def456',
					message: 'Test commit',
					branch: 'main',
				},
			});
		});

		it('should return null commit info when push result has no commit hash', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();
			const payload = { force: true } as PushWorkFolderRequestDto;

			(sourceControlService.pushWorkfolder as jest.Mock).mockResolvedValueOnce({
				statusCode: 200,
				statusResult: [],
				pushResult: null,
			});

			const result = await controller.pushWorkfolder(req, res, payload);

			expect(result).toEqual({
				files: [],
				commit: null,
			});
		});

		it('should throw BadRequestError when push fails', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();
			const payload = { force: true } as PushWorkFolderRequestDto;

			(sourceControlService.pushWorkfolder as jest.Mock).mockRejectedValueOnce(
				new Error('Git push failed'),
			);

			await expect(controller.pushWorkfolder(req, res, payload)).rejects.toThrow('Git push failed');
		});
	});

	describe('pullWorkfolder', () => {
		it('should pull workfolder with expected parameters', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();
			const payload = { force: true, autoPublish: 'all' } as PullWorkFolderRequestDto;

			await controller.pullWorkfolder(req, res, payload);
			expect(sourceControlService.pullWorkfolder).toHaveBeenCalledWith(req.user, payload);
		});
	});

	describe('getStatus', () => {
		it('should authorize before calling getStatus with expected parameters', async () => {
			const user = { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' };
			const query = {
				direction: 'pull',
				preferLocalVersion: true,
				verbose: false,
			} as SourceControlGetStatus;
			const req = mock<SourceControlRequest.GetStatus>({
				query,
				user,
			});

			await controller.getStatus(req);
			expect(sourceControlScopedService.ensureIsAllowedToGetStatus).toHaveBeenCalledWith(req);
			expect(sourceControlService.getStatus).toHaveBeenCalledWith(user, query);
		});

		it('should not call getStatus when the caller is not authorized', async () => {
			const req = mock<SourceControlRequest.GetStatus>({ query: {}, user: {} });
			(sourceControlScopedService.ensureIsAllowedToGetStatus as jest.Mock).mockRejectedValueOnce(
				new Error('forbidden'),
			);

			await expect(controller.getStatus(req)).rejects.toThrow('forbidden');
			expect(sourceControlService.getStatus).not.toHaveBeenCalled();
		});

		it('should preserve ForbiddenError from the status service', async () => {
			const error = new ForbiddenError('You do not have permission to pull from source control');
			const req = mock<SourceControlRequest.GetStatus>({ query: {}, user: {} });
			(sourceControlService.getStatus as jest.Mock).mockRejectedValueOnce(error);

			await expect(controller.getStatus(req)).rejects.toBe(error);
		});
	});

	describe('status', () => {
		it('should authorize before calling getStatus with expected parameters', async () => {
			const user = { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' };
			const query = {
				direction: 'pull',
				preferLocalVersion: true,
				verbose: false,
			} as SourceControlGetStatus;
			const req = mock<SourceControlRequest.GetStatus>({
				query,
				user,
			});

			await controller.status(req);
			expect(sourceControlScopedService.ensureIsAllowedToGetStatus).toHaveBeenCalledWith(req);
			expect(sourceControlService.getStatus).toHaveBeenCalledWith(user, query);
		});

		it('should not call getStatus when the caller is not authorized', async () => {
			const req = mock<SourceControlRequest.GetStatus>({ query: {}, user: {} });
			(sourceControlScopedService.ensureIsAllowedToGetStatus as jest.Mock).mockRejectedValueOnce(
				new Error('forbidden'),
			);

			await expect(controller.status(req)).rejects.toThrow('forbidden');
			expect(sourceControlService.getStatus).not.toHaveBeenCalled();
		});

		it('should preserve ForbiddenError from the status service', async () => {
			const error = new ForbiddenError('You do not have permission to pull from source control');
			const req = mock<SourceControlRequest.GetStatus>({ query: {}, user: {} });
			(sourceControlService.getStatus as jest.Mock).mockRejectedValueOnce(error);

			await expect(controller.status(req)).rejects.toBe(error);
		});
	});

	describe('getPreferences', () => {
		const mockPreferences = {
			branchName: 'main',
			repositoryUrl: 'https://x-access-token:ghp_secret@github.com/acme/private-repo.git',
			connected: true,
			publicKey: '',
		};
		const mockPublicKey = 'ssh-rsa AAAAB3NzaC1yc2E...';

		beforeEach(() => {
			(sourceControlPreferencesService.getPreferences as jest.Mock).mockReturnValue(
				mockPreferences,
			);
			(sourceControlPreferencesService.getPublicKey as jest.Mock).mockResolvedValue(mockPublicKey);
		});

		it('should return the full preferences including repository URL for managers', async () => {
			jest.mocked(hasGlobalScope).mockReturnValue(true);
			const req = mock<AuthenticatedRequest>({ user: {} });

			const result = await controller.getPreferences(req);

			expect(hasGlobalScope).toHaveBeenCalledWith(req.user, 'sourceControl:manage');
			expect(result).toEqual({ ...mockPreferences, publicKey: mockPublicKey });
		});

		it('should redact the repository URL for users without the manage scope', async () => {
			jest.mocked(hasGlobalScope).mockReturnValue(false);
			const req = mock<AuthenticatedRequest>({ user: {} });

			const result = await controller.getPreferences(req);

			expect(result.repositoryUrl).toBe('');
			expect(result.httpsUsername).toBeUndefined();
			expect(result.httpsPassword).toBeUndefined();
			// non-sensitive fields the building UI relies on must still be returned
			expect(result.branchName).toBe('main');
			expect(result.connected).toBe(true);
			expect(result.publicKey).toBe(mockPublicKey);
		});

		it('should require authentication', () => {
			const registry = Container.get(ControllerRegistryMetadata);
			const controllerMetadata = registry.getControllerMetadata(
				SourceControlController as Controller,
			);

			const getPreferencesRoute = controllerMetadata.routes.get('getPreferences');
			expect(getPreferencesRoute).toBeDefined();
			expect(getPreferencesRoute?.skipAuth).toBe(false);
		});
	});

	describe('route access scopes', () => {
		it('should gate get-branches behind the sourceControl:manage global scope', () => {
			const registry = Container.get(ControllerRegistryMetadata);
			const controllerMetadata = registry.getControllerMetadata(
				SourceControlController as Controller,
			);

			const getBranchesRoute = controllerMetadata.routes.get('getBranches');
			expect(getBranchesRoute?.accessScope).toEqual({
				scope: 'sourceControl:manage',
				globalOnly: true,
			});
		});

		// Routes authorized in-handler rather than by a decorator, with their mechanism.
		// A route missing from both this map and a decorator fails the audit below.
		const IN_HANDLER_AUTHZ: Record<string, string> = {
			getPreferences: 'redacts repositoryUrl/HTTPS creds unless sourceControl:manage',
			getStatus: 'sourceControlScopedService.ensureIsAllowedToGetStatus',
			status: 'sourceControlScopedService.ensureIsAllowedToGetStatus',
			pushWorkfolder: 'sourceControlScopedService.ensureIsAllowedToPush',
			getFileContent: 'context-scoped ForbiddenError in getRemoteFileEntity',
		};

		it('should authorize every route via a decorator or a documented in-handler check', () => {
			const registry = Container.get(ControllerRegistryMetadata);
			const controllerMetadata = registry.getControllerMetadata(
				SourceControlController as Controller,
			);

			const unauthorized: string[] = [];
			for (const [handlerName, route] of controllerMetadata.routes.entries()) {
				// no route on this controller is public
				expect(route.skipAuth).toBeFalsy();

				const hasDecorator = route.accessScope !== undefined;
				const hasInHandlerAuthz = handlerName in IN_HANDLER_AUTHZ;
				if (!hasDecorator && !hasInHandlerAuthz) {
					unauthorized.push(handlerName);
				}
			}

			expect(unauthorized).toEqual([]);
		});

		it('should not leave any decorator-less route undocumented in the audit allowlist', () => {
			const registry = Container.get(ControllerRegistryMetadata);
			const controllerMetadata = registry.getControllerMetadata(
				SourceControlController as Controller,
			);

			// Every allowlisted handler must still exist and still be decorator-less
			for (const handlerName of Object.keys(IN_HANDLER_AUTHZ)) {
				const route = controllerMetadata.routes.get(handlerName);
				expect(route).toBeDefined();
				expect(route?.accessScope).toBeUndefined();
			}
		});
	});
});
