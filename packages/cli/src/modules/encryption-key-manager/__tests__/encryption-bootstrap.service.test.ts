import { mockLogger } from '@n8n/backend-test-utils';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { EncryptionBootstrapService } from '../encryption-bootstrap.service';
import type { KeyManagerService } from '../key-manager.service';

describe('EncryptionBootstrapService', () => {
	let keyManager: MockProxy<KeyManagerService>;
	let instanceSettings: MockProxy<InstanceSettings>;

	beforeEach(() => {
		jest.clearAllMocks();
		keyManager = mock<KeyManagerService>();
		instanceSettings = mock<InstanceSettings>({ encryptionKey: 'legacy-key' });
	});

	const createService = () =>
		new EncryptionBootstrapService(keyManager, instanceSettings, mockLogger());

	it('delegates to KeyManagerService.bootstrapLegacyKey with the instance encryption key', async () => {
		await createService().run();

		expect(keyManager.bootstrapLegacyKey).toHaveBeenCalledWith('legacy-key');
	});
});
