import type { Logger } from '@n8n/backend-common';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { DeploymentKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher, EncryptionKeyProxy, InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { KeyManagerService } from '../key-manager.service';

const realCipher = (encryptionKey: string) => {
	const proxy = new EncryptionKeyProxy();
	const instanceSettings = mock<InstanceSettings>({ encryptionKey });
	const cipher = new Cipher(instanceSettings, proxy);
	const keyManager = new KeyManagerService(
		Container.get(DeploymentKeyRepository),
		cipher,
		instanceSettings,
		mock<Logger>(),
	);
	proxy.setProvider(keyManager);
	return cipher;
};

beforeAll(async () => {
	mockInstance(InstanceSettings, { encryptionKey: 'unused', n8nFolder: '/tmp/n8n-test' });
	await testDb.init();
});

beforeEach(async () => {
	process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'false';
	await testDb.resetDeploymentKeys();
});

afterEach(() => {
	delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
});

afterAll(async () => {
	await testDb.terminate();
});

describe('legacy key seeded under a different instance key (integration)', () => {
	it('reads data that was written under the current instance key', async () => {
		const keyA = randomBytes(24).toString('base64');
		const keyB = randomBytes(24).toString('base64');
		const cipherA = realCipher(keyA);
		await Container.get(DeploymentKeyRepository).seedLegacyCbcKey(
			cipherA.encryptDEKWithInstanceKey(keyA),
		);

		const cipherB = realCipher(keyB);
		const data = { apiKey: 'secret-value' };
		const encrypted = await cipherB.encryptV2(data);

		expect(jsonParse(await cipherB.decryptV2(encrypted))).toEqual(data);
	});

	it('keeps reading through the stored key when it matches the instance key', async () => {
		const key = randomBytes(24).toString('base64');
		const cipher = realCipher(key);
		await Container.get(DeploymentKeyRepository).seedLegacyCbcKey(
			cipher.encryptDEKWithInstanceKey(key),
		);

		const encrypted = await cipher.encryptV2({ apiKey: 'secret-value' });

		expect(jsonParse(await cipher.decryptV2(encrypted))).toEqual({ apiKey: 'secret-value' });
	});
});
