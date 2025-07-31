import type { PullWorkFolderRequestDto, PushWorkFolderRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { EventService } from '@/events/event.service';

import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlController } from '../source-control.controller.ee';
import type { SourceControlService } from '../source-control.service.ee';
import type { SourceControlScopedService } from '../source-control-scoped.service';
import type { SourceControlRequest } from '../types/requests';
import type { SourceControlGetStatus } from '../types/source-control-get-status';

describe('SourceControlController', () => {
	let controller: SourceControlController;
	let sourceControlService: SourceControlService;
	let sourceControlPreferencesService: SourceControlPreferencesService;
	let sourceControlScopedService: SourceControlScopedService;
	let eventService: EventService;

	beforeEach(() => {
		sourceControlService = {
			pushWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200, statusResult: [] }),
			pullWorkfolder: jest.fn().mockResolvedValue({ statusCode: 200, statusResult: [] }),
			getStatus: jest.fn().mockResolvedValue({ files: [] }),
			setGitUserDetails: jest.fn(),
			getBranches: jest
				.fn()
				.mockResolvedValue({ currentBranch: 'main', branches: ['main', 'develop'] }),
			setBranch: jest
				.fn()
				.mockResolvedValue({ currentBranch: 'main', branches: ['main', 'develop'] }),
		} as unknown as SourceControlService;

		sourceControlPreferencesService = {
			getPreferences: jest.fn().mockReturnValue({
				connected: true,
				repositoryUrl: 'https://github.com/example/repo.git',
				branchName: 'main',
			}),
		} as unknown as SourceControlPreferencesService;

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

	// Tests for new enhanced API endpoints
	describe('pullChanges', () => {
		it('should pull changes successfully and emit event', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { id: 'user123', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
			});
			const res = mock<Response>();

			const result = await controller.pullChanges(req, res);

			expect(sourceControlService.pullWorkfolder).toHaveBeenCalledWith(req.user, {
				force: false,
				variables: 'keep-mine',
			});
			expect(eventService.emit).toHaveBeenCalledWith('source-control-pull-completed', {
				userId: 'user123',
				timestamp: expect.any(String),
			});
			expect(result.success).toBe(true);
			expect(result.message).toBe('Pull operation completed');
		});

		it('should handle pull failures', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { id: 'user123' },
			});
			const res = mock<Response>();

			(sourceControlService.pullWorkfolder as jest.Mock).mockRejectedValue(
				new Error('Pull failed'),
			);

			await expect(controller.pullChanges(req, res)).rejects.toThrow(BadRequestError);
		});
	});

	describe('getRepositoryStatus', () => {
		it('should return repository status successfully', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { id: 'user123' },
			});

			const result = await controller.getRepositoryStatus(req);

			expect(result).toEqual({
				connected: true,
				branch: 'main',
				branches: ['main', 'develop'],
				hasChanges: false,
				repositoryUrl: 'https://github.com/example/repo.git',
			});
			expect(sourceControlService.getBranches).toHaveBeenCalled();
			expect(sourceControlService.getStatus).toHaveBeenCalledWith(req.user, {
				direction: 'push',
				preferLocalVersion: true,
			});
		});

		it('should detect changes when files exist', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { id: 'user123' },
			});

			(sourceControlService.getStatus as jest.Mock).mockResolvedValue({
				files: [{ name: 'workflow.json', status: 'modified' }],
			});

			const result = await controller.getRepositoryStatus(req);

			expect(result.hasChanges).toBe(true);
		});
	});

	describe('setBranch', () => {
		it('should switch branch successfully and emit event', async () => {
			const req = mock<AuthenticatedRequest & { body: { branch: string } }>({
				user: { id: 'user123' },
				body: { branch: 'develop' },
			});

			const result = await controller.setBranch(req);

			expect(sourceControlService.getBranches).toHaveBeenCalled();
			expect(sourceControlService.setBranch).toHaveBeenCalledWith('develop');
			expect(eventService.emit).toHaveBeenCalledWith('source-control-branch-changed', {
				userId: 'user123',
				fromBranch: 'main',
				toBranch: 'develop',
				timestamp: expect.any(String),
			});
			expect(result.success).toBe(true);
		});

		it('should validate branch name', async () => {
			const req = mock<AuthenticatedRequest & { body: { branch: string } }>({
				user: { id: 'user123' },
				body: { branch: '' },
			});

			await expect(controller.setBranch(req)).rejects.toThrow(BadRequestError);
		});

		it('should check if branch exists when createIfNotExists is false', async () => {
			const req = mock<
				AuthenticatedRequest & { body: { branch: string; createIfNotExists?: boolean } }
			>({
				user: { id: 'user123' },
				body: { branch: 'nonexistent', createIfNotExists: false },
			});

			await expect(controller.setBranch(req)).rejects.toThrow(BadRequestError);
		});
	});

	describe('getCommitHistory', () => {
		it('should return empty commit history (placeholder implementation)', async () => {
			const req = mock<AuthenticatedRequest & { query: { limit?: string; offset?: string } }>({
				user: { id: 'user123' },
				query: { limit: '5', offset: '0' },
			});

			const result = await controller.getCommitHistory(req);

			expect(result.commits).toEqual([]);
		});

		it('should handle default pagination parameters', async () => {
			const req = mock<AuthenticatedRequest & { query: { limit?: string; offset?: string } }>({
				user: { id: 'user123' },
				query: {},
			});

			const result = await controller.getCommitHistory(req);

			expect(result.commits).toEqual([]);
		});
	});

	describe('syncCheck', () => {
		it('should return sync status', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { id: 'user123' },
			});

			const result = await controller.syncCheck(req);

			expect(result.inSync).toBe(true);
			expect(result.behind).toBe(0);
			expect(result.ahead).toBe(0);
			expect(result.conflicts).toEqual([]);
		});

		it('should detect when ahead of remote', async () => {
			const req = mock<AuthenticatedRequest>({
				user: { id: 'user123' },
			});

			(sourceControlService.getStatus as jest.Mock).mockResolvedValue({
				files: [{ name: 'workflow.json', status: 'modified' }],
			});

			const result = await controller.syncCheck(req);

			expect(result.inSync).toBe(false);
			expect(result.ahead).toBe(1);
		});
	});
});
