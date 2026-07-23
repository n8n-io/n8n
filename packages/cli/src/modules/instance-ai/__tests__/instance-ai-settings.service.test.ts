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
import { mock } from 'vitest-mock-extended';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { EventService } from '@/events/event.service';
import type { AiService } from '@/services/ai.service';
import type { UserService } from '@/services/user.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';

import {
	INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
	InstanceAiSettingsService,
} from '../instance-ai-settings.service';

type CredentialOperationContext = NonNullable<
	Parameters<InstanceCredentialBroker['clearForUse']>[1]
>;

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
	const operationContext = mock<CredentialOperationContext>();
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
		credentialsService.getCredentialTypeProperties.mockReturnValue([]);
		credentialsService.unredact.mockImplementation((data) => data);
		credentialsService.runInstanceCredentialHooks.mockImplementation(async (_event, credential) => {
			return {
				id: credential.id ?? '',
				name: credential.name,
				type: credential.type,
				data: 'encrypted',
			} as never;
		});
		settingsRepository.findByKeyInContext.mockImplementation(
			async (key) => await settingsRepository.findByKey(key),
		);
		settingsRepository.upsertByKey.mockImplementation(async (key, value, loadOnStartup) => {
			await settingsRepository.upsert({ key, value, loadOnStartup }, ['key']);
		});
		dbLockService.withLockContext.mockImplementation(async (_lockId, fn) => {
			return await fn(operationContext);
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

	afterEach(() => {
		vi.unstubAllEnvs();
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
				expect.objectContaining({ id: 'instance-ai:sandbox:daytona' }),
				'daytona-cred',
				operationContext,
			);
			expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'instance-ai:sandbox:n8n' }),
				'sandbox-cred',
				operationContext,
			);
			expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'instance-ai:search' }),
				'search-cred',
				operationContext,
			);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ value: expect.not.stringContaining('CredentialId') }),
				['key'],
			);
		});

		it('should persist settings through the transaction context', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);

			await service.updateAdminSettings({ mcpAccessEnabled: false });

			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				'instanceAi.settings',
				expect.any(String),
				true,
				operationContext,
			);
		});

		it('should reject an n8n sandbox credential whose header name is not x-api-key', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'sandbox-cred',
				name: 'Sandbox header',
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: 'secret' },
			});

			await expect(
				service.updateAdminSettings({ n8nSandboxCredentialId: 'sandbox-cred' }),
			).rejects.toThrow(/x-api-key/);
		});

		it('should accept an n8n sandbox credential with the x-api-key header', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'sandbox-cred',
				name: 'Sandbox header',
				type: 'httpHeaderAuth',
				data: { name: 'X-Api-Key', value: 'secret' },
			});

			await expect(
				service.updateAdminSettings({ n8nSandboxCredentialId: 'sandbox-cred' }),
			).resolves.toBeDefined();
		});

		describe('connection payloads', () => {
			const adminUser = mock<User>({
				role: { scopes: [{ slug: 'credential:manageInstance' }] },
			});
			const memberUser = mock<User>({ role: { scopes: [] } });

			beforeEach(() => {
				aiService.isProxyEnabled.mockReturnValue(false);
				settingsRepository.upsert.mockResolvedValue(undefined as never);
			});

			it('should create and assign a credential for a new connection', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue(null);
				credentialsService.createInstanceCredential.mockResolvedValue({ id: 'new-cred' } as never);

				await service.updateAdminSettings(
					{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } }, modelName: 'gpt-5' },
					adminUser,
				);

				expect(credentialsService.createInstanceCredential).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'openAiApi',
						availability: 'instance',
						name: 'AI Assistant model',
					}),
					adminUser,
					operationContext,
					{
						skipExternalHooks: true,
						encryptedData: expect.objectContaining({ data: 'encrypted', type: 'openAiApi' }),
					},
				);
				expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:model' }),
					'new-cred',
					operationContext,
				);
			});

			it('should run external credential hooks before the locked transaction starts', async () => {
				const order: string[] = [];
				credentialsService.runInstanceCredentialHooks.mockImplementation(async () => {
					order.push('hooks');
					return {
						id: '',
						name: 'AI Assistant model',
						type: 'openAiApi',
						data: 'encrypted',
					} as never;
				});
				dbLockService.withLockContext.mockImplementation(async (_lockId, fn) => {
					order.push('transaction');
					return await fn(operationContext);
				});
				instanceCredentialBroker.resolveForUse.mockResolvedValue(null);
				credentialsService.createInstanceCredential.mockResolvedValue({ id: 'new-cred' } as never);

				await service.updateAdminSettings(
					{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } }, modelName: 'gpt-5' },
					adminUser,
				);

				expect(order).toEqual(['hooks', 'transaction']);
				expect(credentialsService.runInstanceCredentialHooks).toHaveBeenCalledWith('create', {
					id: null,
					name: 'AI Assistant model',
					type: 'openAiApi',
					data: { apiKey: 'k' },
				});
			});

			it('should run the update hook when the connection targets the current credential', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue({
					id: 'cred-1',
					name: 'AI Assistant model',
					type: 'openAiApi',
					data: { apiKey: 'k2' },
				});

				await service.updateAdminSettings(
					{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k2' } }, modelName: 'gpt-5' },
					adminUser,
				);

				expect(credentialsService.runInstanceCredentialHooks).toHaveBeenCalledWith('update', {
					id: 'cred-1',
					name: 'AI Assistant model',
					type: 'openAiApi',
					data: { apiKey: 'k2' },
				});
			});

			it('should unredact updates before running credential hooks', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue({
					id: 'cred-1',
					name: 'AI Assistant model',
					type: 'openAiApi',
					data: { apiKey: 'saved-key' },
				});
				credentialsService.unredact.mockReturnValue({ apiKey: 'saved-key' });

				await service.updateAdminSettings(
					{
						modelConnection: { type: 'openAiApi', data: { apiKey: '__redacted__' } },
						modelName: 'gpt-5',
					},
					adminUser,
				);

				expect(credentialsService.unredact).toHaveBeenCalledWith(
					{ apiKey: '__redacted__' },
					{ apiKey: 'saved-key' },
					expect.any(Array),
				);
				expect(credentialsService.runInstanceCredentialHooks).toHaveBeenCalledWith(
					'update',
					expect.objectContaining({ data: { apiKey: 'saved-key' } }),
				);
			});

			it('should reject when the assigned connection changes while its hook runs', async () => {
				instanceCredentialBroker.resolveForUse
					.mockResolvedValueOnce({
						id: 'cred-1',
						name: 'AI Assistant model',
						type: 'openAiApi',
						data: { apiKey: 'k1' },
					})
					.mockResolvedValueOnce({
						id: 'cred-2',
						name: 'AI Assistant model',
						type: 'openAiApi',
						data: { apiKey: 'k2' },
					});

				await expect(
					service.updateAdminSettings(
						{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k3' } }, modelName: 'gpt-5' },
						adminUser,
					),
				).rejects.toThrow('Provider connection changed; retry');
				expect(credentialsService.updateInstanceCredential).not.toHaveBeenCalled();
			});

			it('should reject without starting a transaction when its external hook fails', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue(null);
				credentialsService.createInstanceCredential.mockResolvedValue({ id: 'new-cred' } as never);
				credentialsService.runInstanceCredentialHooks.mockRejectedValue(new Error('hook failed'));

				await expect(
					service.updateAdminSettings(
						{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } }, modelName: 'gpt-5' },
						adminUser,
					),
				).rejects.toThrow('hook failed');
				expect(dbLockService.withLockContext).not.toHaveBeenCalled();
			});

			it('should update the existing credential in place when the type is unchanged', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue({
					id: 'cred-1',
					name: 'AI Assistant model',
					type: 'openAiApi',
					data: { apiKey: 'k2' },
				});
				await service.updateAdminSettings(
					{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k2' } }, modelName: 'gpt-5' },
					adminUser,
				);

				expect(credentialsService.updateInstanceCredential).toHaveBeenCalledWith(
					adminUser,
					'cred-1',
					{
						name: 'AI Assistant model',
						type: 'openAiApi',
						data: { apiKey: 'k2' },
					},
					operationContext,
					{
						skipExternalHooks: true,
						encryptedData: expect.objectContaining({ data: 'encrypted', type: 'openAiApi' }),
					},
				);
				expect(credentialsService.createInstanceCredential).not.toHaveBeenCalled();
				expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:model' }),
					'cred-1',
					operationContext,
				);
			});

			it('should replace the assignment without deleting the reusable old credential', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue({
					id: 'old-cred',
					name: 'AI Assistant model',
					type: 'openAiApi',
					data: { apiKey: 'k' },
				});
				credentialsService.createInstanceCredential.mockResolvedValue({ id: 'new-cred' } as never);

				await service.updateAdminSettings(
					{
						modelConnection: { type: 'anthropicApi', data: { apiKey: 'k' } },
						modelName: 'claude-sonnet-5',
					},
					adminUser,
				);

				expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:model' }),
					'new-cred',
					operationContext,
				);
			});

			it('should switch the sandbox provider and clear the other slot', async () => {
				instanceCredentialBroker.resolveForUse.mockImplementation(async (policy) =>
					policy.id === 'instance-ai:sandbox:n8n'
						? { id: 'old-n8n', name: 'AI Assistant sandbox', type: 'httpHeaderAuth', data: {} }
						: null,
				);
				instanceCredentialBroker.getAssignedCredentialId.mockImplementation(async (policy) =>
					policy.id === 'instance-ai:sandbox:n8n' ? 'old-n8n' : null,
				);
				credentialsService.createInstanceCredential.mockResolvedValue({
					id: 'new-daytona',
				} as never);

				const result = await service.updateAdminSettings(
					{
						sandboxConnection: {
							type: 'daytonaApi',
							data: { apiUrl: 'https://daytona.example.com', apiKey: 'k' },
						},
					},
					adminUser,
				);

				expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:sandbox:daytona' }),
					'new-daytona',
					operationContext,
				);
				expect(instanceCredentialBroker.clearForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:sandbox:n8n' }),
					operationContext,
				);
				expect(result.sandboxProvider).toBe('daytona');
			});

			it('should restore the environment sandbox provider when the connection is cleared', async () => {
				credentialsService.createInstanceCredential.mockResolvedValue({
					id: 'daytona-cred',
				} as never);

				await service.updateAdminSettings(
					{
						sandboxConnection: {
							type: 'daytonaApi',
							data: { apiUrl: 'https://daytona.example.com', apiKey: 'k' },
						},
					},
					adminUser,
				);
				const result = await service.updateAdminSettings({ sandboxConnection: null }, adminUser);

				expect(result.sandboxProvider).toBe('n8n-sandbox');
				expect(settingsRepository.upsert).toHaveBeenLastCalledWith(
					expect.objectContaining({ value: expect.not.stringContaining('sandboxProvider') }),
					['key'],
				);
			});

			it('should reject an n8n sandbox connection with a wrong header name', async () => {
				await expect(
					service.updateAdminSettings(
						{
							sandboxConnection: {
								type: 'httpHeaderAuth',
								data: { name: 'Authorization', value: 'k' },
							},
						},
						adminUser,
					),
				).rejects.toThrow(/x-api-key/);
				expect(credentialsService.createInstanceCredential).not.toHaveBeenCalled();
			});

			it('should clear a connection without resolving or deleting the released credential', async () => {
				instanceCredentialBroker.getAssignedCredentialId.mockImplementation(async (policy) =>
					policy.id === 'instance-ai:search' ? 'old-search' : null,
				);

				await service.updateAdminSettings({ searchConnection: null }, adminUser);

				expect(instanceCredentialBroker.clearForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:search' }),
					operationContext,
				);
				// The clear path never decrypts the outgoing credential.
				expect(instanceCredentialBroker.resolveForUse).not.toHaveBeenCalled();
			});

			it('should clear a connection even when the current assignment cannot be resolved', async () => {
				instanceCredentialBroker.resolveForUse.mockRejectedValue(
					new UnprocessableRequestError('not valid for instance credential use'),
				);
				instanceCredentialBroker.getAssignedCredentialId.mockImplementation(async (policy) =>
					policy.id === 'instance-ai:model' ? 'legacy-model-cred' : null,
				);

				await expect(
					service.updateAdminSettings({ modelConnection: null }, adminUser),
				).resolves.toBeDefined();
				expect(instanceCredentialBroker.clearForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:model' }),
					operationContext,
				);
			});

			it('should replace an unresolvable legacy assignment with a new credential', async () => {
				instanceCredentialBroker.resolveForUse
					.mockRejectedValueOnce(new UnprocessableRequestError('not valid'))
					.mockRejectedValueOnce(new UnprocessableRequestError('not valid'))
					.mockResolvedValue({
						id: 'new-cred',
						name: 'AI Assistant model',
						type: 'openAiApi',
						data: { apiKey: 'k' },
					});
				instanceCredentialBroker.getAssignedCredentialId.mockImplementation(async (policy) =>
					policy.id === 'instance-ai:model' ? 'legacy-model-cred' : null,
				);
				credentialsService.createInstanceCredential.mockResolvedValue({ id: 'new-cred' } as never);

				await expect(
					service.updateAdminSettings(
						{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } }, modelName: 'gpt-5' },
						adminUser,
					),
				).resolves.toBeDefined();
				expect(credentialsService.createInstanceCredential).toHaveBeenCalled();
				expect(credentialsService.updateInstanceCredential).not.toHaveBeenCalled();
			});

			it('should clear both sandbox slots when the sandbox connection is cleared', async () => {
				instanceCredentialBroker.getAssignedCredentialId.mockImplementation(async (policy) =>
					policy.id === 'instance-ai:sandbox:daytona'
						? 'old-daytona'
						: policy.id === 'instance-ai:sandbox:n8n'
							? 'old-n8n'
							: null,
				);

				await service.updateAdminSettings({ sandboxConnection: null }, adminUser);

				expect(instanceCredentialBroker.clearForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:sandbox:daytona' }),
					operationContext,
				);
				expect(instanceCredentialBroker.clearForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:sandbox:n8n' }),
					operationContext,
				);
				expect(instanceCredentialBroker.resolveForUse).not.toHaveBeenCalled();
			});

			it('should reject an inline model connection whose saved data fails validation', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValueOnce(null).mockResolvedValue({
					id: 'new-cred',
					name: 'AI Assistant model',
					type: 'anthropicApi',
					data: {},
				});
				credentialsService.createInstanceCredential.mockResolvedValue({ id: 'new-cred' } as never);

				await expect(
					service.updateAdminSettings(
						{ modelConnection: { type: 'anthropicApi', data: {} }, modelName: 'claude-x' },
						adminUser,
					),
				).rejects.toThrow('The field "apiKey" or "url" is required');
				expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
				expect(credentialsService.runInstanceCredentialHooks).not.toHaveBeenCalled();
			});

			it('should reject an inline model connection without a model name before writing', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue(null);
				credentialsService.createInstanceCredential.mockResolvedValue({ id: 'new-cred' } as never);

				await expect(
					service.updateAdminSettings(
						{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } } },
						adminUser,
					),
				).rejects.toThrow('modelName must be set together with modelCredentialId');
				expect(credentialsService.createInstanceCredential).not.toHaveBeenCalled();
				expect(instanceCredentialBroker.assignForUse).not.toHaveBeenCalled();
				expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
				expect(credentialsService.runInstanceCredentialHooks).not.toHaveBeenCalled();
			});

			it('should reject clearing the model name before running connection hooks', async () => {
				await service.updateAdminSettings({ modelCredentialId: 'cred-1', modelName: 'gpt-5' });
				credentialsService.runInstanceCredentialHooks.mockClear();

				await expect(
					service.updateAdminSettings(
						{
							modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } },
							modelName: null,
						},
						adminUser,
					),
				).rejects.toThrow('modelName must be set together with modelCredentialId');
				expect(credentialsService.runInstanceCredentialHooks).not.toHaveBeenCalled();
			});

			it('should validate sandbox settings before running connection hooks', async () => {
				globalConfig.instanceAi.sandboxEnabled = true;
				globalConfig.instanceAi.n8nSandboxServiceUrl = '';

				await expect(
					service.updateAdminSettings(
						{
							modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } },
							modelName: 'gpt-5',
							sandboxProvider: 'n8n-sandbox',
						},
						adminUser,
					),
				).rejects.toThrow(/N8N_SANDBOX_SERVICE_URL/);
				expect(credentialsService.runInstanceCredentialHooks).not.toHaveBeenCalled();
			});

			it('should allow selecting existing credential ids without the manage scope', async () => {
				await expect(
					service.updateAdminSettings({ searchCredentialId: 'search-cred' }, memberUser),
				).resolves.toBeDefined();
				expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'instance-ai:search' }),
					'search-cred',
					operationContext,
				);
			});

			it('should reject connection payloads without the provider connection scope', async () => {
				await expect(
					service.updateAdminSettings(
						{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } }, modelName: 'gpt-5' },
						memberUser,
					),
				).rejects.toThrow('You do not have permission to manage provider connections');
			});

			it.each(['cloud', 'proxy'] as const)(
				'should reject connection payloads on %s deployments',
				async (deployment) => {
					globalConfig.deployment.type = deployment === 'cloud' ? 'cloud' : 'default';
					aiService.isProxyEnabled.mockReturnValue(deployment === 'proxy');

					await expect(
						service.updateAdminSettings(
							{
								modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } },
								modelName: 'gpt-5',
							},
							adminUser,
						),
					).rejects.toThrow(UnprocessableRequestError);
					expect(credentialsService.runInstanceCredentialHooks).not.toHaveBeenCalled();
				},
			);

			it('should reject a connection payload combined with a credential id', async () => {
				await expect(
					service.updateAdminSettings(
						{
							modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } },
							modelCredentialId: 'cred-1',
							modelName: 'gpt-5',
						},
						adminUser,
					),
				).rejects.toThrow(/Cannot combine/);
			});

			it('should reject an unsupported connection type', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue(null);

				await expect(
					service.updateAdminSettings(
						{ modelConnection: { type: 'slackApi', data: {} }, modelName: 'gpt-5' },
						adminUser,
					),
				).rejects.toThrow(/not supported/);
			});

			it('should stop when the current connection cannot be resolved', async () => {
				instanceCredentialBroker.resolveForUse.mockRejectedValue(new Error('database unavailable'));

				await expect(
					service.updateAdminSettings(
						{ modelConnection: { type: 'openAiApi', data: { apiKey: 'k' } }, modelName: 'gpt-5' },
						adminUser,
					),
				).rejects.toThrow('database unavailable');
				expect(credentialsService.createInstanceCredential).not.toHaveBeenCalled();
			});

			it('should reject incomplete Daytona credentials', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue({
					id: 'daytona-cred',
					name: 'AI Assistant sandbox',
					type: 'daytonaApi',
					data: { apiUrl: 'https://daytona.example.com', apiKey: ' ' },
				});

				await expect(
					service.updateAdminSettings({ daytonaCredentialId: 'daytona-cred' }),
				).rejects.toThrow(/apiKey/);
			});

			it('should reject invalid SearXNG URLs', async () => {
				instanceCredentialBroker.resolveForUse.mockResolvedValue({
					id: 'search-cred',
					name: 'AI Assistant web search',
					type: 'searXngApi',
					data: { apiUrl: 'not-a-url' },
				});

				await expect(
					service.updateAdminSettings({ searchCredentialId: 'search-cred' }),
				).rejects.toThrow(/valid HTTP URL/);
			});
		});

		it('should reject n8n sandbox selection without a service URL', async () => {
			globalConfig.instanceAi.sandboxEnabled = true;
			globalConfig.instanceAi.n8nSandboxServiceUrl = '';

			await expect(
				service.updateAdminSettings({
					n8nSandboxCredentialId: 'sandbox-cred',
					sandboxProvider: 'n8n-sandbox',
				}),
			).rejects.toThrow(/N8N_SANDBOX_SERVICE_URL/);
		});

		it('should not offer Ollama credentials to the unsupported runtime', () => {
			expect(INSTANCE_AI_MODEL_CREDENTIAL_POLICY.credentialTypes).not.toContain('ollamaApi');
		});

		it('should clear a service credential assignment', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await service.updateAdminSettings({ searchCredentialId: null });

			expect(instanceCredentialBroker.clearForUse).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'instance-ai:search' }),
				operationContext,
			);
		});

		it('should reject env-managed fields even when proxy is enabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);

			await expect(service.updateAdminSettings({ mcpServers: '[]' })).rejects.toThrow(
				UnprocessableRequestError,
			);
			await expect(service.updateAdminSettings({ sandboxProvider: 'daytona' })).rejects.toThrow(
				UnprocessableRequestError,
			);
		});

		it('should persist a sandbox provider override on self-hosted', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsRepository.upsert.mockResolvedValue(undefined as never);
			globalConfig.instanceAi.sandboxProvider = 'n8n-sandbox';

			await expect(
				service.updateAdminSettings({ sandboxProvider: 'daytona' }),
			).resolves.toMatchObject({ sandboxProvider: 'daytona' });
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ value: expect.stringContaining('"sandboxProvider":"daytona"') }),
				['key'],
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
			await expect(
				service.updateAdminSettings({ modelCredentialId: 'cred-1', modelName: 'gpt-4' }),
			).rejects.toThrow('Invalid instance credential');
			expect(instanceCredentialBroker.assignForUse).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'instance-ai:model' }),
				'cred-1',
				operationContext,
			);
		});

		it('requires the model name when changing credentials', async () => {
			await expect(service.updateAdminSettings({ modelCredentialId: 'cred-1' })).rejects.toThrow(
				'modelName must be set together with modelCredentialId',
			);
			expect(instanceCredentialBroker.assignForUse).not.toHaveBeenCalled();
		});

		it('rejects a null model name when assigning a credential', async () => {
			await expect(
				service.updateAdminSettings({ modelCredentialId: 'cred-1', modelName: null }),
			).rejects.toThrow('modelName must be set together with modelCredentialId');
			expect(instanceCredentialBroker.assignForUse).not.toHaveBeenCalled();
		});

		it('rejects clearing the model name while a credential stays assigned', async () => {
			instanceCredentialBroker.getAssignedCredentialId.mockResolvedValue('cred-1');

			await expect(service.updateAdminSettings({ modelName: null })).rejects.toThrow(
				'modelName must be set together with modelCredentialId',
			);
			expect(instanceCredentialBroker.clearForUse).not.toHaveBeenCalled();
		});

		it('rejects a model name without an admin credential', async () => {
			await expect(service.updateAdminSettings({ modelName: 'gpt-4' })).rejects.toThrow(
				'modelName requires modelCredentialId',
			);
		});

		it('does not block unrelated updates on a legacy half pair', async () => {
			instanceCredentialBroker.getAssignedCredentialId.mockResolvedValue('cred-1');

			await expect(service.updateAdminSettings({ mcpAccessEnabled: false })).resolves.toMatchObject(
				{ mcpAccessEnabled: false },
			);
		});

		it('clears the model name when clearing the credential', async () => {
			instanceCredentialBroker.getAssignedCredentialId
				.mockResolvedValueOnce('cred-1')
				.mockResolvedValue(null);
			settingsRepository.findByKey.mockResolvedValue({
				key: 'instanceAi.settings',
				value: JSON.stringify({ modelName: 'gpt-4' }),
				loadOnStartup: true,
			} as never);

			const result = await service.updateAdminSettings({ modelCredentialId: null });

			expect(result).toMatchObject({ modelCredentialId: null, modelName: null });
			expect(instanceCredentialBroker.clearForUse).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'instance-ai:model' }),
				operationContext,
			);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					value: expect.not.stringContaining('modelCredentialId'),
				}),
				['key'],
			);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					value: expect.stringContaining('"modelName":null'),
				}),
				['key'],
			);
		});

		it('uses the admin credential before per-user credentials', async () => {
			const credential = mock<CredentialsEntity>({
				id: 'cred-1',
				name: 'Admin model',
				type: 'openAiApi',
				usageScope: 'instance',
			});
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				data: {
					apiKey: 'admin-key',
					organizationId: 'org-1',
					header: true,
					headerName: 'x-proxy-key',
					headerValue: 'proxy-key',
				},
			});
			instanceCredentialBroker.assignForUse.mockResolvedValue({
				id: credential.id,
				name: credential.name,
				type: credential.type,
			});

			await service.updateAdminSettings({
				modelCredentialId: credential.id,
				modelName: 'gpt-4.1',
			});
			const result = await service.resolveModelConfig(
				mock<User>({
					settings: {
						instanceAi: { credentialId: 'user-credential', modelName: 'gpt-4.1' },
					},
				}),
			);

			expect(result).toEqual({
				id: 'openai/gpt-4.1',
				url: '',
				apiKey: 'admin-key',
				headers: { 'OpenAI-Organization': 'org-1', 'x-proxy-key': 'proxy-key' },
			});
			expect(instanceCredentialBroker.resolveForUse).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'instance-ai:model' }),
			);
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({ value: expect.not.stringContaining('modelCredentialId') }),
				['key'],
			);
		});

		it('keeps the user model paired with the user credential on fallback', async () => {
			instanceCredentialBroker.assignForUse.mockResolvedValue({
				id: 'admin-credential',
				name: 'Admin model',
				type: 'openAiApi',
			});
			await service.updateAdminSettings({
				modelCredentialId: 'admin-credential',
				modelName: 'gpt-admin',
			});
			instanceCredentialBroker.resolveForUse.mockResolvedValue(null);
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
		});

		it('falls back to the user credential when the admin credential data is incomplete', async () => {
			instanceCredentialBroker.assignForUse.mockResolvedValue({
				id: 'admin-credential',
				name: 'Admin model',
				type: 'openAiApi',
			});
			await service.updateAdminSettings({
				modelCredentialId: 'admin-credential',
				modelName: 'gpt-admin',
			});
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

		it('falls back to the full user pair when the instance credential fails to resolve', async () => {
			instanceCredentialBroker.assignForUse.mockResolvedValue({
				id: 'admin-credential',
				name: 'Admin model',
				type: 'openAiApi',
			});
			await service.updateAdminSettings({
				modelCredentialId: 'admin-credential',
				modelName: 'gpt-admin',
			});
			instanceCredentialBroker.resolveForUse.mockRejectedValue(new Error('gone'));
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
				{ credentialUseId: 'instance-ai:model', error: 'gone' },
			);
		});

		it('skips an instance credential assignment without an instance model', async () => {
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'admin-credential',
				name: 'Admin model',
				type: 'openAiApi',
				data: { apiKey: 'admin-key' },
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
			expect(instanceCredentialBroker.resolveForUse).not.toHaveBeenCalled();
		});
		it('reads the configured model credential from the broker', async () => {
			instanceCredentialBroker.getAssignedCredentialId.mockResolvedValue('cred-1');
			settingsRepository.findByKey.mockResolvedValue({
				key: 'instanceAi.settings',
				value: JSON.stringify({ modelName: 'gpt-4' }),
				loadOnStartup: true,
			} as never);
			await service.loadFromDb();

			await expect(service.getAdminSettings()).resolves.toMatchObject({
				modelCredentialId: 'cred-1',
				modelName: 'gpt-4',
			});
		});

		it('reports a dangling assignment without a model name as unconfigured', async () => {
			instanceCredentialBroker.getAssignedCredentialId.mockResolvedValue('cred-1');

			await expect(service.getAdminSettings()).resolves.toMatchObject({
				modelCredentialId: null,
				modelName: null,
			});
		});

		it('rejects assigning a model credential with incomplete data', async () => {
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'cred-1',
				name: 'Admin model',
				type: 'anthropicApi',
				data: {},
			});

			await expect(
				service.updateAdminSettings({ modelCredentialId: 'cred-1', modelName: 'claude-x' }),
			).rejects.toThrow(
				'The field "apiKey" or "url" is required for provider connection type "anthropicApi"',
			);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('accepts a model credential that only provides a base url', async () => {
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'cred-1',
				name: 'Admin model',
				type: 'anthropicApi',
				data: { url: 'http://localhost:1234/v1' },
			});

			await expect(
				service.updateAdminSettings({ modelCredentialId: 'cred-1', modelName: 'claude-x' }),
			).resolves.toBeDefined();
		});

		it('ignores a configured admin credential on cloud', async () => {
			const credential = mock<CredentialsEntity>({
				id: 'cred-1',
				name: 'Admin model',
				type: 'openAiApi',
				usageScope: 'instance',
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
			await service.updateAdminSettings({
				modelCredentialId: credential.id,
				modelName: 'gpt-4',
			});
			vi.clearAllMocks();
			globalConfig.deployment.type = 'cloud';

			await expect(service.resolveModelConfig(mock<User>())).resolves.toBe('openai/gpt-4');
			expect(instanceCredentialBroker.resolveForUse).not.toHaveBeenCalled();
			await expect(service.listInstanceModelCredentials()).resolves.toEqual([]);
		});

		it('ignores a persisted admin model when the proxy is enabled', async () => {
			const logger = mock<Logger>();
			logger.scoped.mockReturnValue(logger);
			Container.set(Logger, logger);
			settingsRepository.findByKey.mockResolvedValue({
				key: 'instanceAi.settings',
				value: JSON.stringify({ modelCredentialId: 'cred-1', modelName: 'admin-model' }),
				loadOnStartup: true,
			} as never);
			await service.loadFromDb();
			aiService.isProxyEnabled.mockReturnValue(true);

			expect(
				service.resolveModelName(
					mock<User>({ settings: { instanceAi: { modelName: 'user-model' } } }),
				),
			).toBe('user-model');
		});
	});

	describe('search credential', () => {
		it('uses the resolved credential data for the search config', async () => {
			globalConfig.instanceAi.braveSearchApiKey = 'env-key';
			globalConfig.instanceAi.searxngUrl = 'https://search.example.com';
			instanceCredentialBroker.resolveForUse.mockResolvedValue({
				id: 'search-credential',
				name: 'Search',
				type: 'braveSearchApi',
				data: { apiKey: 'credential-key' },
			});

			await expect(service.resolveSearchConfig()).resolves.toEqual({
				braveApiKey: 'credential-key',
			});
			expect(logger.warn).not.toHaveBeenCalled();
		});

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
		it('uses the resolved api key instead of the environment api key', async () => {
			globalConfig.instanceAi.n8nSandboxServiceApiKey = 'env-key';
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

	describe('getAdminSettings env-configured flags', () => {
		beforeEach(() => {
			aiService.isProxyEnabled.mockReturnValue(false);
			vi.stubEnv('OPENAI_API_KEY', '');
			vi.stubEnv('ANTHROPIC_API_KEY', '');
			Object.assign(globalConfig.instanceAi, {
				model: 'openai/gpt-4',
				modelApiKey: '',
				modelUrl: '',
				n8nSandboxServiceUrl: '',
			});
		});

		it('reports the model as env-configured when a custom or provider key is set', async () => {
			expect((await service.getAdminSettings()).modelEnvConfigured).toBe(false);

			globalConfig.instanceAi.modelApiKey = 'env-key';
			expect((await service.getAdminSettings()).modelEnvConfigured).toBe(true);

			globalConfig.instanceAi.modelApiKey = '';
			globalConfig.instanceAi.modelUrl = 'http://localhost:1234/v1';
			expect((await service.getAdminSettings()).modelEnvConfigured).toBe(true);

			globalConfig.instanceAi.modelUrl = '   ';
			expect((await service.getAdminSettings()).modelEnvConfigured).toBe(false);

			globalConfig.instanceAi.model = 'anthropic/claude-sonnet-4-6';
			vi.stubEnv('ANTHROPIC_API_KEY', 'provider-key');
			expect((await service.getAdminSettings()).modelEnvConfigured).toBe(true);
		});

		it('checks the environment sandbox provider instead of the active override', async () => {
			globalConfig.instanceAi.sandboxProvider = 'daytona';
			globalConfig.instanceAi.daytonaApiKey = 'dtn-key';
			expect((await service.getAdminSettings()).sandboxEnvConfigured).toBe(false);

			globalConfig.instanceAi.n8nSandboxServiceUrl = 'http://sandbox-api:8080';
			expect((await service.getAdminSettings()).sandboxEnvConfigured).toBe(true);

			globalConfig.instanceAi.sandboxProvider = 'n8n-sandbox';
			globalConfig.instanceAi.n8nSandboxServiceUrl = 'http://sandbox-api:8080';
			expect((await service.getAdminSettings()).sandboxEnvConfigured).toBe(true);

			globalConfig.instanceAi.n8nSandboxServiceUrl = '';
			expect((await service.getAdminSettings()).sandboxEnvConfigured).toBe(false);
		});

		it('reports search as env-configured for brave or searxng', async () => {
			expect((await service.getAdminSettings()).searchEnvConfigured).toBe(false);

			globalConfig.instanceAi.braveSearchApiKey = 'brave-key';
			expect((await service.getAdminSettings()).searchEnvConfigured).toBe(true);

			globalConfig.instanceAi.braveSearchApiKey = '';
			globalConfig.instanceAi.searxngUrl = 'http://searxng:8080';
			expect((await service.getAdminSettings()).searchEnvConfigured).toBe(true);
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
				await expect(service.updateAdminSettings({ sandboxProvider: 'daytona' })).rejects.toThrow(
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
