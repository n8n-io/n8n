import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';

import { KeyManagerService } from '@/modules/encryption-key-manager/key-manager.service';

import { EncryptionBootstrapService } from '../encryption-bootstrap.service';

const INSTANCE_ENCRYPTION_KEY = 'rotation-cycle-instance-key';

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: INSTANCE_ENCRYPTION_KEY,
		n8nFolder: '/tmp/n8n-test',
		instanceType: 'main',
		canSeedDeploymentState: true,
	});
	await testDb.init();
	process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'true';
});

afterAll(async () => {
	delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
	await testDb.terminate();
});

// Full rotate cycle through the real key store and cipher:
// writes switch keys immediately after a rotation; older data stays readable.
describe('key rotation cycle (integration)', () => {
	it('rotates the write key without losing access to earlier data', async () => {
		await Container.get(EncryptionBootstrapService).run();
		const cipher = Container.get(Cipher);
		const keyManager = Container.get(KeyManagerService);

		const beforeRotation = await cipher.encryptV2('written-before-rotation');
		const [keyIdBefore] = beforeRotation.split(':');

		const rotated = await keyManager.rotateKey();

		const afterRotation = await cipher.encryptV2('written-after-rotation');
		const [keyIdAfter] = afterRotation.split(':');

		// The very next write uses the new key — the active-key memo moved with
		// the rotation instead of waiting for a TTL.
		expect(keyIdAfter).toBe(rotated.id);
		expect(keyIdAfter).not.toBe(keyIdBefore);

		// Data written under the previous key stays readable (by-id lookup).
		expect(await cipher.decryptV2(beforeRotation)).toBe('written-before-rotation');
		expect(await cipher.decryptV2(afterRotation)).toBe('written-after-rotation');
	});

	it('rotating twice in a row keeps every generation readable', async () => {
		// Self-sufficient: seed the store even when this test runs alone.
		await Container.get(EncryptionBootstrapService).run();
		const cipher = Container.get(Cipher);
		const keyManager = Container.get(KeyManagerService);

		const generations: string[] = [];
		for (let i = 0; i < 3; i++) {
			generations.push(await cipher.encryptV2(`generation-${i}`));
			await keyManager.rotateKey();
		}

		// Guard against silently degenerating into the legacy no-prefix format.
		for (const value of generations) {
			expect(value).toContain(':');
		}
		const prefixes = generations.map((value) => value.split(':')[0]);
		expect(new Set(prefixes).size).toBe(prefixes.length);

		for (let i = 0; i < generations.length; i++) {
			expect(await cipher.decryptV2(generations[i])).toBe(`generation-${i}`);
		}
	});
});
