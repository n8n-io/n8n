import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { EncryptionBootstrapService } from '../encryption-bootstrap.service';

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: 'legacy-encryption-key',
		n8nFolder: '/tmp/n8n-test',
	});
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['DeploymentKey']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('EncryptionBootstrapService (integration)', () => {
	it('seeds the legacy aes-256-cbc key on first run', async () => {
		await Container.get(EncryptionBootstrapService).run();

		const rows = await Container.get(DeploymentKeyRepository).find({
			where: { type: 'data_encryption' },
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ algorithm: 'aes-256-cbc', status: 'active' });
	});

	it('is idempotent: running twice does not create duplicate keys', async () => {
		await Container.get(EncryptionBootstrapService).run();
		await Container.get(EncryptionBootstrapService).run();

		const rows = await Container.get(DeploymentKeyRepository).find({
			where: { type: 'data_encryption' },
		});
		expect(rows).toHaveLength(1);
	});
});
