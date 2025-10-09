import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { SharedCredentials } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { SharedCredentialsRepository } from '../shared-credentials.repository';

describe('SharedCredentialsRepository', () => {
	const entityManager = mockEntityManager(SharedCredentials);
	const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('findByCredentialIds', () => {
		it('should return shared credentials with project relations including role', async () => {
			const credentialIds = ['cred1', 'cred2'];
			const role = 'credential:owner';

			entityManager.find.mockResolvedValueOnce([]);

			await sharedCredentialsRepository.findByCredentialIds(credentialIds, role);

			expect(entityManager.find).toHaveBeenCalledWith(SharedCredentials, {
				relations: { credentials: true, project: { projectRelations: { user: true, role: true } } },
				where: {
					credentialsId: In(credentialIds),
					role,
				},
			});
		});
	});
});
