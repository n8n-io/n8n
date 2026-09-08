import type { LicenseState } from '@n8n/backend-common';
import type {
	User,
	CredentialsEntity,
	Project,
	ProjectRelationRepository,
	SharedCredentials,
	SharedCredentialsRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialConnectionStatusProxy } from '@/credentials/credential-connection-status-proxy';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { EventService } from '@/events/event.service';
import type { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import type { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { UserManagementMailer } from '@/user-management/email';

const userHasScopesMock = vi.hoisted(() => vi.fn());

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: userHasScopesMock,
}));

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
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const eventService = mock<EventService>();
	const userManagementMailer = mock<UserManagementMailer>();

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
		projectRelationRepository,
		eventService,
		userManagementMailer,
	);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('shareWithProjects', () => {
		it('rejects credentials that are not available to workflows', async () => {
			const manager = {
				exists: vi.fn().mockResolvedValue(false),
				find: vi.fn(),
				save: vi.fn(),
			};

			// @ts-expect-error - Mocking manager for testing
			sharedCredentialsRepository.manager = manager;

			await expect(
				service.shareWithProjects(mock<User>(), 'credential-id', ['project-id']),
			).rejects.toThrow('Credential not found');
			expect(manager.find).not.toHaveBeenCalled();
		});
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
				{ includeInstanceCredentials: true },
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
				{ includeInstanceCredentials: true },
			);
			expect(result).not.toHaveProperty('data');
		});
	});

	describe('getSharedWithProjectsDiff', () => {
		const makeCredential = (sharedProjectIds: string[]) =>
			mock<CredentialsEntity>({
				id: 'cred-1',
				shared: [
					{ projectId: 'owner-project', role: 'credential:owner' },
					...sharedProjectIds.map((projectId) => ({ projectId, role: 'credential:user' })),
				] as SharedCredentials[],
			});

		it('reports projects to add and ignores the owning project', () => {
			const diff = service.getSharedWithProjectsDiff(makeCredential([]), ['p1', 'p2']);

			expect(diff.toShare).toEqual(['p1', 'p2']);
			expect(diff.toUnshare).toEqual([]);
		});

		it('reports projects to remove', () => {
			const diff = service.getSharedWithProjectsDiff(makeCredential(['p1', 'p2']), []);

			expect(diff.toShare).toEqual([]);
			expect(diff.toUnshare).toEqual(['p1', 'p2']);
		});

		it('reports both directions when the set is partially replaced', () => {
			const diff = service.getSharedWithProjectsDiff(makeCredential(['p1', 'p2']), ['p2', 'p3']);

			expect(diff.toShare).toEqual(['p3']);
			expect(diff.toUnshare).toEqual(['p1']);
		});

		it('reports no change when the requested set matches the current one', () => {
			const diff = service.getSharedWithProjectsDiff(makeCredential(['p1']), ['p1']);

			expect(diff.toShare).toEqual([]);
			expect(diff.toUnshare).toEqual([]);
		});
	});

	describe('setSharedWithProjects', () => {
		const user = mock<User>({ id: 'user-1', role: { scopes: [] } });
		const credential = mock<CredentialsEntity>({
			id: 'cred-1',
			name: 'My Credential',
			type: 'slackApi',
		});

		let trx: {
			delete: ReturnType<typeof vi.fn>;
			exists: ReturnType<typeof vi.fn>;
			find: ReturnType<typeof vi.fn>;
			save: ReturnType<typeof vi.fn>;
		};

		beforeEach(() => {
			trx = {
				delete: vi.fn().mockResolvedValue({ affected: 0 }),
				exists: vi.fn().mockResolvedValue(true),
				find: vi.fn().mockResolvedValue([]),
				save: vi.fn().mockResolvedValue([]),
			};
			// @ts-expect-error - Mocking manager for testing
			sharedCredentialsRepository.manager = {
				transaction: vi.fn(async (cb: (t: unknown) => Promise<void>) => await cb(trx)),
			};
			projectRelationRepository.findBy.mockResolvedValue([]);
			userHasScopesMock.mockResolvedValue(true);
		});

		it('requires credential:share when projects are added', async () => {
			userHasScopesMock.mockResolvedValue(false);

			await expect(
				service.setSharedWithProjects(user, credential, { toShare: ['p1'], toUnshare: [] }),
			).rejects.toThrow(ForbiddenError);

			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['credential:share'], false, {
				credentialId: 'cred-1',
			});
			expect(sharedCredentialsRepository.manager.transaction).not.toHaveBeenCalled();
		});

		it('requires credential:unshare when projects are removed', async () => {
			userHasScopesMock.mockResolvedValue(false);

			await expect(
				service.setSharedWithProjects(user, credential, { toShare: [], toUnshare: ['p1'] }),
			).rejects.toThrow(ForbiddenError);

			expect(userHasScopesMock).toHaveBeenCalledWith(user, ['credential:unshare'], false, {
				credentialId: 'cred-1',
			});
			expect(sharedCredentialsRepository.manager.transaction).not.toHaveBeenCalled();
		});

		it('does not check either scope when nothing changes', async () => {
			await service.setSharedWithProjects(user, credential, { toShare: [], toUnshare: [] });

			expect(userHasScopesMock).not.toHaveBeenCalled();
		});

		it('emits the sharing event with the added projects and removed count', async () => {
			trx.delete.mockResolvedValue({ affected: 2 });

			await service.setSharedWithProjects(user, credential, {
				toShare: ['p1'],
				toUnshare: ['p2', 'p3'],
			});

			expect(eventService.emit).toHaveBeenCalledWith('credentials-shared', {
				user,
				credentialType: 'slackApi',
				credentialId: 'cred-1',
				userIdSharer: 'user-1',
				userIdsShareesAdded: ['p1'],
				shareesRemoved: 2,
			});
		});

		it('reports no removals when the unshare delete affected no rows', async () => {
			await service.setSharedWithProjects(user, credential, { toShare: ['p1'], toUnshare: [] });

			expect(eventService.emit).toHaveBeenCalledWith(
				'credentials-shared',
				expect.objectContaining({ shareesRemoved: null }),
			);
			expect(connectionStatusProxy.cleanupOrphanedEntriesForProjects).not.toHaveBeenCalled();
		});

		it('cleans up orphaned connection entries for unshared projects', async () => {
			trx.delete.mockResolvedValue({ affected: 1 });

			await service.setSharedWithProjects(user, credential, { toShare: [], toUnshare: ['p2'] });

			expect(connectionStatusProxy.cleanupOrphanedEntriesForProjects).toHaveBeenCalledWith(
				'cred-1',
				['p2'],
				trx,
			);
		});

		it('notifies the owners of the projects the credential was shared with', async () => {
			projectRelationRepository.findBy.mockResolvedValue([
				{ userId: 'owner-1' },
				{ userId: 'owner-2' },
			] as never);

			await service.setSharedWithProjects(user, credential, { toShare: ['p1'], toUnshare: [] });

			expect(userManagementMailer.notifyCredentialsShared).toHaveBeenCalledWith({
				sharer: user,
				newShareeIds: ['owner-1', 'owner-2'],
				credentialsName: 'My Credential',
			});
		});
	});
});
