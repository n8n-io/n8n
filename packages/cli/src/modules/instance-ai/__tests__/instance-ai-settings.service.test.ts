import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig, InstanceAiConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

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

	function createService(instanceAi: InstanceAiConfig) {
		const globalConfig = { instanceAi } as GlobalConfig;
		return new InstanceAiSettingsService(
			globalConfig,
			settingsRepository,
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
});
