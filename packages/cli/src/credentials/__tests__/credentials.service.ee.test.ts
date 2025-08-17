import type { User } from '@n8n/db';
import { Project, SharedCredentialsRepository } from '@n8n/db';
import { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { EntityManager } from '@n8n/typeorm';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

import { EnterpriseCredentialsService } from '../credentials.service.ee';
import { CredentialsFinderService } from '../credentials-finder.service';
import { CredentialsService } from '../credentials.service';

describe('EnterpriseCredentialsService', () => {
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const ownershipService = mock<OwnershipService>();
	const credentialsService = mock<CredentialsService>();
	const projectService = mock<ProjectService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const globalConfig = mock<GlobalConfig>();
	const mockEntityManager = mock<EntityManager>();

	const service = new EnterpriseCredentialsService(
		sharedCredentialsRepository,
		ownershipService,
		credentialsService,
		projectService,
		credentialsFinderService,
		globalConfig,
	);

	const mockUser = mock<User>({ id: 'user123' });

	beforeEach(() => {
		jest.resetAllMocks();
		// Setup repository manager mock
		(sharedCredentialsRepository as any).manager = mockEntityManager;
	});

	describe('shareWithProjects', () => {
		const credentialId = 'cred123';
		const shareWithIds = ['project1', 'project2'];

		describe('when credential sharing is disabled', () => {
			beforeEach(() => {
				globalConfig.credentials = { disableSharing: true } as any;
			});

			it('should throw BadRequestError', async () => {
				await expect(
					service.shareWithProjects(mockUser, credentialId, shareWithIds),
				).rejects.toThrow(new BadRequestError('Credential sharing is disabled on this instance.'));
			});

			it('should not proceed with sharing logic', async () => {
				await expect(
					service.shareWithProjects(mockUser, credentialId, shareWithIds),
				).rejects.toThrow(BadRequestError);

				expect(mockEntityManager.find).not.toHaveBeenCalled();
			});
		});

		describe('when credential sharing is enabled', () => {
			beforeEach(() => {
				globalConfig.credentials = { disableSharing: false } as any;
				(sharedCredentialsRepository as any).manager = mockEntityManager;
				mockEntityManager.find.mockResolvedValue([]);
				mockEntityManager.save.mockResolvedValue([]);
			});

			it('should proceed with normal sharing logic', async () => {
				await service.shareWithProjects(mockUser, credentialId, shareWithIds);

				expect(mockEntityManager.find).toHaveBeenCalledWith(Project, expect.any(Object));
			});

			it('should use provided entity manager', async () => {
				const customEntityManager = mock<EntityManager>();
				customEntityManager.find.mockResolvedValue([]);
				customEntityManager.save.mockResolvedValue([]);

				await service.shareWithProjects(mockUser, credentialId, shareWithIds, customEntityManager);

				expect(customEntityManager.find).toHaveBeenCalledWith(Project, expect.any(Object));
				expect(customEntityManager.save).toHaveBeenCalled();
			});
		});
	});

	describe('transferOne', () => {
		const credentialId = 'cred123';
		const destinationProjectId = 'project456';

		describe('when credential sharing is disabled', () => {
			beforeEach(() => {
				globalConfig.credentials = { disableSharing: true } as any;
			});

			it('should throw BadRequestError', async () => {
				await expect(
					service.transferOne(mockUser, credentialId, destinationProjectId),
				).rejects.toThrow(new BadRequestError('Credential transfer is disabled on this instance.'));
			});

			it('should not proceed with transfer logic', async () => {
				await expect(
					service.transferOne(mockUser, credentialId, destinationProjectId),
				).rejects.toThrow(BadRequestError);

				expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
			});
		});

		describe('when credential sharing is enabled', () => {
			const mockCredential = {
				id: credentialId,
				shared: [
					{
						role: 'credential:owner',
						project: { id: 'sourceProject' },
					},
				],
			};

			const mockDestinationProject = {
				id: destinationProjectId,
				name: 'Destination Project',
			};

			beforeEach(() => {
				globalConfig.credentials = { disableSharing: false } as any;
				credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential as any);
				projectService.getProjectWithScope.mockResolvedValue(mockDestinationProject as any);
				(sharedCredentialsRepository.manager.transaction as jest.Mock).mockImplementation(
					async (callback: any) => await callback(mockEntityManager),
				);
				mockEntityManager.remove.mockResolvedValue([]);
				mockEntityManager.save.mockResolvedValue({});
				mockEntityManager.create.mockReturnValue({} as any);
			});

			it('should proceed with normal transfer logic', async () => {
				await service.transferOne(mockUser, credentialId, destinationProjectId);

				expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
					credentialId,
					mockUser,
					['credential:move'],
				);
			});

			it('should throw error when transferring to same project', async () => {
				const sameProjectCredential = {
					...mockCredential,
					shared: [
						{
							role: 'credential:owner',
							project: { id: destinationProjectId }, // Same as destination
						},
					],
				};

				credentialsFinderService.findCredentialForUser.mockResolvedValue(
					sameProjectCredential as any,
				);

				await expect(
					service.transferOne(mockUser, credentialId, destinationProjectId),
				).rejects.toThrow(
					"You can't transfer a credential into the project that's already owning it.",
				);
			});
		});
	});

	describe('getOne', () => {
		const credentialId = 'cred123';

		it('should work normally regardless of sharing disable setting', async () => {
			globalConfig.credentials = { disableSharing: true } as any;

			const mockCredential = {
				id: credentialId,
				name: 'Test Credential',
				data: 'encrypted-data',
			};

			credentialsFinderService.findCredentialForUser.mockResolvedValue(mockCredential as any);
			ownershipService.addOwnedByAndSharedWith.mockReturnValue(mockCredential as any);

			const result = await service.getOne(mockUser, credentialId, false);

			expect(result).toEqual({ id: credentialId, name: 'Test Credential' });
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				credentialId,
				mockUser,
				['credential:read'],
			);
		});
	});
});
