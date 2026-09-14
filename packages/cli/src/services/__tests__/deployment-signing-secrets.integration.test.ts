import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import jsonwebtoken from 'jsonwebtoken';
import { Cipher, InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';

const INSTANCE_ENCRYPTION_KEY = 'signing-secrets-instance-key';

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: INSTANCE_ENCRYPTION_KEY,
		n8nFolder: '/tmp/n8n-test',
		instanceType: 'main',
		canSeedDeploymentState: true,
	});
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

// Storage-format contract of the signing-secret repository methods, against a
// real database and the real cipher.
describe('deployment signing secrets (integration)', () => {
	let repo: DeploymentKeyRepository;
	let cipher: Cipher;

	beforeAll(() => {
		repo = Container.get(DeploymentKeyRepository);
		cipher = Container.get(Cipher);
	});

	beforeEach(async () => {
		await testDb.truncate(['DeploymentKey']);
	});

	it('seeds a secret in wrapped form and reads it back in usable form', async () => {
		await repo.seedSigningSecret('signing.hmac', 'the-hmac-secret');

		const row = await repo.findActiveByType('signing.hmac');
		expect(row).not.toBeNull();
		expect(row!.algorithm).toBe('aes-256-gcm');
		expect(row!.value).not.toContain('the-hmac-secret');
		expect(cipher.decryptDEKWithInstanceKey(row!.value)).toBe('the-hmac-secret');

		await expect(repo.findActiveSigningSecret('signing.hmac')).resolves.toBe('the-hmac-secret');
	});

	it('returns a row in the original stored form as-is without rewriting it', async () => {
		await repo.insertOrIgnore({
			type: 'signing.jwt',
			value: 'stored-plain-secret',
			status: 'active',
			algorithm: null,
		});

		await expect(repo.findActiveSigningSecret('signing.jwt')).resolves.toBe('stored-plain-secret');

		const row = await repo.findActiveByType('signing.jwt');
		expect(row!.algorithm).toBeNull();
		expect(row!.value).toBe('stored-plain-secret');
	});

	it('upgrades a row in the original stored form when rewrapLegacy is set', async () => {
		await repo.insertOrIgnore({
			type: 'signing.jwt',
			value: 'stored-plain-secret',
			status: 'active',
			algorithm: null,
		});

		await expect(repo.findActiveSigningSecret('signing.jwt', { rewrapLegacy: true })).resolves.toBe(
			'stored-plain-secret',
		);

		const row = await repo.findActiveByType('signing.jwt');
		expect(row!.algorithm).toBe('aes-256-gcm');
		expect(row!.value).not.toBe('stored-plain-secret');

		// The secret survives the upgrade unchanged, and a second read is a no-op.
		await expect(repo.findActiveSigningSecret('signing.jwt', { rewrapLegacy: true })).resolves.toBe(
			'stored-plain-secret',
		);
	});

	it('throws on a storage format this version cannot read', async () => {
		await repo.insertOrIgnore({
			type: 'signing.jwt',
			value: 'value-in-some-future-format',
			status: 'active',
			algorithm: 'aes-256-cbc',
		});

		await expect(repo.findActiveSigningSecret('signing.jwt')).rejects.toThrow(
			"unsupported storage format 'aes-256-cbc'",
		);
	});

	it('throws a usable error when a wrapped value cannot be read', async () => {
		await repo.seedSigningSecret('signing.binary_data', 'the-binary-secret');
		const row = await repo.findActiveByType('signing.binary_data');
		// Simulate a value written under a different instance encryption key.
		await repo.update({ id: row!.id }, { value: `${row!.value.slice(0, -4)}AAAA` });

		await expect(repo.findActiveSigningSecret('signing.binary_data')).rejects.toThrow(
			'cannot be read with this instance encryption key',
		);
	});

	it('adopts the wrapped DB secret instead of the derived one', async () => {
		// Pre-seed a DB secret that differs from anything derivable from the
		// instance key: only a real unwrap-and-adopt of the stored row can make
		// tokens verify against it.
		await repo.seedSigningSecret('signing.jwt', 'preseeded-db-secret');

		const globalConfig = Container.get(GlobalConfig);
		globalConfig.userManagement.jwtSecret = '';
		const service = new JwtService(Container.get(InstanceSettings), globalConfig);
		await service.initialize(repo);

		const token = service.sign({ sub: 'roundtrip' });
		expect(jsonwebtoken.verify(token, 'preseeded-db-secret')).toMatchObject({ sub: 'roundtrip' });
	});
});
