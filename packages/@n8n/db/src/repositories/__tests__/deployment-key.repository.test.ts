import type { DeploymentKeyRepository } from '../deployment-key.repository';

describe('DeploymentKeyRepository', () => {
	it('does not expose deletion or TypeORM escape hatches', () => {
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('delete');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('remove');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('clear');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('manager');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('createQueryBuilder');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('find');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('findOne');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('findOneByOrFail');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('create');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('save');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('insert');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('update');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('insertOrIgnore');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('insertAsActive');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('promoteToActive');
	});
});
