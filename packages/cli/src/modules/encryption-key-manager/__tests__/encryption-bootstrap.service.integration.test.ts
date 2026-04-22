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

// TODO: restore full seeding assertions when bootstrap logic is re-enabled in encryption-bootstrap.service.ts
describe('EncryptionBootstrapService (integration)', () => {
	it('completes without error and does not write any keys while bootstrap is disabled', async () => {
		await Container.get(EncryptionBootstrapService).run();

		const rows = await Container.get(DeploymentKeyRepository).find({
			where: { type: 'data_encryption' },
		});
		expect(rows).toHaveLength(0);
	});
});
