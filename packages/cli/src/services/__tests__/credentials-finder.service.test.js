'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const jest_mock_extended_1 = require('jest-mock-extended');
const credentials_finder_service_1 = require('@/credentials/credentials-finder.service');
const mocking_1 = require('@test/mocking');
describe('CredentialsFinderService', () => {
	const entityManager = (0, mocking_1.mockEntityManager)(db_1.SharedCredentials);
	const credentialsFinderService = di_1.Container.get(
		credentials_finder_service_1.CredentialsFinderService,
	);
	describe('findCredentialForUser', () => {
		const credentialsId = 'cred_123';
		const sharedCredential = (0, jest_mock_extended_1.mock)();
		sharedCredential.credentials = (0, jest_mock_extended_1.mock)({ id: credentialsId });
		const owner = (0, jest_mock_extended_1.mock)({
			role: 'global:owner',
		});
		const member = (0, jest_mock_extended_1.mock)({
			role: 'global:member',
			id: 'test',
		});
		beforeEach(() => {
			jest.resetAllMocks();
		});
		test('should allow instance owner access to all credentials', async () => {
			entityManager.findOne.mockResolvedValueOnce(sharedCredential);
			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				owner,
				['credential:read'],
			);
			expect(entityManager.findOne).toHaveBeenCalledWith(db_1.SharedCredentials, {
				relations: { credentials: { shared: { project: { projectRelations: { user: true } } } } },
				where: { credentialsId },
			});
			expect(credential).toEqual(sharedCredential.credentials);
		});
		test('should allow members', async () => {
			entityManager.findOne.mockResolvedValueOnce(sharedCredential);
			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				member,
				['credential:read'],
			);
			expect(entityManager.findOne).toHaveBeenCalledWith(db_1.SharedCredentials, {
				relations: { credentials: { shared: { project: { projectRelations: { user: true } } } } },
				where: {
					credentialsId,
					role: (0, typeorm_1.In)(['credential:owner', 'credential:user']),
					project: {
						projectRelations: {
							role: (0, typeorm_1.In)([
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
			const credential = await credentialsFinderService.findCredentialForUser(
				credentialsId,
				member,
				['credential:read'],
			);
			expect(entityManager.findOne).toHaveBeenCalledWith(db_1.SharedCredentials, {
				relations: { credentials: { shared: { project: { projectRelations: { user: true } } } } },
				where: {
					credentialsId,
					role: (0, typeorm_1.In)(['credential:owner', 'credential:user']),
					project: {
						projectRelations: {
							role: (0, typeorm_1.In)([
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
//# sourceMappingURL=credentials-finder.service.test.js.map
