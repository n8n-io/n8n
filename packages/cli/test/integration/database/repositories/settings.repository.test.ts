import Container from 'typedi';

import * as testDb from '../../shared/testDb';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { createSettings, getSettingsByKey } from '../../shared/db/settings';

describe('SettingsRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Settings']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('upsert', () => {
		it('should insert a new row if none exists', async () => {
			// Arrange
			const settingsRepository = Container.get(SettingsRepository);

			// Act
			await settingsRepository.upsertByKey({
				key: 'test-key',
				value: 'test-value',
				loadOnStartup: true,
			});

			// Assert
			const after = await getSettingsByKey('test-key');
			expect(after).toEqual({
				key: 'test-key',
				value: 'test-value',
				loadOnStartup: true,
			});
		});

		it('should update the row if one exists', async () => {
			// Arrange
			const settingsRepository = Container.get(SettingsRepository);
			await createSettings({
				key: 'test-key',
				value: '{}',
				loadOnStartup: true,
			});

			// Act
			await settingsRepository.upsertByKey({
				key: 'test-key',
				value: 'test-value',
				loadOnStartup: true,
			});

			// Assert
			const after = await getSettingsByKey('test-key');
			expect(after).toEqual({
				key: 'test-key',
				value: 'test-value',
				loadOnStartup: true,
			});
		});
	});

	describe('dismissBanner', () => {
		it('store the dismissed banner when none are dismissed', async () => {
			// Arrange
			const settingsRepository = Container.get(SettingsRepository);

			// Act
			await settingsRepository.dismissBanner({ bannerName: 'test-banner' });

			// Assert
			const after = await getSettingsByKey('ui.banners.dismissed');
			expect(after).toEqual({
				key: 'ui.banners.dismissed',
				value: '["test-banner"]',
				loadOnStartup: true,
			});
		});

		it('store the dismissed banner when one already is dismissed', async () => {
			// Arrange
			const settingsRepository = Container.get(SettingsRepository);
			await createSettings({
				key: 'ui.banners.dismissed',
				value: '["other-banner"]',
				loadOnStartup: true,
			});

			// Act
			await settingsRepository.dismissBanner({ bannerName: 'test-banner' });

			// Assert
			const after = await getSettingsByKey('ui.banners.dismissed');
			expect(after).toEqual({
				key: 'ui.banners.dismissed',
				value: '["other-banner","test-banner"]',
				loadOnStartup: true,
			});
		});
	});
});
