import { hasScope } from '@n8n/permissions';
import { In } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { Container } from 'typedi';

import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import { SharedCredentials } from '@/databases/entities/shared-credentials';
import type { User } from '@/databases/entities/user';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { GLOBAL_MEMBER_SCOPES, GLOBAL_OWNER_SCOPES } from '@/permissions/global-roles';
import { mockEntityManager } from '@test/mocking';

describe('SharedCredentialsRepository', () => {
	const entityManager = mockEntityManager(SharedCredentials);
	const repository = Container.get(SharedCredentialsRepository);

	describe('findCredentialForUser', () => {
		const credentialsId = 'cred_123';
		const sharedCredential = mock<SharedCredentials>();
		sharedCredential.credentials = mock<CredentialsEntity>({ id: credentialsId });
		const owner = mock<User>({
			isOwner: true,
			hasGlobalScope: (scope) =>
				hasScope(scope, {
					global: GLOBAL_OWNER_SCOPES,
				}),
		});
		const member = mock<User>({
			isOwner: false,
			id: 'test',
			hasGlobalScope: (scope) =>
				hasScope(scope, {
					global: GLOBAL_MEMBER_SCOPES,
				}),
		});

		beforeEach(() => {
			jest.resetAllMocks();
		});

		test('should allow instance owner access to all credentials', async () => {
			entityManager.findOne.mockResolvedValueOnce(sharedCredential);
			const credential = await repository.findCredentialForUser(credentialsId, owner, [
				'credential:read',
			]);
			expect(entityManager.findOne).toHaveBeenCalledWith(SharedCredentials, {
				relations: { credentials: { shared: { project: { projectRelations: { user: true } } } } },
				where: { credentialsId },
			});
			expect(credential).toEqual(sharedCredential.credentials);
		});

		test('should allow members', async () => {
			entityManager.findOne.mockResolvedValueOnce(sharedCredential);
			const credential = await repository.findCredentialForUser(credentialsId, member, [
				'credential:read',
			]);
			expect(entityManager.findOne).toHaveBeenCalledWith(SharedCredentials, {
				relations: { credentials: { shared: { project: { projectRelations: { user: true } } } } },
				where: {
					credentialsId,
					role: In(['credential:owner', 'credential:user']),
					project: {
						projectRelations: {
							role: In([
								'project:admin',
								'project:personalOwner',
								'project:editor',
								'project:viewer',
							]),
							userId: member.id,
						},
					},
				},
			});
			expect(credential).toEqual(sharedCredential.credentials);
		});

		test('should return null when no shared credential is found', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);
			const credential = await repository.findCredentialForUser(credentialsId, member, [
				'credential:read',
			]);
			expect(entityManager.findOne).toHaveBeenCalledWith(SharedCredentials, {
				relations: { credentials: { shared: { project: { projectRelations: { user: true } } } } },
				where: {
					credentialsId,
					role: In(['credential:owner', 'credential:user']),
					project: {
						projectRelations: {
							role: In([
								'project:admin',
								'project:personalOwner',
								'project:editor',
								'project:viewer',
							]),
							userId: member.id,
						},
					},
				},
			});
			expect(credential).toEqual(null);
		});
	});
});
