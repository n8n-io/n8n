import type { PullWorkFolderRequestDto, PushWorkFolderRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';

import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlController } from '../source-control.controller.ee';
import type { SourceControlService } from '../source-control.service.ee';
import type { SourceControlRequest } from '../types/requests';
import type { SourceControlGetStatus } from '../types/source-control-get-status';

describe('SourceControlController', () => {
	let controller: SourceControlController;
	let sourceControlService: SourceControlService;
	let sourceControlPreferencesService: SourceControlPreferencesService;
	let eventService: EventService;

	beforeEach(() => {
		sourceControlService = {
			pushWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			pullWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			getStatus: jest.fn().mockResolvedValue([]),
			setGitUserDetails: jest.fn(),
		} as unknown as SourceControlService;

		sourceControlPreferencesService = mock<SourceControlPreferencesService>();
		eventService = mock<EventService>();

		controller = new SourceControlController(
			sourceControlService,
			sourceControlPreferencesService,
			mock(),
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
			const payload = { force: true } as PullWorkFolderRequestDto;

			await controller.pullWorkfolder(req, res, payload);
			expect(sourceControlService.pullWorkfolder).toHaveBeenCalledWith(req.user, payload);
		});
	});

	describe('getStatus', () => {
		it('should call getStatus with expected parameters', async () => {
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
			expect(sourceControlService.getStatus).toHaveBeenCalledWith(user, query);
		});
	});

	describe('status', () => {
		it('should call getStatus with expected parameters', async () => {
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
			expect(sourceControlService.getStatus).toHaveBeenCalledWith(user, query);
		});
	});

	describe('getPreferences', () => {
		it('should return preferences with public key', async () => {
			const mockPreferences = {
				branchName: 'main',
				repositoryUrl: 'git@github.com:example/repo.git',
				connected: true,
				publicKey: '',
			};
			const mockPublicKey = 'ssh-rsa AAAAB3NzaC1yc2E...';

			(sourceControlPreferencesService.getPreferences as jest.Mock).mockReturnValue(
				mockPreferences,
			);
			(sourceControlPreferencesService.getPublicKey as jest.Mock).mockResolvedValue(mockPublicKey);

			const result = await controller.getPreferences();

			expect(sourceControlPreferencesService.getPublicKey).toHaveBeenCalled();
			expect(sourceControlPreferencesService.getPreferences).toHaveBeenCalled();
			expect(result).toEqual({
				...mockPreferences,
				publicKey: mockPublicKey,
			});
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
});
