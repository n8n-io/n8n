import { Container } from '@n8n/di';
import { existsSync } from 'node:fs';
import type { Mock } from 'vitest';

import { InstanceSettings } from '@/instance-settings';
import { mockInstance } from '@test/utils';

import { BinaryDataConfig } from '../binary-data.config';

vi.mock('node:fs', () => ({
	existsSync: vi.fn().mockReturnValue(false),
	renameSync: vi.fn(),
}));

describe('BinaryDataConfig', () => {
	const n8nFolder = '/test/n8n';
	const encryptionKey = 'test-encryption-key';
	console.warn = vi.fn().mockImplementation(() => {});

	const now = new Date('2025-01-01T01:23:45.678Z');
	vi.useFakeTimers({ now });

	beforeEach(() => {
		process.env = {};
		vi.resetAllMocks();
		Container.reset();
		mockInstance(InstanceSettings, { encryptionKey, n8nFolder });
		(existsSync as Mock).mockReturnValue(false);
	});

	it('should use default values when no env variables are defined', () => {
		const config = Container.get(BinaryDataConfig);

		expect(config.availableModes).toEqual(['filesystem', 's3', 'database']);
		expect(config.mode).toBe('filesystem');
		expect(config.localStoragePath).toBe('/test/n8n/storage');
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

	describe('dbMaxFileSize', () => {
		it('should coerce string env variable to number', () => {
			process.env.N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE = '1024';

			const config = Container.get(BinaryDataConfig);

			expect(config.dbMaxFileSize).toBe(1024);
		});

		it('should use default value when env variable is not set', () => {
			const config = Container.get(BinaryDataConfig);

			expect(config.dbMaxFileSize).toBe(512);
		});

		it('should fallback to default for invalid value', () => {
			process.env.N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE = 'not-a-number';

			const config = Container.get(BinaryDataConfig);

			expect(config.dbMaxFileSize).toBe(512);
			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining('Invalid value for N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE'),
			);
		});

		it('should fallback to default when value exceeds maximum', () => {
			process.env.N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE = '2048';

			const config = Container.get(BinaryDataConfig);

			expect(config.dbMaxFileSize).toBe(512);
			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining('Invalid value for N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE'),
			);
		});
	});

	describe('initialize()', () => {
		const makeRepo = () =>
			({
				findActiveSigningSecret: vi.fn(),
				seedSigningSecret: vi.fn().mockResolvedValue(undefined),
			}) as {
				findActiveSigningSecret: Mock;
				seedSigningSecret: Mock;
			};

		afterEach(() => {
			delete process.env.N8N_BINARY_DATA_SIGNING_SECRET;
		});

		it('should return early when N8N_BINARY_DATA_SIGNING_SECRET env var is set', async () => {
			process.env.N8N_BINARY_DATA_SIGNING_SECRET = 'env-pinned-secret';
			const repo = makeRepo();
			const config = Container.get(BinaryDataConfig);

			await config.initialize(repo);

			expect(repo.findActiveSigningSecret).not.toHaveBeenCalled();
			expect(repo.seedSigningSecret).not.toHaveBeenCalled();
		});

		it('should use the value from the active DB row when one exists', async () => {
			const repo = makeRepo();
			repo.findActiveSigningSecret.mockResolvedValue('db-stored-secret');
			const config = Container.get(BinaryDataConfig);

			await config.initialize(repo);

			expect(config.signingSecret).toEqual('db-stored-secret');
			// Server processes may upgrade a row still in the pre-wrap form.
			expect(repo.findActiveSigningSecret).toHaveBeenCalledWith('signing.binary_data', {
				rewrapLegacy: true,
			});
			expect(repo.seedSigningSecret).not.toHaveBeenCalled();
		});

		it('should persist the derived signing secret when no active DB row exists', async () => {
			const repo = makeRepo();
			repo.findActiveSigningSecret.mockResolvedValue(null);
			const config = Container.get(BinaryDataConfig);
			const derivedSecret = config.signingSecret;

			await config.initialize(repo);

			expect(repo.seedSigningSecret).toHaveBeenCalledWith('signing.binary_data', derivedSecret);
			expect(config.signingSecret).toEqual(derivedSecret);
		});

		it('should use the winner row when a concurrent insert is ignored', async () => {
			const repo = makeRepo();
			repo.findActiveSigningSecret
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce('winner-secret');
			repo.seedSigningSecret.mockResolvedValue(undefined);
			const config = Container.get(BinaryDataConfig);

			await config.initialize(repo);

			expect(config.signingSecret).toEqual('winner-secret');
		});
	});
});
