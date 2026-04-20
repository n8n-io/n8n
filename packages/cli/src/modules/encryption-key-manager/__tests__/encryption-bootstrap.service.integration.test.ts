import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { EncryptionBootstrapService } from '../encryption-bootstrap.service';

const FLAG = 'N8N_ENCRYPTION_KEY_IDENTIFICATION_ENABLED';
let originalFlag: string | undefined;

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		isLeader: true,
		encryptionKey: 'legacy-encryption-key',
		n8nFolder: '/tmp/n8n-test',
	});
	await testDb.init();
});

beforeEach(async () => {
	originalFlag = process.env[FLAG];
	process.env[FLAG] = 'true';
	await testDb.truncate(['DeploymentKey']);
});

afterEach(() => {
	if (originalFlag === undefined) delete process.env[FLAG];
	else process.env[FLAG] = originalFlag;
});

afterAll(async () => {
	await testDb.terminate();
});

describe('EncryptionBootstrapService (integration)', () => {
	it('seeds the legacy CBC key as active when the table is empty', async () => {
		await Container.get(EncryptionBootstrapService).run();

		const rows = await Container.get(DeploymentKeyRepository).find({
			where: { type: 'data_encryption' },
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			type: 'data_encryption',
			value: 'legacy-encryption-key',
			algorithm: 'aes-256-cbc',
			status: 'active',
		});
	});

	it('is a no-op on a second run', async () => {
		const service = Container.get(EncryptionBootstrapService);
		const repository = Container.get(DeploymentKeyRepository);

		await service.run();
		const [firstRow] = await repository.find({ where: { type: 'data_encryption' } });

		await service.run();
		const rows = await repository.find({ where: { type: 'data_encryption' } });

		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(firstRow.id);
	});
});
