import type { PullWorkFolderRequestDto, PushWorkFolderRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest, Project, User } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import * as permissions from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';

import type { SourceControlContextFactory } from '../source-control-context.factory';
import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlController } from '../source-control.controller.ee';
import type { SourceControlService } from '../source-control.service.ee';
import type { SourceControlRequest } from '../types/requests';
import { SourceControlContext } from '../types/source-control-context';
import type { SourceControlGetStatus } from '../types/source-control-get-status';

jest.mock('@n8n/permissions', () => {
	const actual = jest.requireActual('@n8n/permissions');
	return {
		...actual,
		hasGlobalScope: jest.fn(actual.hasGlobalScope),
	};
});

describe('SourceControlController', () => {
	let controller: SourceControlController;
	let sourceControlService: SourceControlService;
	let sourceControlPreferencesService: SourceControlPreferencesService;
	let sourceControlContextFactory: SourceControlContextFactory;
	let eventService: EventService;

	beforeEach(() => {
		sourceControlService = {
			pushWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			pullWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200 }),
			getStatus: jest.fn().mockResolvedValue([]),
			setGitUserDetails: jest.fn(),
		} as unknown as SourceControlService;

		sourceControlPreferencesService = mock<SourceControlPreferencesService>();
		sourceControlContextFactory = mock<SourceControlContextFactory>();
		eventService = mock<EventService>();

		controller = new SourceControlController(
			sourceControlService,
			sourceControlPreferencesService,
			mock(),
			sourceControlContextFactory,
			eventService,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
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
		const fullPreferences = {
			branchName: 'main',
			branchColor: '#ff0000',
			branchReadOnly: false,
			connected: true,
			repositoryUrl: 'git@github.com:example/repo.git',
			connectionType: 'ssh' as const,
		};

		const buildReq = (user: Partial<User> = {}) =>
			mock<AuthenticatedRequest>({ user: mock<User>({ id: 'user-1', ...user }) });

		beforeEach(() => {
			(sourceControlPreferencesService.getPreferences as jest.Mock).mockReturnValue(
				fullPreferences,
			);
		});

		it('should return full preferences (including public key) for users with sourceControl:manage', async () => {
			const mockPublicKey = 'ssh-rsa AAAAB3NzaC1yc2E...';
			(sourceControlPreferencesService.getPublicKey as jest.Mock).mockResolvedValue(mockPublicKey);
			(permissions.hasGlobalScope as jest.Mock).mockReturnValue(true);

			const result = await controller.getPreferences(buildReq());

			expect(result).toEqual({ ...fullPreferences, publicKey: mockPublicKey });
			expect(sourceControlContextFactory.createContext).not.toHaveBeenCalled();
		});

		it('should return branch name and color for project admins (has authorized projects)', async () => {
			(permissions.hasGlobalScope as jest.Mock).mockReturnValue(false);
			const user = mock<User>({ id: 'user-1' });
			(sourceControlContextFactory.createContext as jest.Mock).mockResolvedValue(
				new SourceControlContext(user, [mock<Project>({ id: 'p1', type: 'team' })], []),
			);

			const result = await controller.getPreferences(mock<AuthenticatedRequest>({ user }));

			expect(result).toEqual({
				connected: fullPreferences.connected,
				branchReadOnly: fullPreferences.branchReadOnly,
				branchName: fullPreferences.branchName,
				branchColor: fullPreferences.branchColor,
			});
			expect(sourceControlPreferencesService.getPublicKey).not.toHaveBeenCalled();
		});

		it('should return only branchReadOnly for users with no source-control access', async () => {
			(permissions.hasGlobalScope as jest.Mock).mockReturnValue(false);
			const user = mock<User>({ id: 'user-1' });
			(sourceControlContextFactory.createContext as jest.Mock).mockResolvedValue(
				new SourceControlContext(user, [], []),
			);

			const result = await controller.getPreferences(mock<AuthenticatedRequest>({ user }));

			expect(result).toEqual({
				branchReadOnly: fullPreferences.branchReadOnly,
			});
			expect(sourceControlPreferencesService.getPublicKey).not.toHaveBeenCalled();
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
