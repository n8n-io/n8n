import type { DeploymentKeyRepository } from '../deployment-key.repository';

describe('DeploymentKeyRepository', () => {
	it('does not expose deletion or TypeORM escape hatches', () => {
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('delete');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('remove');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('clear');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('manager');
		expectTypeOf<DeploymentKeyRepository>().not.toHaveProperty('createQueryBuilder');
	});
});
