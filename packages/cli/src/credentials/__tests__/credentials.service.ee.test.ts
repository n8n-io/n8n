import type { LicenseState } from '@n8n/backend-common';
import type { User, CredentialsEntity, Project } from '@n8n/db';
import type { SharedCredentials, SharedCredentialsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import type { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import type { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';

describe('EnterpriseCredentialsService', () => {
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const ownershipService = mock<OwnershipService>();
	const credentialsService = mock<CredentialsService>();
	const projectService = mock<ProjectService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const roleService = mock<RoleService>();
	const externalSecretsConfig = mock<ExternalSecretsConfig>();
	const externalSecretsProviderAccessCheckService = mock<SecretsProviderAccessCheckService>();
	const licenseState = mock<LicenseState>();

	const service = new EnterpriseCredentialsService(
		sharedCredentialsRepository,
		ownershipService,
		credentialsService,
		projectService,
		credentialsFinderService,
		roleService,
		externalSecretsConfig,
		externalSecretsProviderAccessCheckService,
		licenseState,
	);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	/**
	 * Helper function to mock the transaction manager for credential transfer tests
	 */
	const mockTransactionManager = () => {
		const mockManager = {
			remove: jest.fn().mockResolvedValue(undefined),
			save: jest.fn().mockResolvedValue(undefined),
			create: jest.fn().mockImplementation((_, data) => data),
		};

		// @ts-expect-error - Mocking manager for testing
		sharedCredentialsRepository.manager = {
			transaction: jest.fn().mockImplementation(async (callback) => {
				return await callback(mockManager);
			}),
		};

		return mockManager;
	};

	describe('transferOne', () => {
		const user = mock<User>({ id: 'user-id' });
		const credentialId = 'credential-id';
		const sourceProjectId = 'source-project-id';
		const destinationProjectId = 'destination-project-id';

		const sourceProject = mock<Project>({
			id: sourceProjectId,
			name: 'Source Project',
			type: 'team',
		});

		const destinationProject = mock<Project>({
			id: destinationProjectId,
			name: 'Destination Project',
			type: 'team',
		});

		const ownerSharing = mock<SharedCredentials>({
			credentialsId: credentialId,
			projectId: sourceProjectId,
			role: 'credential:owner',
			project: sourceProject,
		});

		const credential = mock<CredentialsEntity>({
			id: credentialId,
			name: 'Test Credential',
			type: 'testApi',
			data: 'encrypted-data',
			shared: [ownerSharing],
		});

		beforeEach(() => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(credential);
			projectService.getProjectWithScope.mockResolvedValue(destinationProject);
			externalSecretsConfig.externalSecretsForProjects = true;
			licenseState.isExternalSecretsLicensed.mockReturnValue(true);
		});

		describe('external secrets', () => {
			it('should throw an error when target project does not have access to currently referenced secret store', async () => {
				const providerKey = 'vault';
				const decryptedData = {
					apiKey: `={{ $secrets.${providerKey}.myApiKey }}`,
					url: 'https://api.example.com',
				};
				credentialsService.decrypt.mockReturnValue(decryptedData);
				externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mockResolvedValue(
					false,
				);

				await expect(service.transferOne(user, credentialId, destinationProjectId)).rejects.toThrow(
					'The secret provider "vault" used in "apiKey" does not exist in the destination project',
				);

				expect(credentialsService.decrypt).toHaveBeenCalledWith(credential, true);
				expect(
					externalSecretsProviderAccessCheckService.isProviderAvailableInProject,
				).toHaveBeenCalledWith(providerKey, destinationProjectId);
			});

			it('should succeed when target project has access to referenced secret store', async () => {
				const providerKey = 'vault';
				const decryptedData = {
					apiKey: `={{ $secrets.${providerKey}.myApiKey }}`,
					url: 'https://api.example.com',
				};
				credentialsService.decrypt.mockReturnValue(decryptedData);
				externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mockResolvedValue(
					true,
				);
				mockTransactionManager();

				await expect(
					service.transferOne(user, credentialId, destinationProjectId),
				).resolves.toBeUndefined();

				expect(
					externalSecretsProviderAccessCheckService.isProviderAvailableInProject,
				).toHaveBeenCalledWith(providerKey, destinationProjectId);
			});

			it('should succeed when credential references no external secret providers in expressions', async () => {
				const decryptedData = {
					apiKey: 'plain-api-key',
					url: 'https://api.example.com',
				};
				credentialsService.decrypt.mockReturnValue(decryptedData);
				mockTransactionManager();

				await expect(
					service.transferOne(user, credentialId, destinationProjectId),
				).resolves.toBeUndefined();

				expect(
					externalSecretsProviderAccessCheckService.isProviderAvailableInProject,
				).not.toHaveBeenCalled();
			});

			it('should skip validation when project-scoped secrets feature flag is disabled', async () => {
				externalSecretsConfig.externalSecretsForProjects = false;
				mockTransactionManager();

				await expect(
					service.transferOne(user, credentialId, destinationProjectId),
				).resolves.toBeUndefined();

				expect(credentialsService.decrypt).not.toHaveBeenCalled();
				expect(
					externalSecretsProviderAccessCheckService.isProviderAvailableInProject,
				).not.toHaveBeenCalled();
			});

			it('should skip validation when external secrets are not licensed', async () => {
				licenseState.isExternalSecretsLicensed.mockReturnValue(false);
				mockTransactionManager();

				await expect(
					service.transferOne(user, credentialId, destinationProjectId),
				).resolves.toBeUndefined();

				expect(credentialsService.decrypt).not.toHaveBeenCalled();
				expect(
					externalSecretsProviderAccessCheckService.isProviderAvailableInProject,
				).not.toHaveBeenCalled();
			});
		});
	});
});
