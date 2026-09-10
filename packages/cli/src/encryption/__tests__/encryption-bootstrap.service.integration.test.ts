import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';
import { randomBytes } from 'node:crypto';

import { EncryptionBootstrapService } from '../encryption-bootstrap.service';
import { KeyManagerService } from '../key-manager.service';

const INSTANCE_ENCRYPTION_KEY = 'legacy-encryption-key';

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: INSTANCE_ENCRYPTION_KEY,
		n8nFolder: '/tmp/n8n-test',
		instanceType: 'main',
		canSeedDeploymentState: true,
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

	it('is race-safe — concurrent bootstraps never create duplicate keys (H7)', async () => {
		const service = Container.get(EncryptionBootstrapService);

		await Promise.all([...Array(5)].map(async () => await service.run()));

		const all = await Container.get(DeploymentKeyRepository).find({
			where: { type: 'data_encryption' },
		});
		const cbcKeys = all.filter((k) => k.algorithm === 'aes-256-cbc');
		const gcmKeys = all.filter((k) => k.algorithm === 'aes-256-gcm' && k.status === 'active');
		expect(cbcKeys).toHaveLength(1);
		expect(gcmKeys).toHaveLength(1);
	});

	it('serializes concurrent seed calls in the repository critical section', async () => {
		// Bypass the service-level fast-path check and hammer the repository
		// directly: the DbLock critical section must let exactly one insert in.
		const repository = Container.get(DeploymentKeyRepository);

		await Promise.all(
			[...Array(5)].map(async (_, i) => await repository.seedLegacyCbcKey(`value-${i}`)),
		);

		const rows = await repository.find({
			where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
		});
		expect(rows).toHaveLength(1);
	});

	describe('end-to-end write path (real key store, real cipher)', () => {
		beforeEach(() => {
			delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
		});

		it('writes the legacy no-prefix format while rotation is off', async () => {
			await Container.get(EncryptionBootstrapService).run();
			const cipher = Container.get(Cipher);

			const encrypted = await cipher.encryptV2('e2e-off');

			expect(encrypted.includes(':')).toBe(false);
			expect(cipher.decryptWithInstanceKey(encrypted)).toBe('e2e-off');
			expect(await cipher.decryptV2(encrypted)).toBe('e2e-off');
		});

		it('writes the keyId-prefixed GCM format while rotation is on, round-tripping through the seeded key', async () => {
			await Container.get(EncryptionBootstrapService).run();
			process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'true';
			try {
				const cipher = Container.get(Cipher);

				const encrypted = await cipher.encryptV2('e2e-on');

				const active =
					await Container.get(DeploymentKeyRepository).findActiveByType('data_encryption');
				expect(encrypted.startsWith(`${active!.id}:`)).toBe(true);
				expect(await cipher.decryptV2(encrypted)).toBe('e2e-on');
			} finally {
				delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
			}
		});
	});

	describe('legacy DEK repair', () => {
		const seed = async (value: string) => {
			const repo = Container.get(DeploymentKeyRepository);
			await repo.save(
				repo.create({ type: 'data_encryption', value, algorithm: 'aes-256-gcm', status: 'active' }),
			);
		};

		const onlyRow = async () => {
			const rows = await Container.get(DeploymentKeyRepository).find({
				where: { type: 'data_encryption' },
			});
			expect(rows).toHaveLength(1);
			return rows[0];
		};

		// Seeds an inactive row and returns it — the partial unique index allows
		// only one active row per type, so a multi-row test must stay inactive.
		const seedRow = async (value: string) => {
			const repo = Container.get(DeploymentKeyRepository);
			return await repo.save(
				repo.create({
					type: 'data_encryption',
					value,
					algorithm: 'aes-256-gcm',
					status: 'inactive',
				}),
			);
		};

		it.each<[string, (cipher: Cipher, rawKey: string) => string]>([
			['raw 2.18.x', (_cipher, rawKey) => rawKey],
			['CBC 2.19.x', (cipher, rawKey) => cipher.encryptWithInstanceKey(rawKey)],
		])('repairs a seeded %s key losslessly and idempotently', async (_name, build) => {
			const cipher = Container.get(Cipher);
			const rawKey = randomBytes(32).toString('hex');
			await seed(build(cipher, rawKey));
			const km = Container.get(KeyManagerService);

			await km.repairLegacyDataEncryptionKeys();
			const afterFirst = await onlyRow();
			expect(cipher.decryptDEKWithInstanceKey(afterFirst.value)).toBe(rawKey);

			// A second run leaves the now-GCM value untouched.
			await km.repairLegacyDataEncryptionKeys();
			const afterSecond = await onlyRow();
			expect(afterSecond.value).toBe(afterFirst.value);
		});

		it('repairs every legacy row in a mixed set and keeps going past a skipped row', async () => {
			const cipher = Container.get(Cipher);
			const repo = Container.get(DeploymentKeyRepository);

			const rawA = randomBytes(32).toString('hex');
			const rawB = randomBytes(32).toString('hex');
			const rawC = randomBytes(32).toString('hex');

			const rawRow = await seedRow(rawA);
			const gcmRow = await seedRow(cipher.encryptDEKWithInstanceKey(rawB));
			const cbcRow = await seedRow(cipher.encryptWithInstanceKey(rawC));

			await Container.get(KeyManagerService).repairLegacyDataEncryptionKeys();

			const rows = await repo.find({ where: { type: 'data_encryption' } });
			const byId = (id: string) => rows.find((r) => r.id === id)!;

			// Both legacy rows are now GCM-readable and recover their exact keys.
			expect(cipher.decryptDEKWithInstanceKey(byId(rawRow.id).value)).toBe(rawA);
			expect(cipher.decryptDEKWithInstanceKey(byId(cbcRow.id).value)).toBe(rawC);
			// The already-GCM row is untouched, byte for byte.
			expect(byId(gcmRow.id).value).toBe(gcmRow.value);
		});

		it('leaves a properly GCM-wrapped key untouched', async () => {
			const cipher = Container.get(Cipher);
			const rawKey = randomBytes(32).toString('hex');
			await seed(cipher.encryptDEKWithInstanceKey(rawKey));
			const before = await onlyRow();

			await Container.get(KeyManagerService).repairLegacyDataEncryptionKeys();

			const after = await onlyRow();
			expect(after.value).toBe(before.value);
		});
	});
});
