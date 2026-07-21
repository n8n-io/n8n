import { Logger } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type {
	CredentialsEntity,
	DbLockService,
	SettingsRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { EventService } from '@/events/event.service';
import type { AiService } from '@/services/ai.service';
import type { UserService } from '@/services/user.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';

import {
	INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
	INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
	INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
	InstanceAiSettingsService,
} from '../instance-ai-settings.service';

describe('InstanceAiSettingsService', () => {
	const globalConfig = mock<{
		instanceAi: InstanceAiConfig;
		deployment: { type: string };
	}>({
		instanceAi: {
			model: 'openai/gpt-4',
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
	const transactionManager = mock<EntityManager>();
	const dbLockService = mock<DbLockService>();
	const settingsRepository = mock<SettingsRepository>();
	const userRepository = mock<UserRepository>();
	const userService = mock<UserService>();
	const aiService = mock<AiService>();
	const credentialsService = mock<CredentialsService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const instanceCredentialBroker = mock<InstanceCredentialBroker>();
	const eventService = mock<EventService>();
	const logger = mock<Logger>();

	let service: InstanceAiSettingsService;

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		Container.set(Logger, logger);
		Object.assign(globalConfig.instanceAi, {
			sandboxEnabled: false,
			sandboxProvider: 'n8n-sandbox',
			n8nSandboxServiceUrl: 'http://sandbox-api:8080',
			n8nSandboxServiceApiKey: '',
			mcpServers: '',
			browserMcp: false,
			braveSearchApiKey: '',
			searxngUrl: '',
			daytonaApiUrl: '',
			daytonaApiKey: '',
		});
		globalConfig.deployment.type = 'default';
		instanceCredentialBroker.listForUse.mockResolvedValue([]);
		instanceCredentialBroker.getAssignedCredentialId.mockResolvedValue(null);
		transactionManager.upsert.mockImplementation(
			async (_entity, value, conflictPaths) =>
				await settingsRepository.upsert(value as never, conflictPaths as never),
		);
		dbLockService.withLock.mockImplementation(async (_lockId, fn) => {
			return await (fn as (manager: EntityManager) => Promise<unknown>)(transactionManager);
		});
		service = new InstanceAiSettingsService(
			globalConfig as never,
			dbLockService,
			settingsRepository,
			userRepository,
			userService,
			aiService,
			credentialsService,
			credentialsFinderService,
			instanceCredentialBroker,
			eventService,
		);
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
					mcpServers: '[]',
				}),
			).rejects.toThrow(/sandboxEnabled.*mcpServers|mcpServers.*sandboxEnabled/);
		});

		it('should reject environment-managed fields on self-hosted', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(service.updateAdminSettings({ sandboxEnabled: true })).rejects.toThrow(
				UnprocessableRequestError,
			);
			await expect(service.updateAdminSettings({ mcpServers: '[]' })).rejects.toThrow(
				UnprocessableRequestError,
			);
		});

		it('should store service credential selections as broker assignments', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await service.updateAdminSettings({
				daytonaCredentialId: 'daytona-cred',
				n8nSandboxCredentialId: 'sandbox-cred',
				searchCredentialId: 'search-cred',
			});

			expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
				INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
				'daytona-cred',
				transactionManager,
			);
			expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
				INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
				'sandbox-cred',
				transactionManager,
			);
			expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
				INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
				'search-cred',
				transactionManager,
			);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ value: expect.not.stringContaining('CredentialId') }),
				['key'],
			);
		});

		it('should clear a service credential assignment', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await service.updateAdminSettings({ searchCredentialId: null });

			expect(instanceCredentialBroker.clearForUse).toHaveBeenCalledWith(
				INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
				transactionManager,
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

		it('defaults to true', async () => {
			expect((await service.getAdminSettings()).mcpAccessEnabled).toBe(true);
			expect(service.isMcpAccessEnabled()).toBe(true);
		});

		it('isMcpAccessEnabled reflects an update', async () => {
			await service.updateAdminSettings({ mcpAccessEnabled: false });

			expect(service.isMcpAccessEnabled()).toBe(false);
		});

		it('applies a persisted value when loading from the database', async () => {
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
			expect((await service.getAdminSettings()).mcpAccessEnabled).toBe(false);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					value: expect.stringContaining('"mcpAccessEnabled":false'),
				}),
				['key'],
			);
		});

		it('merges an update with the latest persisted settings', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				key: 'instanceAi.settings',
				value: JSON.stringify({ mcpAccessEnabled: false }),
				loadOnStartup: true,
			} as never);

			await service.updateAdminSettings({ permissions: { createWorkflow: 'always_allow' } });

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					value: expect.stringContaining('"mcpAccessEnabled":false'),
				}),
				['key'],
			);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					value: expect.stringContaining('"createWorkflow":"always_allow"'),
				}),
				['key'],
			);
		});

		it('does not apply an update when persistence fails', async () => {
			settingsRepository.upsert.mockRejectedValue(new Error('write failed'));

			await expect(service.updateAdminSettings({ mcpAccessEnabled: false })).rejects.toThrow(
				'write failed',
			);

			expect((await service.getAdminSettings()).mcpAccessEnabled).toBe(true);
		});
	});

	describe('instance model credential', () => {
		beforeEach(() => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);
		});

		it('delegates model credential validation to the broker', async () => {
			instanceCredentialBroker.assignForUse.mockRejectedValue(
				new UnprocessableRequestError('Invalid instance credential'),
			);

			await expect(service.updateAdminSettings({ modelCredentialId: 'cred-1' })).rejects.toThrow(
				'Invalid instance credential',
			);
			expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'instance-ai:model' }),
				'cred-1',
				transactionManager,
			);
		});

		it('uses the admin credential before per-user credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: 'cred-1',
				name: 'Admin model',
				type: 'openAiApi',
				availability: 'instance',
			});
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				data: { apiKey: 'admin-key' },
			});
			instanceCredentialBroker.assignForUse.mockResolvedValue({
				id: credential.id,
				name: credential.name,
				type: credential.type,
			});

			await service.updateAdminSettings({ modelCredentialId: credential.id });
			const result = await service.resolveModelConfig(
				mock<User>({
					settings: {
						instanceAi: { credentialId: 'user-credential', modelName: 'gpt-4.1' },
					},
				}),
			);

			expect(result).toEqual({ id: 'openai/gpt-4.1', url: '', apiKey: 'admin-key' });
			expect(instanceCredentialBroker.resolveForUse).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'instance-ai:model' }),
			);
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ value: expect.not.stringContaining('modelCredentialId') }),
				['key'],
			);
		});

		it('falls back to the user credential when the admin credential data is incomplete', async () => {
			instanceCredentialBroker.assignForUse.mockResolvedValue({
				id: 'admin-credential',
				name: 'Admin model',
				type: 'openAiApi',
			});
			await service.updateAdminSettings({ modelCredentialId: 'admin-credential' });
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'admin-credential',
				name: 'Admin model',
				type: 'openAiApi',
				data: {},
			});
			credentialsFinderService.findCredentialForUser.mockResolvedValue(
				mock<CredentialsEntity>({ id: 'user-credential', type: 'openAiApi' }),
			);
			credentialsService.decrypt.mockResolvedValue({ apiKey: 'user-key' });

			await expect(
				service.resolveModelConfig(
					mock<User>({
						settings: {
							instanceAi: { credentialId: 'user-credential', modelName: 'gpt-user' },
						},
					}),
				),
			).resolves.toEqual({ id: 'openai/gpt-user', url: '', apiKey: 'user-key' });
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not resolve the configured model credential; using environment fallback',
				{
					credentialUseId: 'instance-ai:model',
					error: 'Credential data is incomplete',
				},
			);
		});

		it('reads the configured model credential from the broker', async () => {
			instanceCredentialBroker.getAssignedCredentialId.mockResolvedValue('cred-1');

			await expect(service.getAdminSettings()).resolves.toMatchObject({
				modelCredentialId: 'cred-1',
			});
		});

		it('ignores a configured admin credential on cloud', async () => {
			const credential = mock<CredentialsEntity>({
				id: 'cred-1',
				name: 'Admin model',
				type: 'openAiApi',
				availability: 'instance',
			});
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				data: { apiKey: 'admin-key' },
			});
			instanceCredentialBroker.assignForUse.mockResolvedValue({
				id: credential.id,
				name: credential.name,
				type: credential.type,
			});
			await service.updateAdminSettings({ modelCredentialId: credential.id });
			vi.clearAllMocks();
			globalConfig.deployment.type = 'cloud';

			await expect(service.resolveModelConfig(mock<User>())).resolves.toBe('openai/gpt-4');
			expect(instanceCredentialBroker.resolveForUse).not.toHaveBeenCalled();
			await expect(service.listInstanceModelCredentials()).resolves.toEqual([]);
		});
	});

	describe('search credential', () => {
		it('falls back to environment config when the selected credential cannot be resolved', async () => {
			globalConfig.instanceAi.braveSearchApiKey = 'env-key';
			globalConfig.instanceAi.searxngUrl = 'https://search.example.com';
			instanceCredentialBroker.resolveForUse.mockRejectedValue(new Error('not found'));

			await expect(service.resolveSearchConfig()).resolves.toEqual({
				braveApiKey: 'env-key',
				searxngUrl: 'https://search.example.com',
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not resolve the configured search credential; using environment fallback',
				{ credentialUseId: 'instance-ai:search', error: 'not found' },
			);
		});

		it('falls back to environment config when resolved credential data is incomplete', async () => {
			globalConfig.instanceAi.braveSearchApiKey = 'env-key';
			globalConfig.instanceAi.searxngUrl = 'https://search.example.com';
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'search-credential',
				name: 'Search',
				type: 'braveSearchApi',
				data: {},
			});

			await expect(service.resolveSearchConfig()).resolves.toEqual({
				braveApiKey: 'env-key',
				searxngUrl: 'https://search.example.com',
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not resolve the configured search credential; using environment fallback',
				{
					credentialUseId: 'instance-ai:search',
					error: 'Credential data is incomplete',
				},
			);
		});
	});

	describe('daytona credential', () => {
		it('uses the resolved credential data for the daytona config', async () => {
			globalConfig.instanceAi.daytonaApiUrl = 'https://env.daytona.example.com';
			globalConfig.instanceAi.daytonaApiKey = 'env-key';
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'daytona-credential',
				name: 'Daytona',
				type: 'daytonaApi',
				data: { apiUrl: 'https://daytona.example.com', apiKey: 'credential-key' },
			});

			await expect(service.resolveDaytonaConfig()).resolves.toEqual({
				apiUrl: 'https://daytona.example.com',
				apiKey: 'credential-key',
			});
		});

		it('falls back to environment config when the selected credential cannot be resolved', async () => {
			globalConfig.instanceAi.daytonaApiUrl = 'https://env.daytona.example.com';
			globalConfig.instanceAi.daytonaApiKey = 'env-key';
			instanceCredentialBroker.resolveForUse.mockRejectedValue(new Error('not found'));

			await expect(service.resolveDaytonaConfig()).resolves.toEqual({
				apiUrl: 'https://env.daytona.example.com',
				apiKey: 'env-key',
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not resolve the configured Daytona sandbox credential; using environment fallback',
				{ credentialUseId: 'instance-ai:sandbox:daytona', error: 'not found' },
			);
		});

		it('falls back to environment config when resolved credential data is incomplete', async () => {
			globalConfig.instanceAi.daytonaApiUrl = 'https://env.daytona.example.com';
			globalConfig.instanceAi.daytonaApiKey = 'env-key';
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'daytona-credential',
				name: 'Daytona',
				type: 'daytonaApi',
				data: { apiKey: 'credential-key' },
			});

			await expect(service.resolveDaytonaConfig()).resolves.toEqual({
				apiUrl: 'https://env.daytona.example.com',
				apiKey: 'env-key',
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not resolve the configured Daytona sandbox credential; using environment fallback',
				{ credentialUseId: 'instance-ai:sandbox:daytona', error: 'Credential data is incomplete' },
			);
		});

		it('ignores stored assignments on cloud deployments', async () => {
			globalConfig.deployment.type = 'cloud';
			globalConfig.instanceAi.daytonaApiUrl = 'https://env.daytona.example.com';
			globalConfig.instanceAi.daytonaApiKey = 'env-key';

			await expect(service.resolveDaytonaConfig()).resolves.toEqual({
				apiUrl: 'https://env.daytona.example.com',
				apiKey: 'env-key',
			});
			expect(instanceCredentialBroker.resolveForUse).not.toHaveBeenCalled();
		});
	});

	describe('n8n sandbox credential', () => {
		it('uses the resolved api key with the environment service url', async () => {
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'sandbox-credential',
				name: 'Sandbox',
				type: 'httpHeaderAuth',
				data: { name: 'X-Api-Key', value: 'credential-key' },
			});

			await expect(service.resolveN8nSandboxConfig()).resolves.toEqual({
				serviceUrl: 'http://sandbox-api:8080',
				apiKey: 'credential-key',
			});
		});

		it('falls back to environment config when the credential header is not x-api-key', async () => {
			globalConfig.instanceAi.n8nSandboxServiceApiKey = 'env-key';
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'sandbox-credential',
				name: 'Sandbox',
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: 'credential-key' },
			});

			await expect(service.resolveN8nSandboxConfig()).resolves.toEqual({
				serviceUrl: 'http://sandbox-api:8080',
				apiKey: 'env-key',
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not resolve the configured n8n Sandbox credential; using environment fallback',
				{
					credentialUseId: 'instance-ai:sandbox:n8n',
					error: 'Credential header must be "x-api-key" but is "authorization"',
				},
			);
		});

		it('falls back to environment config when the api key is missing', async () => {
			globalConfig.instanceAi.n8nSandboxServiceApiKey = 'env-key';
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'sandbox-credential',
				name: 'Sandbox',
				type: 'httpHeaderAuth',
				data: { name: 'x-api-key' },
			});

			await expect(service.resolveN8nSandboxConfig()).resolves.toEqual({
				serviceUrl: 'http://sandbox-api:8080',
				apiKey: 'env-key',
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not resolve the configured n8n Sandbox credential; using environment fallback',
				{ credentialUseId: 'instance-ai:sandbox:n8n', error: 'Credential data is incomplete' },
			);
		});
	});

	describe('service credential assignments', () => {
		it('reads service credential selections from broker assignments', async () => {
			const assignments: Record<string, string> = {
				'instance-ai:sandbox:daytona': 'daytona-cred',
				'instance-ai:sandbox:n8n': 'sandbox-cred',
				'instance-ai:search': 'search-cred',
			};
			instanceCredentialBroker.getAssignedCredentialId.mockImplementation(async (credentialUse) => {
				return assignments[credentialUse.id] ?? null;
			});

			await expect(service.getAdminSettings()).resolves.toMatchObject({
				daytonaCredentialId: 'daytona-cred',
				n8nSandboxCredentialId: 'sandbox-cred',
				searchCredentialId: 'search-cred',
			});
		});
	});

	describe('executeMcpTool permission', () => {
		beforeEach(() => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);
		});

		it('defaults to require_approval', async () => {
			expect((await service.getAdminSettings()).permissions.executeMcpTool).toBe(
				'require_approval',
			);
		});

		it('persists and reflects an update', async () => {
			const result = await service.updateAdminSettings({
				permissions: { executeMcpTool: 'always_allow' },
			});

			expect(result.permissions.executeMcpTool).toBe('always_allow');
			expect((await service.getAdminSettings()).permissions.executeMcpTool).toBe('always_allow');
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
					modelName: 'gpt-4',
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
			it('should reject model credentials on cloud', async () => {
				await expect(service.updateAdminSettings({ modelCredentialId: 'cred-1' })).rejects.toThrow(
					UnprocessableRequestError,
				);
			});

			it('should reject service credential assignments on cloud', async () => {
				await expect(service.updateAdminSettings({ searchCredentialId: 'cred-1' })).rejects.toThrow(
					UnprocessableRequestError,
				);
			});

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
				await expect(service.updateUserPreferences(user, { modelName: 'gpt-4' })).rejects.toThrow(
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
