import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { McpSettingsService } from '../mcp.settings.service';

describe('McpSettingsService', () => {
	let service: McpSettingsService;
	let findByKey: jest.Mock<Promise<Settings | null>, [string]>;
	let upsert: jest.Mock;
	let settingsRepository: SettingsRepository;
	const cacheService = mock<CacheService>();

	beforeEach(() => {
		jest.clearAllMocks();
		findByKey = jest.fn<Promise<Settings | null>, [string]>();
		upsert = jest.fn();
		settingsRepository = { findByKey, upsert } as unknown as SettingsRepository;

		service = new McpSettingsService(settingsRepository, cacheService);
	});

	describe('getEnabled', () => {
		test('returns false by default when no setting exists', async () => {
			findByKey.mockResolvedValue(null);

			await expect(service.getEnabled()).resolves.toBe(false);
			expect(findByKey).toHaveBeenCalledWith('mcp.access.enabled');
		});

		test('returns true when setting value is "true"', async () => {
			findByKey.mockResolvedValue(
				mock<Settings>({ key: 'mcp.access.enabled', value: 'true', loadOnStartup: true }),
			);

			await expect(service.getEnabled()).resolves.toBe(true);
		});

		test('returns false when setting value is "false"', async () => {
			findByKey.mockResolvedValue(
				mock<Settings>({ key: 'mcp.access.enabled', value: 'false', loadOnStartup: true }),
			);

			await expect(service.getEnabled()).resolves.toBe(false);
		});
	});

	describe('setEnabled', () => {
		test('upserts setting with "true"', async () => {
			await service.setEnabled(true);

			expect(upsert).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled', value: 'true', loadOnStartup: true },
				['key'],
			);
		});

		test('upserts setting with "false"', async () => {
			await service.setEnabled(false);

			expect(upsert).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled', value: 'false', loadOnStartup: true },
				['key'],
			);
		});
	});
});
