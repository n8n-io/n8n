import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { KeyManagerService } from '@/encryption/key-manager.service';

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: 'get-key-by-id-type-scope-instance-key',
		n8nFolder: '/tmp/n8n-test',
		instanceType: 'main',
		canSeedDeploymentState: true,
	});
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

// Locks in that a row of another type cannot be returned for a data-encryption
// lookup, even though `id` is the table's only primary key across all types.
describe('getKeyById() type scoping (integration)', () => {
	it('does not resolve a jwe.private-key row', async () => {
		const repo = Container.get(DeploymentKeyRepository);
		const jweRow = await repo.save(
			repo.create({
				type: 'jwe.private-key',
				value: 'jwe-secret',
				algorithm: 'RSA-OAEP-256',
				status: 'active',
			}),
		);

		const result = await Container.get(KeyManagerService).getKeyById(jweRow.id);

		expect(result).toBeNull();
	});

	it('does not resolve a signing.hmac row', async () => {
		const repo = Container.get(DeploymentKeyRepository);
		const hmacRow = await repo.save(
			repo.create({
				type: 'signing.hmac',
				value: 'hmac-secret',
				algorithm: null,
				status: 'active',
			}),
		);

		const result = await Container.get(KeyManagerService).getKeyById(hmacRow.id);

		expect(result).toBeNull();
	});
});
