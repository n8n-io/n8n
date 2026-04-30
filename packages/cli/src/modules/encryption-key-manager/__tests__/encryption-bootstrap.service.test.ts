import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { InstanceSettings } from 'n8n-core';

import { KeyManagerService } from '../key-manager.service';
import { EncryptionBootstrapService } from '../encryption-bootstrap.service';

describe('EncryptionBootstrapService', () => {
	const keyManager = mockInstance(KeyManagerService);

	beforeEach(() => {
		jest.clearAllMocks();
		keyManager.bootstrapLegacyCbcKey.mockResolvedValue(undefined);
		keyManager.bootstrapGcmKey.mockResolvedValue(undefined);
	});

	const createService = () =>
		new EncryptionBootstrapService(
			keyManager,
			mockInstance(InstanceSettings, { encryptionKey: 'test-instance-key' }),
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
