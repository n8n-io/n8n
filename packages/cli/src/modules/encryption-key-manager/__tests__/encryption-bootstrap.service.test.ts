import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { EncryptionKeyProxy, InstanceSettings } from 'n8n-core';

import { EncryptionBootstrapService } from '../encryption-bootstrap.service';
import { KeyManagerService } from '../key-manager.service';

describe('EncryptionBootstrapService', () => {
	const keyManager = mockInstance(KeyManagerService);
	const encryptionKeyProxy = mockInstance(EncryptionKeyProxy);

	beforeEach(() => {
		vi.clearAllMocks();
		keyManager.bootstrapLegacyCbcKey.mockResolvedValue(undefined);
		keyManager.bootstrapGcmKey.mockResolvedValue(undefined);
	});

	const createService = (
		instanceType: InstanceSettings['instanceType'] = 'main',
		canSeedDeploymentState = true,
	) =>
		new EncryptionBootstrapService(
			keyManager,
			mockInstance(InstanceSettings, {
				encryptionKey: 'test-instance-key',
				instanceType,
				canSeedDeploymentState,
			}),
			encryptionKeyProxy,
			mockLogger(),
		);

	it('bootstraps CBC key with the instance encryption key', async () => {
		await createService().run();

		expect(keyManager.bootstrapLegacyCbcKey).toHaveBeenCalledWith('test-instance-key');
	});

	it('bootstraps GCM key', async () => {
		await createService().run();

		expect(keyManager.bootstrapGcmKey).toHaveBeenCalled();
	});

	it('wires the key manager into the encryption key proxy', async () => {
		await createService().run();

		expect(encryptionKeyProxy.setProvider).toHaveBeenCalledWith(keyManager);
	});

	it('skips key creation on non-main instances but still sets the provider', async () => {
		for (const instanceType of ['worker', 'webhook'] as const) {
			vi.clearAllMocks();
			await createService(instanceType).run();

			expect(keyManager.bootstrapLegacyCbcKey).not.toHaveBeenCalled();
			expect(keyManager.bootstrapGcmKey).not.toHaveBeenCalled();
			expect(encryptionKeyProxy.setProvider).toHaveBeenCalledWith(keyManager);
		}
	});

	it('skips key creation when the process may not seed deployment state, but still sets the provider', async () => {
		await createService('main', false).run();

		expect(keyManager.bootstrapLegacyCbcKey).not.toHaveBeenCalled();
		expect(keyManager.bootstrapGcmKey).not.toHaveBeenCalled();
		expect(encryptionKeyProxy.setProvider).toHaveBeenCalledWith(keyManager);
	});

	it('bootstraps CBC before GCM', async () => {
		const order: string[] = [];
		keyManager.bootstrapLegacyCbcKey.mockImplementation(async () => {
			order.push('cbc');
		});
		keyManager.bootstrapGcmKey.mockImplementation(async () => {
			order.push('gcm');
		});

		await createService().run();

		expect(order).toEqual(['cbc', 'gcm']);
	});

	describe('seeding failure', () => {
		const seedError = new Error('no write access');

		it('does not crash the instance while the rotation flag is off, and still sets the provider', async () => {
			keyManager.bootstrapLegacyCbcKey.mockRejectedValue(seedError);

			await expect(createService().run()).resolves.toBeUndefined();

			expect(encryptionKeyProxy.setProvider).toHaveBeenCalledWith(keyManager);
		});

		it('rethrows while the rotation flag is on, because the keys are load-bearing', async () => {
			process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'true';
			try {
				keyManager.bootstrapGcmKey.mockRejectedValue(seedError);

				await expect(createService().run()).rejects.toThrow('no write access');
			} finally {
				delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
			}
		});
	});
});
