import { Logger } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type { SettingsRepository, User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import { UserError } from 'n8n-workflow';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { EventService } from '@/events/event.service';
import type { AiService } from '@/services/ai.service';
import type { UserService } from '@/services/user.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';

import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { SUPPORTED_INSTANCE_AI_PROXY_PROVIDERS } from '../instance-ai-proxy-providers';

describe('InstanceAiSettingsService', () => {
	const globalConfig = mock<{
		instanceAi: InstanceAiConfig;
		deployment: { type: string };
	}>({
		instanceAi: {
			model: 'openai/gpt-5.5',
			modelUrl: '',
			modelApiKey: '',
			observerMessageTokens: 30_000,
			reflectorObservationTokens: 40_000,
			mcpServers: '',
			sandboxEnabled: false,
			sandboxProvider: 'n8n-sandbox',
			sandboxImage: '',
			sandboxTimeout: 60,
			n8nSandboxServiceUrl: 'http://sandbox-api:8080',
			n8nSandboxServiceApiKey: '',
			localGatewayDisabled: false,
		} as unknown as InstanceAiConfig,
		deployment: { type: 'default' },
	});
	const settingsRepository = mock<SettingsRepository>();
	const userRepository = mock<UserRepository>();
	const userService = mock<UserService>();
	const aiService = mock<AiService>();
	const credentialsService = mock<CredentialsService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const eventService = mock<EventService>();

	let service: InstanceAiSettingsService;

	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(globalConfig.instanceAi, {
			model: 'openai/gpt-5.5',
			modelUrl: '',
			modelApiKey: '',
			sandboxEnabled: false,
			sandboxProvider: 'n8n-sandbox',
			n8nSandboxServiceUrl: 'http://sandbox-api:8080',
			n8nSandboxServiceApiKey: '',
			mcpServers: '',
			browserMcp: false,
		});
		globalConfig.deployment.type = 'default';
		service = new InstanceAiSettingsService(
			globalConfig as never,
			settingsRepository,
			userRepository,
			userService,
			aiService,
			credentialsService,
			credentialsFinderService,
			eventService,
		);
	});

	describe('resolveProxyModelParts', () => {
		it.each(SUPPORTED_INSTANCE_AI_PROXY_PROVIDERS)(
			'should parse %s proxy model IDs',
			(provider) => {
				const modelName = provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-5.5';
				globalConfig.instanceAi.model = `${provider}/${modelName}`;

				expect(service.resolveProxyModelParts()).toEqual({
					provider,
					modelName,
					modelId: `${provider}/${modelName}`,
				});
			},
		);

		it('should reject model IDs without a provider prefix', () => {
			globalConfig.instanceAi.model = 'gpt-5.5';

			expect(() => service.resolveProxyModelParts()).toThrow(UserError);
			expect(() => service.resolveProxyModelParts()).toThrow(/Expected one of:/);
		});

		it('should reject empty model names', () => {
			globalConfig.instanceAi.model = 'openai/';

			expect(() => service.resolveProxyModelParts()).toThrow(UserError);
		});

		it('should reject unsupported proxy model providers', () => {
			globalConfig.instanceAi.model = 'google/gemini-2.5-pro';

			expect(() => service.resolveProxyModelParts()).toThrow(UserError);
			expect(() => service.resolveProxyModelParts()).toThrow(
				/Supported providers: anthropic, openai/,
			);
		});

		it('should reject inherited object property names as proxy model providers', () => {
			globalConfig.instanceAi.model = 'toString/gpt-5.5';

			expect(() => service.resolveProxyModelParts()).toThrow(UserError);
			expect(() => service.resolveProxyModelParts()).toThrow(
				/Unsupported Instance AI proxy model provider "toString"/,
			);
		});
	});

	describe('updateAdminSettings', () => {
		it('should reject with 422 when the request contains env-managed admin fields', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(
				service.updateAdminSettings({
					sandboxEnabled: true,
				}),
			).rejects.toThrow(UnprocessableRequestError);
		});

		it('should include offending field names in the error message', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(
				service.updateAdminSettings({
					sandboxEnabled: true,
					daytonaCredentialId: 'cred-1',
				}),
			).rejects.toThrow(/sandboxEnabled.*daytonaCredentialId|daytonaCredentialId.*sandboxEnabled/);
		});

		it('should reject sandbox, search and advanced fields on self-hosted', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(service.updateAdminSettings({ sandboxEnabled: true })).rejects.toThrow(
				UnprocessableRequestError,
			);
			await expect(service.updateAdminSettings({ searchCredentialId: 'cred-1' })).rejects.toThrow(
				UnprocessableRequestError,
			);
			await expect(service.updateAdminSettings({ mcpServers: '[]' })).rejects.toThrow(
				UnprocessableRequestError,
			);
		});

		it('should reject env-managed fields even when proxy is enabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

			await expect(service.updateAdminSettings({ mcpServers: '[]' })).rejects.toThrow(
				UnprocessableRequestError,
			);
		});

		it('should allow the enable toggle and permissions', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);

			await expect(service.updateAdminSettings({ enabled: true })).resolves.toBeDefined();
			await expect(
				service.updateAdminSettings({ permissions: { createWorkflow: 'always_allow' } }),
			).resolves.toBeDefined();
		});

		it('should allow unrelated admin updates when existing n8n sandbox URL is missing', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);
			globalConfig.instanceAi.sandboxEnabled = true;
			globalConfig.instanceAi.sandboxProvider = 'n8n-sandbox';
			globalConfig.instanceAi.n8nSandboxServiceUrl = '';

			await expect(
				service.updateAdminSettings({ localGatewayDisabled: true }),
			).resolves.toMatchObject({
				localGatewayDisabled: true,
			});
		});

		it('should expose workflow builder as unavailable when n8n sandbox URL is missing', () => {
			globalConfig.instanceAi.sandboxEnabled = true;
			globalConfig.instanceAi.sandboxProvider = 'n8n-sandbox';
			globalConfig.instanceAi.n8nSandboxServiceUrl = '';

			expect(service.getSandboxStatus()).toEqual({
				enabled: true,
				provider: 'n8n-sandbox',
				workflowBuilderAvailable: false,
				unavailableReason:
					'N8N_SANDBOX_SERVICE_URL is required when Instance AI sandbox provider is n8n-sandbox.',
			});
		});
	});

	describe('mcpAccessEnabled', () => {
		beforeEach(() => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);
		});

		it('defaults to true', () => {
			expect(service.getAdminSettings().mcpAccessEnabled).toBe(true);
			expect(service.isMcpAccessEnabled()).toBe(true);
		});

		it('isMcpAccessEnabled reflects an update', async () => {
			await service.updateAdminSettings({ mcpAccessEnabled: false });

			expect(service.isMcpAccessEnabled()).toBe(false);
		});

		it('applies a persisted value when loading from the database', async () => {
			const logger = mock<Logger>();
			logger.scoped.mockReturnValue(logger);
			Container.set(Logger, logger);
			settingsRepository.findByKey.mockResolvedValue({
				key: 'instanceAi.settings',
				value: JSON.stringify({ mcpAccessEnabled: false }),
				loadOnStartup: true,
			} as never);

			await service.loadFromDb();

			expect(service.isMcpAccessEnabled()).toBe(false);
		});

		it('round-trips an update through getAdminSettings and persists it', async () => {
			const result = await service.updateAdminSettings({ mcpAccessEnabled: false });

			expect(result.mcpAccessEnabled).toBe(false);
			expect(service.getAdminSettings().mcpAccessEnabled).toBe(false);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					value: expect.stringContaining('"mcpAccessEnabled":false'),
				}),
				['key'],
			);
		});
	});

	describe('executeMcpTool permission', () => {
		beforeEach(() => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);
		});

		it('defaults to require_approval', () => {
			expect(service.getAdminSettings().permissions.executeMcpTool).toBe('require_approval');
		});

		it('persists and reflects an update', async () => {
			const result = await service.updateAdminSettings({
				permissions: { executeMcpTool: 'always_allow' },
			});

			expect(result.permissions.executeMcpTool).toBe('always_allow');
			expect(service.getAdminSettings().permissions.executeMcpTool).toBe('always_allow');
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					value: expect.stringContaining('"executeMcpTool":"always_allow"'),
				}),
				['key'],
			);
		});
	});

	describe('instance-ai-settings-updated event', () => {
		beforeEach(() => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);
		});

		it('emits on every successful update', async () => {
			await service.updateAdminSettings({ mcpAccessEnabled: false });

			expect(eventService.emit).toHaveBeenCalledWith(
				'instance-ai-settings-updated',
				expect.any(Object),
			);
		});

		it('does not flag mcpSettingsChanged for unrelated field changes', async () => {
			await service.updateAdminSettings({ permissions: { createWorkflow: 'always_allow' } });

			expect(eventService.emit).toHaveBeenCalledWith('instance-ai-settings-updated', {
				mcpSettingsChanged: false,
			});
		});

		it('flags mcpSettingsChanged when mcpAccessEnabled changes', async () => {
			await service.updateAdminSettings({ mcpAccessEnabled: false });

			expect(eventService.emit).toHaveBeenCalledWith('instance-ai-settings-updated', {
				mcpSettingsChanged: true,
			});
		});

		it('does not flag mcpSettingsChanged when mcpAccessEnabled is set to the same value', async () => {
			await service.updateAdminSettings({ mcpAccessEnabled: true });

			expect(eventService.emit).toHaveBeenCalledWith('instance-ai-settings-updated', {
				mcpSettingsChanged: false,
			});
		});
	});

	describe('updateUserPreferences', () => {
		const user = mock<User>({ id: 'user-1' });

		it('should reject env-managed preference fields on self-hosted', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(service.updateUserPreferences(user, { credentialId: 'cred-1' })).rejects.toThrow(
				UnprocessableRequestError,
			);
			await expect(service.updateUserPreferences(user, { modelName: 'gpt-4' })).rejects.toThrow(
				UnprocessableRequestError,
			);
		});

		it('should include offending field names in the error message', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(
				service.updateUserPreferences(user, {
					credentialId: 'cred-1',
					modelName: 'gpt-5.5',
				}),
			).rejects.toThrow(/credentialId.*modelName|modelName.*credentialId/);
		});

		it('should allow localGatewayDisabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(
				service.updateUserPreferences(user, { localGatewayDisabled: true }),
			).resolves.toBeDefined();

			expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
				instanceAi: { localGatewayDisabled: true },
			});
		});

		it('should merge new preference fields with existing instanceAi settings on update', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			const existingUser = mock<User>({
				id: 'user-2',
				settings: { instanceAi: { credentialId: 'cred-old', modelName: 'gpt-3.5' } },
			});

			await service.updateUserPreferences(existingUser, { localGatewayDisabled: true });

			expect(userService.updateSettings).toHaveBeenCalledWith('user-2', {
				instanceAi: { credentialId: 'cred-old', modelName: 'gpt-3.5', localGatewayDisabled: true },
			});
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
			it('should reject advanced fields on cloud', async () => {
				await expect(service.updateAdminSettings({ mcpServers: '[]' })).rejects.toThrow(
					UnprocessableRequestError,
				);
			});

			it('should reject sandbox fields on cloud', async () => {
				await expect(service.updateAdminSettings({ sandboxEnabled: true })).rejects.toThrow(
					UnprocessableRequestError,
				);
			});

			it('should include cloud-managed label in error message', async () => {
				await expect(service.updateAdminSettings({ mcpServers: '[]' })).rejects.toThrow(
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
				await expect(service.updateUserPreferences(user, { modelName: 'gpt-5.5' })).rejects.toThrow(
					UnprocessableRequestError,
				);
			});

			it('should allow localGatewayDisabled on cloud', async () => {
				await expect(
					service.updateUserPreferences(user, { localGatewayDisabled: true }),
				).resolves.toBeDefined();

				expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
					instanceAi: { localGatewayDisabled: true },
				});
			});
		});
	});
});
