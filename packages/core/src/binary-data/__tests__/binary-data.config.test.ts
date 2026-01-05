import { Container } from '@n8n/di';

import { InstanceSettings } from '@/instance-settings';
import { mockInstance } from '@test/utils';

import { BinaryDataConfig } from '../binary-data.config';

describe('BinaryDataConfig', () => {
	const n8nFolder = '/test/n8n';
	const encryptionKey = 'test-encryption-key';
	console.warn = jest.fn().mockImplementation(() => {});

	const now = new Date('2025-01-01T01:23:45.678Z');
	jest.useFakeTimers({ now });

	beforeEach(() => {
		process.env = {};
		jest.resetAllMocks();
		Container.reset();
		mockInstance(InstanceSettings, { encryptionKey, n8nFolder });
	});

	it('should use default values when no env variables are defined', () => {
		const config = Container.get(BinaryDataConfig);

		expect(config.availableModes).toEqual(['filesystem', 's3', 'database']);
		expect(config.mode).toBe('filesystem');
		expect(config.localStoragePath).toBe('/test/n8n/binaryData');
	});

	it('should use values from env variables when defined', () => {
		process.env.N8N_DEFAULT_BINARY_DATA_MODE = 's3';
		process.env.N8N_BINARY_DATA_STORAGE_PATH = '/custom/storage/path';
		process.env.N8N_BINARY_DATA_SIGNING_SECRET = 'super-secret';

		const config = Container.get(BinaryDataConfig);

		expect(config.mode).toEqual('s3');
		expect(config.availableModes).toEqual(['filesystem', 's3', 'database']);
		expect(config.localStoragePath).toEqual('/custom/storage/path');
		expect(config.signingSecret).toBe('super-secret');
	});

	it('should derive the signing secret from the encryption-key, when none is passed in', () => {
		const config = Container.get(BinaryDataConfig);

		expect(config.signingSecret).toBe('96eHYcXMF6J1Pn6dhdkOEt6H2BMa6kR5oR0ce7llWyA=');
	});

	it('should fallback to filesystem for invalid mode', () => {
		process.env.N8N_DEFAULT_BINARY_DATA_MODE = 'invalid-mode';

		const config = Container.get(BinaryDataConfig);

		expect(config.mode).toEqual('filesystem');
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Invalid value for N8N_DEFAULT_BINARY_DATA_MODE'),
		);
	});
});
