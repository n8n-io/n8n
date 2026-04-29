import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';

import { EncryptionBootstrapService } from '../encryption-bootstrap.service';

const INSTANCE_ENCRYPTION_KEY = 'legacy-encryption-key';

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: INSTANCE_ENCRYPTION_KEY,
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
	it('creates an inactive CBC key seeded from the instance encryption key', async () => {
		await Container.get(EncryptionBootstrapService).run();

		const rows = await Container.get(DeploymentKeyRepository).find({
			where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].status).toBe('inactive');

		const cipher = Container.get(Cipher);
		const decrypted = cipher.decryptDEKWithInstanceKey(rows[0].value);
		expect(decrypted).toBe(INSTANCE_ENCRYPTION_KEY);
	});

	it('creates an active GCM key', async () => {
		await Container.get(EncryptionBootstrapService).run();

		const rows = await Container.get(DeploymentKeyRepository).find({
			where: { type: 'data_encryption', algorithm: 'aes-256-gcm', status: 'active' },
		});
		expect(rows).toHaveLength(1);
	});

	it('is idempotent — running twice does not create duplicate keys', async () => {
		await Container.get(EncryptionBootstrapService).run();
		await Container.get(EncryptionBootstrapService).run();

		const all = await Container.get(DeploymentKeyRepository).find({
			where: { type: 'data_encryption' },
		});
		const cbcKeys = all.filter((k) => k.algorithm === 'aes-256-cbc');
		const gcmKeys = all.filter((k) => k.algorithm === 'aes-256-gcm' && k.status === 'active');
		expect(cbcKeys).toHaveLength(1);
		expect(gcmKeys).toHaveLength(1);
	});
});
