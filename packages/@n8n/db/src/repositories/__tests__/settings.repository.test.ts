import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { Settings } from '../../entities';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { SettingsRepository } from '../settings.repository';

describe('SettingsRepository', () => {
	mockEntityManager(Settings);
	const repository = Container.get(SettingsRepository);

	it('upserts a setting with the provided operation context', async () => {
		const transactionManager = mock<EntityManager>();
		const ctx = { trx: new TypeOrmTransaction(transactionManager) };

		await repository.upsertByKey('instanceAi.settings', '{"enabled":true}', true, ctx);

		expect(transactionManager.upsert).toHaveBeenCalledWith(
			Settings,
			{
				key: 'instanceAi.settings',
				value: '{"enabled":true}',
				loadOnStartup: true,
			},
			['key'],
		);
	});
});
