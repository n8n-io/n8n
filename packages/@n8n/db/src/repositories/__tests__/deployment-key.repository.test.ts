import type { DataSource } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { DbLockService } from '../../services/db-lock.service';
import { DeploymentKeyRepository } from '../deployment-key.repository';

describe('DeploymentKeyRepository', () => {
	describe('delete surface', () => {
		const repository = new DeploymentKeyRepository(mock<DataSource>(), mock<DbLockService>());

		test.each(['delete', 'remove', 'softDelete', 'softRemove', 'clear'] as const)(
			'%s() always throws — keys are deactivated, never deleted',
			async (method) => {
				await expect(repository[method]()).rejects.toThrow('Deployment keys must never be deleted');
			},
		);
	});
});
