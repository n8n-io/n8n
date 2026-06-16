import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { EncryptionKeyProxy, InstanceSettings } from 'n8n-core';

import { KeyManagerService } from '../key-manager.service';
import { EncryptionBootstrapService } from '../encryption-bootstrap.service';

describe('EncryptionBootstrapService', () => {
	const keyManager = mockInstance(KeyManagerService);
	const encryptionKeyProxy = mockInstance(EncryptionKeyProxy);

	beforeEach(() => {
		jest.clearAllMocks();
		keyManager.bootstrapLegacyCbcKey.mockResolvedValue(undefined);
		keyManager.bootstrapGcmKey.mockResolvedValue(undefined);
	});

	const createService = (instanceType: InstanceSettings['instanceType'] = 'main') =>
		new EncryptionBootstrapService(
			keyManager,
			mockInstance(InstanceSettings, { encryptionKey: 'test-instance-key', instanceType }),
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
			jest.clearAllMocks();
			await createService(instanceType).run();

			expect(keyManager.bootstrapLegacyCbcKey).not.toHaveBeenCalled();
			expect(keyManager.bootstrapGcmKey).not.toHaveBeenCalled();
			expect(encryptionKeyProxy.setProvider).toHaveBeenCalledWith(keyManager);
		}
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
});
