import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig, InstanceAiConfig } from '@n8n/config';
import type { SettingsRepository, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { AiService } from '@/services/ai.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { ChatHubSettingsService } from '@/modules/chat-hub/chat-hub.settings.service';

import { InstanceAiSettingsService } from '../instance-ai-settings.service';

describe('InstanceAiSettingsService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const credentialsService = mock<CredentialsService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const chatHubSetEnabled = jest.fn();
	const moduleRegistryRefresh = jest.fn();
	const chatHubSettingsService = {
		setEnabled: chatHubSetEnabled,
	} as unknown as ChatHubSettingsService;
	const moduleRegistry = {
		refreshModuleSettings: moduleRegistryRefresh,
	} as unknown as ModuleRegistry;

	function createService(instanceAi: InstanceAiConfig, aiService?: AiService) {
		const globalConfig = { instanceAi } as GlobalConfig;
		return new InstanceAiSettingsService(
			globalConfig,
			settingsRepository,
			aiService ?? mock<AiService>(),
			credentialsService,
			credentialsFinderService,
			chatHubSettingsService,
			moduleRegistry,
		);
	}

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('loadFromDb', () => {
		it('should sync Chat Hub access when no instance AI settings row exists (fresh DB)', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			const instanceAi = { instanceAiEnabled: true } as InstanceAiConfig;
			const service = createService(instanceAi);

			await service.loadFromDb();

			expect(chatHubSetEnabled).toHaveBeenCalledWith(false);
			expect(moduleRegistryRefresh).toHaveBeenCalledWith('chat-hub');
		});

		it('should sync Chat Hub access when persisted settings disable Instance AI', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				key: 'instanceAi.settings',
				value: JSON.stringify({ instanceAiEnabled: false }),
			} as never);

			const instanceAi = { instanceAiEnabled: true } as InstanceAiConfig;
			const service = createService(instanceAi);

			await service.loadFromDb();

			expect(chatHubSetEnabled).toHaveBeenCalledWith(true);
			expect(moduleRegistryRefresh).toHaveBeenCalledWith('chat-hub');
		});
	});

	describe('updateAdminSettings', () => {
		let aiService: ReturnType<typeof mock<AiService>>;

		beforeEach(() => {
			aiService = mock<AiService>();
		});

		it('should reject with 422 when proxy is enabled and request contains proxy-managed admin fields', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

			const instanceAi = {} as InstanceAiConfig;
			const service = createService(instanceAi, aiService);

			await expect(
				service.updateAdminSettings({
					sandboxEnabled: true,
					lastMessages: 50,
				}),
			).rejects.toThrow(UnprocessableRequestError);
		});

		it('should include offending field names in the error message', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

			const instanceAi = {} as InstanceAiConfig;
			const service = createService(instanceAi, aiService);

			await expect(
				service.updateAdminSettings({
					sandboxEnabled: true,
					daytonaCredentialId: 'cred-1',
				}),
			).rejects.toThrow(/sandboxEnabled.*daytonaCredentialId|daytonaCredentialId.*sandboxEnabled/);
		});

		it('should allow non-proxy-managed fields when proxy is enabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			settingsRepository.upsert.mockResolvedValue(undefined as never);

			const instanceAi = {} as InstanceAiConfig;
			const service = createService(instanceAi, aiService);

			await expect(service.updateAdminSettings({ lastMessages: 50 })).resolves.toBeDefined();
		});

		it('should allow proxy-managed fields when proxy is disabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);

			const instanceAi = {} as InstanceAiConfig;
			const service = createService(instanceAi, aiService);

			await expect(service.updateAdminSettings({ sandboxEnabled: true })).resolves.toBeDefined();
		});
	});

	describe('updateUserPreferences', () => {
		const user = mock<User>({ id: 'user-1' });
		let aiService: ReturnType<typeof mock<AiService>>;

		beforeEach(() => {
			aiService = mock<AiService>();
		});

		it('should reject with 422 when proxy is enabled and request contains proxy-managed preference fields', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

			const instanceAi = {} as InstanceAiConfig;
			const service = createService(instanceAi, aiService);

			await expect(service.updateUserPreferences(user, { credentialId: 'cred-1' })).rejects.toThrow(
				UnprocessableRequestError,
			);
		});

		it('should include offending field names in the error message', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

			const instanceAi = {} as InstanceAiConfig;
			const service = createService(instanceAi, aiService);

			await expect(
				service.updateUserPreferences(user, {
					credentialId: 'cred-1',
					modelName: 'gpt-4',
				}),
			).rejects.toThrow(/credentialId.*modelName|modelName.*credentialId/);
		});

		it('should allow non-proxy-managed fields when proxy is enabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			settingsRepository.upsert.mockResolvedValue(undefined as never);

			const instanceAi = {} as InstanceAiConfig;
			const service = createService(instanceAi, aiService);

			await expect(
				service.updateUserPreferences(user, { localGatewayDisabled: true }),
			).resolves.toBeDefined();
		});
	});
});
