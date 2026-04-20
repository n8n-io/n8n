import { mockLogger } from '@n8n/backend-test-utils';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { EncryptionBootstrapService } from '../encryption-bootstrap.service';
import type { KeyManagerService } from '../key-manager.service';

describe('EncryptionBootstrapService', () => {
	const FLAG = 'N8N_ENCRYPTION_KEY_IDENTIFICATION_ENABLED';
	let keyManager: MockProxy<KeyManagerService>;
	let instanceSettings: MockProxy<InstanceSettings>;
	let originalFlag: string | undefined;

	beforeEach(() => {
		jest.clearAllMocks();
		originalFlag = process.env[FLAG];
		process.env[FLAG] = 'true';
		keyManager = mock<KeyManagerService>();
		instanceSettings = mock<InstanceSettings>({ isLeader: true, encryptionKey: 'legacy-key' });
	});

	afterEach(() => {
		if (originalFlag === undefined) delete process.env[FLAG];
		else process.env[FLAG] = originalFlag;
	});

	const createService = () =>
		new EncryptionBootstrapService(keyManager, instanceSettings, mockLogger());

	it('does nothing when feature flag is not set', async () => {
		delete process.env[FLAG];

		await createService().run();

		expect(keyManager.getActiveKey).not.toHaveBeenCalled();
		expect(keyManager.addKey).not.toHaveBeenCalled();
	});

	it('does nothing when feature flag is any value other than "true"', async () => {
		process.env[FLAG] = '1';

		await createService().run();

		expect(keyManager.getActiveKey).not.toHaveBeenCalled();
		expect(keyManager.addKey).not.toHaveBeenCalled();
	});

	it('does nothing on non-leader instances', async () => {
		instanceSettings = mock<InstanceSettings>({ isLeader: false, encryptionKey: 'legacy-key' });

		await createService().run();

		expect(keyManager.getActiveKey).not.toHaveBeenCalled();
		expect(keyManager.addKey).not.toHaveBeenCalled();
	});

	it('seeds the legacy CBC key as active when no active key exists', async () => {
		keyManager.getActiveKey.mockRejectedValue(new NotFoundError('No active encryption key found'));
		keyManager.addKey.mockResolvedValue({ id: 'new-key' });

		await createService().run();

		expect(keyManager.addKey).toHaveBeenCalledWith('legacy-key', 'aes-256-cbc', true);
	});

	it('is idempotent when an active key already exists', async () => {
		keyManager.getActiveKey.mockResolvedValue({
			id: 'existing',
			value: 'v',
			algorithm: 'aes-256-gcm',
		});

		await createService().run();

		expect(keyManager.addKey).not.toHaveBeenCalled();
	});

	it('rethrows non-NotFound errors from getActiveKey (invariant violations)', async () => {
		keyManager.getActiveKey.mockRejectedValue(
			new Error('Encryption key invariant violated: multiple active keys found'),
		);

		await expect(createService().run()).rejects.toThrow('invariant violated');
		expect(keyManager.addKey).not.toHaveBeenCalled();
	});
});
