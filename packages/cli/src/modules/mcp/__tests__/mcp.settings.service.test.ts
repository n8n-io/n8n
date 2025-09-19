import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { McpSettingsService } from '../mcp.settings.service';

describe('McpSettingsService', () => {
	let service: McpSettingsService;
	let findByKey: jest.Mock<Promise<Settings | null>, [string]>;
	let update: jest.Mock;
	let save: jest.Mock;
	let settingsRepository: SettingsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		findByKey = jest.fn<Promise<Settings | null>, [string]>();
		update = jest.fn();
		save = jest.fn();
		settingsRepository = { findByKey, update, save } as unknown as SettingsRepository;
		service = new McpSettingsService(settingsRepository);
	});

	describe('getEnabled', () => {
		test('returns true by default when no setting exists', async () => {
			findByKey.mockResolvedValue(null);

			await expect(service.getEnabled()).resolves.toBe(true);
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
		test('updates existing setting with "true"', async () => {
			findByKey.mockResolvedValue(
				mock<Settings>({ key: 'mcp.access.enabled', value: 'false', loadOnStartup: true }),
			);

			await service.setEnabled(true);

			expect(update).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled' },
				{ value: 'true', loadOnStartup: true },
			);
			expect(save).not.toHaveBeenCalled();
		});

		test('updates existing setting with "false"', async () => {
			findByKey.mockResolvedValue(
				mock<Settings>({ key: 'mcp.access.enabled', value: 'true', loadOnStartup: true }),
			);

			await service.setEnabled(false);

			expect(update).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled' },
				{ value: 'false', loadOnStartup: true },
			);
			expect(save).not.toHaveBeenCalled();
		});

		test('creates new setting when not existing (enabled)', async () => {
			findByKey.mockResolvedValue(null);

			await service.setEnabled(true);

			expect(save).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled', value: 'true', loadOnStartup: true },
				{ transaction: false },
			);
			expect(update).not.toHaveBeenCalled();
		});

		test('creates new setting when not existing (disabled)', async () => {
			findByKey.mockResolvedValue(null);

			await service.setEnabled(false);

			expect(save).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled', value: 'false', loadOnStartup: true },
				{ transaction: false },
			);
			expect(update).not.toHaveBeenCalled();
		});
	});
});
