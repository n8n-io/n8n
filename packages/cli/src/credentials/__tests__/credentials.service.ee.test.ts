import type { LicenseState } from '@n8n/backend-common';
import type {
	User,
	CredentialsEntity,
	Project,
	SharedCredentials,
	SharedCredentialsRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialConnectionStatusProxy } from '@/credentials/credential-connection-status-proxy';
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
	const connectionStatusProxy = mock<CredentialConnectionStatusProxy>();

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
		connectionStatusProxy,
	);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	/**
	 * Helper function to mock the transaction manager for credential transfer tests
	 */
	const mockTransactionManager = () => {
		const mockManager = {
			remove: vi.fn().mockResolvedValue(undefined),
			save: vi.fn().mockResolvedValue(undefined),
			create: vi.fn().mockImplementation((_, data) => data),
		};

		// @ts-expect-error - Mocking manager for testing
		sharedCredentialsRepository.manager = {
			transaction: vi.fn().mockImplementation(async (callback) => {
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
				credentialsService.decrypt.mockResolvedValue(decryptedData);
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
				credentialsService.decrypt.mockResolvedValue(decryptedData);
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
				credentialsService.decrypt.mockResolvedValue(decryptedData);
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

		describe('per-user connection reconciliation', () => {
			beforeEach(() => {
				// keep the external-secrets branch out of the way
				externalSecretsConfig.externalSecretsForProjects = false;
			});

			it('reconciles connections for every project that shared the credential', async () => {
				const sharee = mock<SharedCredentials>({
					credentialsId: credentialId,
					projectId: 'shared-project-id',
					role: 'credential:user',
				});
				credentialsFinderService.findCredentialForUser.mockResolvedValue(
					mock<CredentialsEntity>({
						id: credentialId,
						name: 'Test Credential',
						type: 'testApi',
						data: 'encrypted-data',
						shared: [ownerSharing, sharee],
					}),
				);
				const trx = mockTransactionManager();

				await service.transferOne(user, credentialId, destinationProjectId);

				expect(connectionStatusProxy.cleanupOrphanedEntriesForProjects).toHaveBeenCalledWith(
					credentialId,
					[sourceProjectId, 'shared-project-id'],
					trx,
				);
			});
		});
	});

	describe('getOneForUser', () => {
		const user = mock<User>({ id: 'user-id' });
		const credentialId = 'cred-id';

		const makeCredential = (isResolvable: boolean) =>
			mock<CredentialsEntity>({
				id: credentialId,
				name: 'Cred',
				type: 'oAuth2Api',
				data: 'encrypted',
				isResolvable,
				shared: [],
			});

		beforeEach(() => {
			ownershipService.addOwnedByAndSharedWith.mockImplementation((c) => c as never);
			credentialsService.populateConnectedByMe.mockResolvedValue(undefined);
			credentialsService.countConnectedUsers.mockResolvedValue(0);
		});

		it('returns redacted data to a connect-capable user of a private credential without edit rights', async () => {
			const credential = makeCredential(true);
			const redacted = { clientId: 'abc', clientSecret: '__redacted__' };
			credentialsFinderService.findCredentialForUser.mockImplementation(
				async (_id, _user, scopes) => (scopes.includes('credential:update') ? null : credential),
			);
			credentialsService.decrypt.mockResolvedValue(redacted);

			const result = await service.getOneForUser(user, credentialId, true);

			expect(credentialsService.decrypt).toHaveBeenCalledWith(credential);
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				credentialId,
				user,
				['credential:connect'],
			);
			expect(result).toHaveProperty('data', redacted);
		});

		it('does not return data to a read-only user without connect on a private credential', async () => {
			const credential = makeCredential(true);
			credentialsFinderService.findCredentialForUser.mockImplementation(
				async (_id, _user, scopes) =>
					scopes.includes('credential:update') || scopes.includes('credential:connect')
						? null
						: credential,
			);

			const result = await service.getOneForUser(user, credentialId, true);

			expect(credentialsService.decrypt).not.toHaveBeenCalled();
			expect(result).not.toHaveProperty('data');
		});

		it('does not attempt to decrypt a static credential for a read-only user', async () => {
			const credential = makeCredential(false);
			credentialsFinderService.findCredentialForUser.mockImplementation(
				async (_id, _user, scopes) => (scopes.includes('credential:update') ? null : credential),
			);

			const result = await service.getOneForUser(user, credentialId, true);

			expect(credentialsService.decrypt).not.toHaveBeenCalled();
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalledWith(
				credentialId,
				user,
				['credential:connect'],
			);
			expect(result).not.toHaveProperty('data');
		});
	});
});
