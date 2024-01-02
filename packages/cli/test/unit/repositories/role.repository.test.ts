import { Container } from 'typedi';
import { DataSource, EntityManager } from 'typeorm';
import { mock } from 'jest-mock-extended';
import type { RoleNames, RoleScopes } from '@db/entities/Role';
import { Role } from '@db/entities/Role';
import { RoleRepository } from '@db/repositories/role.repository';
import { mockInstance } from '../../shared/mocking';
import { randomInteger } from '../../integration/shared/random';

describe('RoleRepository', () => {
	const entityManager = mockInstance(EntityManager);
	const dataSource = mockInstance(DataSource, { manager: entityManager });
	dataSource.getMetadata.mockReturnValue(mock());
	Object.assign(entityManager, { connection: dataSource });
	const roleRepository = Container.get(RoleRepository);

	describe('findRole', () => {
		test('should return the role when present', async () => {
			entityManager.findOne.mockResolvedValueOnce(createRole('global', 'owner'));
			const role = await roleRepository.findRole('global', 'owner');
			expect(role?.name).toEqual('owner');
			expect(role?.scope).toEqual('global');
		});

		test('should return null otherwise', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);
			const role = await roleRepository.findRole('global', 'owner');
			expect(role).toEqual(null);
		});
	});

	const createRole = (scope: RoleScopes, name: RoleNames) =>
		Object.assign(new Role(), { name, scope, id: `${randomInteger()}` });
});
