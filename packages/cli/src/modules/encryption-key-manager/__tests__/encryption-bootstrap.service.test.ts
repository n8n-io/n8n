import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { KeyManagerService } from '../key-manager.service';
import { EncryptionBootstrapService } from '../encryption-bootstrap.service';

describe('EncryptionBootstrapService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const createService = (
		keyManager = mock<KeyManagerService>(),
		instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' }),
	) => new EncryptionBootstrapService(keyManager, instanceSettings, mockLogger());

	it('calls bootstrapLegacyKey with the instance encryption key', async () => {
		const keyManager = mock<KeyManagerService>();
		const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'my-instance-key' });

		await createService(keyManager, instanceSettings).run();

		expect(keyManager.bootstrapLegacyKey).toHaveBeenCalledWith('my-instance-key');
	});

	it('runs without error when bootstrap succeeds', async () => {
		await expect(createService().run()).resolves.toBeUndefined();
	});
});
