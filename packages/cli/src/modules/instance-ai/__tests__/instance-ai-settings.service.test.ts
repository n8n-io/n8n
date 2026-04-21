import type { InstanceAiConfig } from '@n8n/config';
import type { SettingsRepository, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { AiService } from '@/services/ai.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';

import { InstanceAiSettingsService } from '../instance-ai-settings.service';

describe('InstanceAiSettingsService', () => {
	const globalConfig = mock<{
		instanceAi: InstanceAiConfig;
		deployment: { type: string };
	}>({
		instanceAi: {
			lastMessages: 10,
			model: 'openai/gpt-4',
			modelUrl: '',
			modelApiKey: '',
			embedderModel: '',
			semanticRecallTopK: 5,
			subAgentMaxSteps: 10,
			browserMcp: false,
			mcpServers: '',
			sandboxEnabled: false,
			sandboxProvider: '',
			sandboxImage: '',
			sandboxTimeout: 60,
			localGatewayDisabled: false,
		} as unknown as InstanceAiConfig,
		deployment: { type: 'default' },
	});
	const settingsRepository = mock<SettingsRepository>();
	const aiService = mock<AiService>();
	const credentialsService = mock<CredentialsService>();
	const credentialsFinderService = mock<CredentialsFinderService>();

	let service: InstanceAiSettingsService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new InstanceAiSettingsService(
			globalConfig as never,
			settingsRepository,
			aiService,
			credentialsService,
			credentialsFinderService,
		);
	});

	describe('updateAdminSettings', () => {
		it('should reject with 422 when proxy is enabled and request contains proxy-managed admin fields', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

			await expect(
				service.updateAdminSettings({
					sandboxEnabled: true,
					lastMessages: 50,
				}),
			).rejects.toThrow(UnprocessableRequestError);
		});

		it('should include offending field names in the error message', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

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

			await expect(service.updateAdminSettings({ lastMessages: 50 })).resolves.toBeDefined();
		});

		it('should allow proxy-managed fields when proxy is disabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);

			await expect(service.updateAdminSettings({ sandboxEnabled: true })).resolves.toBeDefined();
		});
	});

	describe('updateUserPreferences', () => {
		const user = mock<User>({ id: 'user-1' });

		it('should reject with 422 when proxy is enabled and request contains proxy-managed preference fields', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

			await expect(service.updateUserPreferences(user, { credentialId: 'cred-1' })).rejects.toThrow(
				UnprocessableRequestError,
			);
		});

		it('should include offending field names in the error message', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

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

			await expect(
				service.updateUserPreferences(user, { localGatewayDisabled: true }),
			).resolves.toBeDefined();
		});
	});

	describe('cloud-managed fields', () => {
		beforeEach(() => {
			globalConfig.deployment.type = 'cloud';
		});

		afterEach(() => {
			globalConfig.deployment.type = 'default';
		});

		describe('updateAdminSettings', () => {
			it('should reject memory fields on cloud', async () => {
				await expect(service.updateAdminSettings({ lastMessages: 50 })).rejects.toThrow(
					UnprocessableRequestError,
				);
			});

			it('should reject advanced fields on cloud', async () => {
				await expect(service.updateAdminSettings({ subAgentMaxSteps: 50 })).rejects.toThrow(
					UnprocessableRequestError,
				);
			});

			it('should reject sandbox fields on cloud', async () => {
				await expect(service.updateAdminSettings({ sandboxEnabled: true })).rejects.toThrow(
					UnprocessableRequestError,
				);
			});

			it('should include cloud-managed label in error message', async () => {
				await expect(service.updateAdminSettings({ lastMessages: 50 })).rejects.toThrow(
					/cloud-managed/,
				);
			});

			it('should allow enabled toggle on cloud', async () => {
				settingsRepository.upsert.mockResolvedValue(undefined as never);

				await expect(service.updateAdminSettings({ enabled: true })).resolves.toBeDefined();
			});

			it('should allow permissions on cloud', async () => {
				settingsRepository.upsert.mockResolvedValue(undefined as never);

				await expect(
					service.updateAdminSettings({
						permissions: { createWorkflow: 'always_allow' },
					}),
				).resolves.toBeDefined();
			});

			it('should allow localGatewayDisabled on cloud', async () => {
				settingsRepository.upsert.mockResolvedValue(undefined as never);

				await expect(
					service.updateAdminSettings({ localGatewayDisabled: true }),
				).resolves.toBeDefined();
			});
		});

		describe('updateUserPreferences', () => {
			const user = mock<User>({ id: 'user-1' });

			it('should reject credentialId on cloud', async () => {
				await expect(
					service.updateUserPreferences(user, { credentialId: 'cred-1' }),
				).rejects.toThrow(UnprocessableRequestError);
			});

			it('should reject modelName on cloud', async () => {
				await expect(service.updateUserPreferences(user, { modelName: 'gpt-4' })).rejects.toThrow(
					UnprocessableRequestError,
				);
			});

			it('should allow localGatewayDisabled on cloud', async () => {
				settingsRepository.upsert.mockResolvedValue(undefined as never);

				await expect(
					service.updateUserPreferences(user, { localGatewayDisabled: true }),
				).resolves.toBeDefined();
			});
		});
	});
});
