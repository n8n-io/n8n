import type { ChatProviderSettingsDto } from '@n8n/api-types';
import type { Settings, SettingsRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ChatHubSettingsService } from '../chat-hub.settings.service';

describe('ChatHubSettingsService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const service = new ChatHubSettingsService(settingsRepository);
	const mockTrx = mock<EntityManager>();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('ensureModelIsAllowed', () => {
		it('should allow custom-agent models without checking settings', async () => {
			await service.ensureModelIsAllowed({ provider: 'custom-agent', agentId: 'agent-1' });

			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should allow n8n models without checking settings', async () => {
			await service.ensureModelIsAllowed({ provider: 'n8n', workflowId: 'any-workflow' });

			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should pass the transaction to findByKey', async () => {
			settingsRepository.findByKey.mockResolvedValueOnce(null);

			await service.ensureModelIsAllowed({ provider: 'openai', model: 'gpt-4' }, mockTrx);

			expect(settingsRepository.findByKey).toHaveBeenCalledWith('chat.provider.openai', mockTrx);
		});

		it('should not pass transaction when none is provided', async () => {
			settingsRepository.findByKey.mockResolvedValueOnce(null);

			await service.ensureModelIsAllowed({ provider: 'openai', model: 'gpt-4' });

			expect(settingsRepository.findByKey).toHaveBeenCalledWith('chat.provider.openai', undefined);
		});

		it('should throw when provider is not enabled', async () => {
			const settings: ChatProviderSettingsDto = {
				provider: 'openai',
				credentialId: null,
				allowedModels: [],
				createdAt: new Date().toISOString(),
				updatedAt: null,
				enabled: false,
			};
			settingsRepository.findByKey.mockResolvedValueOnce({
				key: 'chat.provider.openai',
				value: JSON.stringify(settings),
			} as Settings);

			await expect(
				service.ensureModelIsAllowed({ provider: 'openai', model: 'gpt-4' }),
			).rejects.toThrow(BadRequestError);
		});

		it('should throw when model is not in the allowed list', async () => {
			const settings: ChatProviderSettingsDto = {
				provider: 'openai',
				credentialId: null,
				allowedModels: [{ displayName: 'GPT-3.5', model: 'gpt-3.5-turbo' }],
				createdAt: new Date().toISOString(),
				updatedAt: null,
				enabled: true,
			};
			settingsRepository.findByKey.mockResolvedValueOnce({
				key: 'chat.provider.openai',
				value: JSON.stringify(settings),
			} as Settings);

			await expect(
				service.ensureModelIsAllowed({ provider: 'openai', model: 'gpt-4' }),
			).rejects.toThrow(BadRequestError);
		});

		it('should allow any model when allowedModels is empty (default)', async () => {
			settingsRepository.findByKey.mockResolvedValueOnce(null);

			await expect(
				service.ensureModelIsAllowed({ provider: 'openai', model: 'gpt-4' }),
			).resolves.toBeUndefined();
		});

		it('should allow model when it is in the allowed list', async () => {
			const settings: ChatProviderSettingsDto = {
				provider: 'openai',
				credentialId: null,
				allowedModels: [
					{ displayName: 'GPT-4', model: 'gpt-4' },
					{ displayName: 'GPT-3.5', model: 'gpt-3.5-turbo' },
				],
				createdAt: new Date().toISOString(),
				updatedAt: null,
				enabled: true,
			};
			settingsRepository.findByKey.mockResolvedValueOnce({
				key: 'chat.provider.openai',
				value: JSON.stringify(settings),
			} as Settings);

			await expect(
				service.ensureModelIsAllowed({ provider: 'openai', model: 'gpt-4' }),
			).resolves.toBeUndefined();
		});
	});

	describe('getProviderSettings', () => {
		it('should return default settings when no settings exist', async () => {
			settingsRepository.findByKey.mockResolvedValueOnce(null);

			const result = await service.getProviderSettings('openai');

			expect(result).toMatchObject({
				provider: 'openai',
				credentialId: null,
				allowedModels: [],
				enabled: true,
			});
		});

		it('should pass the transaction to findByKey', async () => {
			settingsRepository.findByKey.mockResolvedValueOnce(null);

			await service.getProviderSettings('anthropic', mockTrx);

			expect(settingsRepository.findByKey).toHaveBeenCalledWith('chat.provider.anthropic', mockTrx);
		});

		it('should parse and return persisted settings', async () => {
			const settings: ChatProviderSettingsDto = {
				provider: 'openai',
				credentialId: 'cred-123',
				allowedModels: [{ displayName: 'GPT-4', model: 'gpt-4' }],
				createdAt: '2025-01-01T00:00:00.000Z',
				updatedAt: '2025-01-02T00:00:00.000Z',
				enabled: true,
			};
			settingsRepository.findByKey.mockResolvedValueOnce({
				key: 'chat.provider.openai',
				value: JSON.stringify(settings),
			} as Settings);

			const result = await service.getProviderSettings('openai');

			expect(result).toEqual(settings);
		});

		it('should return default settings when persisted value is invalid JSON', async () => {
			settingsRepository.findByKey.mockResolvedValueOnce({
				key: 'chat.provider.openai',
				value: 'not-valid-json',
			} as Settings);

			const result = await service.getProviderSettings('openai');

			expect(result).toMatchObject({
				provider: 'openai',
				credentialId: null,
				allowedModels: [],
				enabled: true,
			});
		});
	});
});
