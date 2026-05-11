import { testDb } from '@n8n/backend-test-utils';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

describe('SettingsRepository', () => {
	let settingsRepository: SettingsRepository;

	beforeAll(async () => {
		await testDb.init();
		settingsRepository = Container.get(SettingsRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['Settings']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findByKey()', () => {
		it('should return null when key does not exist', async () => {
			const result = await settingsRepository.findByKey('non.existent.key');

			expect(result).toBeNull();
		});

		it('should return the setting when key exists', async () => {
			await settingsRepository.save({
				key: 'test.find.by.key',
				value: 'found-value',
				loadOnStartup: true,
			});

			const result = await settingsRepository.findByKey('test.find.by.key');

			expect(result).toMatchObject({ key: 'test.find.by.key', value: 'found-value' });
		});

		it('should use the provided EntityManager instead of the default one', async () => {
			await settingsRepository.save({
				key: 'test.find.by.key.em',
				value: 'em-value',
				loadOnStartup: false,
			});

			const dataSource = Container.get(DataSource);
			const em = dataSource.manager;

			const result = await settingsRepository.findByKey('test.find.by.key.em', em);

			expect(result).toMatchObject({ key: 'test.find.by.key.em', value: 'em-value' });
		});

		it('should work inside a transaction', async () => {
			const dataSource = Container.get(DataSource);

			await dataSource.manager.transaction(async (trx) => {
				await trx.save(
					settingsRepository.create({
						key: 'test.trx.key',
						value: 'trx-value',
						loadOnStartup: false,
					}),
				);

				// Should find the row using the same transaction
				const result = await settingsRepository.findByKey('test.trx.key', trx);
				expect(result).toMatchObject({ key: 'test.trx.key', value: 'trx-value' });
			});
		});
	});

	describe('findByKeys()', () => {
		it('should return empty array when given empty keys array', async () => {
			await settingsRepository.save({
				key: 'test:key:1',
				value: 'value1',
				loadOnStartup: false,
			});

			const settings = await settingsRepository.findByKeys([]);

			expect(settings).toEqual([]);
		});

		it('should return empty array when no settings exist for given keys', async () => {
			const settings = await settingsRepository.findByKeys(['non.existent.key']);

			expect(settings).toEqual([]);
		});

		it('should return single setting when one key matches', async () => {
			const saved = await settingsRepository.save({
				key: 'test:key:single',
				value: 'single-value',
				loadOnStartup: true,
			});

			const settings = await settingsRepository.findByKeys(['test:key:single']);

			expect(settings).toHaveLength(1);
			expect(settings[0]).toMatchObject({
				key: saved.key,
				value: saved.value,
				loadOnStartup: saved.loadOnStartup,
			});
		});

		it('should return multiple settings when multiple keys match', async () => {
			const a = await settingsRepository.save({
				key: 'test:key:a',
				value: 'valueA',
				loadOnStartup: false,
			});
			const b = await settingsRepository.save({
				key: 'test:key:b',
				value: 'valueB',
				loadOnStartup: false,
			});
			const c = await settingsRepository.save({
				key: 'test:key:c',
				value: 'valueC',
				loadOnStartup: true,
			});

			const settings = await settingsRepository.findByKeys([
				'test:key:a',
				'test:key:b',
				'test:key:c',
			]);

			expect(settings).toHaveLength(3);
			expect(settings).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ key: a.key, value: a.value }),
					expect.objectContaining({ key: b.key, value: b.value }),
					expect.objectContaining({ key: c.key, value: c.value }),
				]),
			);
		});

		it('should return only existing settings when some keys do not exist', async () => {
			const a = await settingsRepository.save({
				key: 'test:key:exists',
				value: 'exists-value',
				loadOnStartup: false,
			});

			const settings = await settingsRepository.findByKeys([
				'test:key:exists',
				'non.existent.key.1',
				'non.existent.key.2',
			]);

			expect(settings).toHaveLength(1);
			expect(settings[0]).toMatchObject({ key: a.key, value: a.value });
		});

		it('should return each setting only once when keys array contains duplicates', async () => {
			const a = await settingsRepository.save({
				key: 'test:key:dup:a',
				value: 'dupA',
				loadOnStartup: false,
			});
			const b = await settingsRepository.save({
				key: 'test:key:dup:b',
				value: 'dupB',
				loadOnStartup: false,
			});

			const settings = await settingsRepository.findByKeys([
				'test:key:dup:a',
				'test:key:dup:b',
				'test:key:dup:a',
				'test:key:dup:b',
			]);

			expect(settings).toHaveLength(2);
			expect(settings).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ key: a.key }),
					expect.objectContaining({ key: b.key }),
				]),
			);
		});
	});
});
