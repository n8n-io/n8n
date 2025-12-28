import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { mockCipher } from '@test/mocking';

import { EXTERNAL_SECRETS_DB_KEY } from '../constants';
import { ExternalSecretsSettingsStore } from '../settings-store.service';
import type { ExternalSecretsSettings } from '../types';

describe('SettingsStore', () => {
	let store: ExternalSecretsSettingsStore;
	let settingsRepo: jest.Mocked<SettingsRepository>;
	let cipher: ReturnType<typeof mockCipher>;

	const mockSettings: ExternalSecretsSettings = {
		dummy: {
			connected: true,
			connectedAt: new Date('2023-08-01T12:00:00Z'),
			settings: { key: 'value' },
		},
		another: {
			connected: false,
			connectedAt: new Date('2023-08-02T12:00:00Z'),
			settings: { key2: 'value2' },
		},
	};

	beforeEach(() => {
		settingsRepo = mock<SettingsRepository>();
		cipher = mockCipher();
		store = new ExternalSecretsSettingsStore(settingsRepo, cipher);

		// Setup repo to return what was last saved
		let savedValue: string | null = JSON.stringify(mockSettings);
		settingsRepo.upsert.mockImplementation(async (entityOrEntities) => {
			if (!Array.isArray(entityOrEntities)) {
				savedValue = (entityOrEntities as any).value;
			}
			return {} as any;
		});
		settingsRepo.findByKey.mockImplementation(async () => {
			if (savedValue === null) return null;
			return mock<Settings>({ value: savedValue });
		});
	});

	describe('load', () => {
		it('should load settings from database on first call', async () => {
			const result = await store.load();

			expect(result.dummy).toMatchObject({
				connected: true,
				settings: { key: 'value' },
			});
			expect(settingsRepo.findByKey).toHaveBeenCalledWith(EXTERNAL_SECRETS_DB_KEY);
		});

		it('should return cached settings on subsequent calls', async () => {
			await store.load();
			const result = await store.load();

			expect(result.dummy).toMatchObject({
				connected: true,
				settings: { key: 'value' },
			});
			expect(settingsRepo.findByKey).toHaveBeenCalledTimes(1);
		});

		it('should return empty object when no settings exist in database', async () => {
			settingsRepo.findByKey.mockResolvedValue(null);

			const result = await store.load();

			expect(result).toEqual({});
		});

		it('should decrypt settings from database', async () => {
			const encryptedValue = JSON.stringify(mockSettings);
			settingsRepo.findByKey.mockResolvedValue(mock<Settings>({ value: encryptedValue }));

			const decryptSpy = jest.spyOn(cipher, 'decrypt');

			await store.load();

			expect(decryptSpy).toHaveBeenCalledWith(encryptedValue);
		});

		it('should throw error when decryption fails', async () => {
			settingsRepo.findByKey.mockResolvedValue(mock<Settings>({ value: 'invalid-data' }));
			jest.spyOn(cipher, 'decrypt').mockReturnValue('invalid-json');

			await expect(store.load()).rejects.toThrow(
				'External Secrets Settings could not be decrypted',
			);
		});
	});

	describe('reload', () => {
		it('should reload settings from database', async () => {
			const result = await store.reload();

			expect(result.dummy).toMatchObject({
				connected: true,
				settings: { key: 'value' },
			});
			expect(settingsRepo.findByKey).toHaveBeenCalledWith(EXTERNAL_SECRETS_DB_KEY);
		});

		it('should update cache after reload', async () => {
			await store.reload();

			const cached = store.getCached();
			expect(cached.dummy).toMatchObject({
				connected: true,
				settings: { key: 'value' },
			});
		});

		it('should fetch from database even if cache exists', async () => {
			settingsRepo.findByKey.mockResolvedValue(
				mock<Settings>({ value: JSON.stringify(mockSettings) }),
			);

			await store.load(); // Load first time
			settingsRepo.findByKey.mockClear();

			await store.reload();

			expect(settingsRepo.findByKey).toHaveBeenCalledTimes(1);
		});

		it('should return empty object when database returns null', async () => {
			settingsRepo.findByKey.mockResolvedValue(null);

			const result = await store.reload();

			expect(result).toEqual({});
		});
	});

	describe('getCached', () => {
		it('should return cached settings', async () => {
			await store.load();

			const result = store.getCached();

			expect(result.dummy).toMatchObject({
				connected: true,
				settings: { key: 'value' },
			});
		});

		it('should return empty object when cache is not loaded', () => {
			const result = store.getCached();

			expect(result).toEqual({});
		});
	});

	describe('save', () => {
		it('should save settings to database', async () => {
			await store.save(mockSettings);

			expect(settingsRepo.upsert).toHaveBeenCalledWith(
				{
					key: EXTERNAL_SECRETS_DB_KEY,
					value: expect.any(String),
					loadOnStartup: false,
				},
				['key'],
			);
		});

		it('should encrypt settings before saving', async () => {
			const encryptSpy = jest.spyOn(cipher, 'encrypt');

			await store.save(mockSettings);

			expect(encryptSpy).toHaveBeenCalledWith(mockSettings);
		});

		it('should update cache after save', async () => {
			await store.save(mockSettings);

			const cached = store.getCached();
			expect(cached.dummy).toMatchObject({
				connected: true,
				settings: { key: 'value' },
			});
		});

		it('should handle empty settings', async () => {
			await store.save({});

			expect(settingsRepo.upsert).toHaveBeenCalled();
			expect(store.getCached()).toEqual({});
		});
	});

	describe('updateProvider', () => {
		beforeEach(async () => {
			settingsRepo.findByKey.mockResolvedValue(
				mock<Settings>({ value: JSON.stringify(mockSettings) }),
			);
		});

		it('should update existing provider settings', async () => {
			const result = await store.updateProvider('dummy', {
				settings: { key: 'updated-value' },
			});

			expect(result.isNewProvider).toBe(false);
			expect(result.settings.dummy?.settings).toEqual({ key: 'updated-value' });
		});

		it('should add new provider with default values', async () => {
			const result = await store.updateProvider('new-provider', {
				settings: { newKey: 'newValue' },
			});

			expect(result.isNewProvider).toBe(true);
			expect(result.settings['new-provider']).toMatchObject({
				connected: false,
				connectedAt: null,
				settings: { newKey: 'newValue' },
			});
		});

		it('should merge partial settings with existing settings', async () => {
			await store.updateProvider('dummy', { connected: false });

			const provider = await store.getProvider('dummy');

			expect(provider).toMatchObject({
				connected: false,
				settings: { key: 'value' }, // Original settings preserved
			});
			expect(provider?.connectedAt).toBeDefined();
		});

		it('should save updated settings to database', async () => {
			await store.updateProvider('dummy', { settings: { key: 'new-value' } });

			expect(settingsRepo.upsert).toHaveBeenCalled();
		});

		it('should reload settings before updating', async () => {
			await store.updateProvider('dummy', { connected: false });

			expect(settingsRepo.findByKey).toHaveBeenCalled();
		});

		it('should not mutate cache if save fails', async () => {
			// Load initial settings into cache
			await store.load();
			const cachedBefore = store.getCached();
			const initialConnectedValue = cachedBefore.dummy?.connected;

			// Mock save to fail
			settingsRepo.upsert.mockRejectedValueOnce(new Error('Database error'));

			// Attempt to update provider (should fail)
			await expect(
				store.updateProvider('dummy', { connected: !initialConnectedValue }),
			).rejects.toThrow('Database error');

			// Verify cache was not mutated
			const cachedAfter = store.getCached();
			expect(cachedAfter.dummy?.connected).toBe(initialConnectedValue);
		});
	});

	describe('getProvider', () => {
		beforeEach(async () => {
			settingsRepo.findByKey.mockResolvedValue(
				mock<Settings>({ value: JSON.stringify(mockSettings) }),
			);
		});

		it('should return provider settings', async () => {
			const result = await store.getProvider('dummy');

			expect(result).toMatchObject({
				connected: true,
				settings: { key: 'value' },
			});
		});

		it('should return undefined for non-existent provider', async () => {
			const result = await store.getProvider('non-existent');

			expect(result).toBeUndefined();
		});

		it('should load settings if not already loaded', async () => {
			await store.getProvider('dummy');

			expect(settingsRepo.findByKey).toHaveBeenCalledWith(EXTERNAL_SECRETS_DB_KEY);
		});
	});

	describe('removeProvider', () => {
		beforeEach(async () => {
			settingsRepo.findByKey.mockResolvedValue(
				mock<Settings>({ value: JSON.stringify(mockSettings) }),
			);
		});

		it('should remove provider from settings', async () => {
			await store.removeProvider('dummy');

			const provider = await store.getProvider('dummy');
			expect(provider).toBeUndefined();
		});

		it('should save settings after removing provider', async () => {
			await store.removeProvider('dummy');

			expect(settingsRepo.upsert).toHaveBeenCalled();
		});

		it('should handle removing non-existent provider', async () => {
			await expect(store.removeProvider('non-existent')).resolves.not.toThrow();
		});

		it('should preserve other providers when removing one', async () => {
			await store.removeProvider('dummy');

			const another = await store.getProvider('another');
			expect(another).toMatchObject({
				connected: false,
				settings: { key2: 'value2' },
			});
		});

		it('should not mutate cache if save fails', async () => {
			// Load initial settings into cache
			await store.load();
			const cachedBefore = store.getCached();
			expect(cachedBefore.dummy).toBeDefined();

			// Mock save to fail
			settingsRepo.upsert.mockRejectedValueOnce(new Error('Database error'));

			// Attempt to remove provider (should fail)
			await expect(store.removeProvider('dummy')).rejects.toThrow('Database error');

			// Verify cache still has the provider
			const cachedAfter = store.getCached();
			expect(cachedAfter.dummy).toBeDefined();
			expect(cachedAfter.dummy?.connected).toBe(cachedBefore.dummy?.connected);
		});
	});

	describe('integration', () => {
		it('should complete full lifecycle: load -> update -> save -> reload', async () => {
			// Load
			const loaded = await store.load();
			expect(loaded.dummy).toMatchObject({
				connected: true,
				settings: { key: 'value' },
			});

			// Update
			await store.updateProvider('dummy', {
				connected: false,
			});

			// Reload - should get updated value
			const reloaded = await store.reload();
			expect(reloaded.dummy?.connected).toBe(false);
		});

		it('should handle cache invalidation on reload', async () => {
			// Load initial settings
			await store.load();
			let cached = store.getCached();
			expect(cached.dummy?.connected).toBe(true);

			// Reload with different settings
			const updatedSettings = { ...mockSettings };
			updatedSettings.dummy.connected = false;
			settingsRepo.findByKey.mockResolvedValue(
				mock<Settings>({ value: JSON.stringify(updatedSettings) }),
			);

			await store.reload();
			cached = store.getCached();
			expect(cached.dummy?.connected).toBe(false);
		});
	});
});
