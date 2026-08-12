import type { Logger } from '@n8n/backend-common';
import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { KnowledgeSettingsService } from '../knowledge-settings.service';

const SETTINGS_KEY = 'knowledge.settings';

const storedSettings = (value: string) =>
	mock<Settings>({ key: SETTINGS_KEY, value, loadOnStartup: false });

describe('KnowledgeSettingsService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const logger = mock<Logger>();

	let service: KnowledgeSettingsService;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		service = new KnowledgeSettingsService(settingsRepository, logger);
	});

	describe('getSettings', () => {
		test('returns both parts unset when nothing is stored', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await expect(service.getSettings()).resolves.toEqual({
				embedding: null,
				vectorStore: null,
			});
			expect(settingsRepository.findByKey).toHaveBeenCalledWith(SETTINGS_KEY);
		});

		test('returns the stored settings', async () => {
			const settings = {
				embedding: { provider: 'openai', credentialId: 'cred-1', model: 'text-embedding-3-small' },
				vectorStore: { provider: 'qdrant', credentialId: 'cred-2', collectionName: 'docs' },
			};
			settingsRepository.findByKey.mockResolvedValue(storedSettings(JSON.stringify(settings)));

			await expect(service.getSettings()).resolves.toEqual(settings);
		});

		test('falls back to defaults when the stored value does not match the schema', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				storedSettings('{"embedding":{"provider":"cohere"},"vectorStore":null}'),
			);

			await expect(service.getSettings()).resolves.toEqual({
				embedding: null,
				vectorStore: null,
			});
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('updateSettings', () => {
		test('merges the patch into the stored settings and persists it', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				storedSettings(
					JSON.stringify({
						embedding: {
							provider: 'openai',
							credentialId: 'cred-1',
							model: 'text-embedding-3-small',
						},
						vectorStore: null,
					}),
				),
			);

			const updated = await service.updateSettings({
				vectorStore: { provider: 'qdrant', credentialId: 'cred-2' },
			});

			expect(updated).toEqual({
				embedding: { provider: 'openai', credentialId: 'cred-1', model: 'text-embedding-3-small' },
				vectorStore: {
					provider: 'qdrant',
					credentialId: 'cred-2',
					collectionName: 'n8n_knowledge',
				},
			});
			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				SETTINGS_KEY,
				JSON.stringify(updated),
				false,
				{},
			);
		});

		test('clears a part when the patch passes null', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				storedSettings(
					JSON.stringify({
						embedding: {
							provider: 'openai',
							credentialId: 'cred-1',
							model: 'text-embedding-3-small',
						},
						vectorStore: { provider: 'qdrant', credentialId: 'cred-2', collectionName: 'docs' },
					}),
				),
			);

			const updated = await service.updateSettings({ embedding: null });

			expect(updated.embedding).toBeNull();
			expect(updated.vectorStore).toEqual({
				provider: 'qdrant',
				credentialId: 'cred-2',
				collectionName: 'docs',
			});
		});

		test('rejects an invalid patch without persisting', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await expect(
				service.updateSettings({
					embedding: { provider: 'openai', credentialId: '', model: 'text-embedding-3-small' },
				}),
			).rejects.toThrow();
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});
	});

	describe('isConfigured', () => {
		test('is false while only one part is set', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				storedSettings(
					JSON.stringify({
						embedding: {
							provider: 'openai',
							credentialId: 'cred-1',
							model: 'text-embedding-3-small',
						},
						vectorStore: null,
					}),
				),
			);

			await expect(service.isConfigured()).resolves.toBe(false);
		});

		test('is true once both parts are set', async () => {
			settingsRepository.findByKey.mockResolvedValue(
				storedSettings(
					JSON.stringify({
						embedding: {
							provider: 'openai',
							credentialId: 'cred-1',
							model: 'text-embedding-3-small',
						},
						vectorStore: { provider: 'qdrant', credentialId: 'cred-2', collectionName: 'docs' },
					}),
				),
			);

			await expect(service.isConfigured()).resolves.toBe(true);
		});
	});
});
