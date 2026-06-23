import type { Logger } from '@n8n/backend-common';
import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import type { CredentialsEntity, SettingsRepository, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { AiService } from '@/services/ai.service';

import { AgentsBuilderSettingsService } from '../agents-builder-settings.service';
import { BUILDER_NOT_CONFIGURED_CODE, BuilderNotConfiguredError } from '../errors';

const ENV_KEYS = ['N8N_AI_ANTHROPIC_KEY', 'ANTHROPIC_API_KEY'] as const;

function makeJwt(exp: number): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
	const payload = Buffer.from(JSON.stringify({ sub: 'test', exp })).toString('base64url');
	return `${header}.${payload}.fake-sig`;
}

function clearEnvKeys() {
	for (const key of ENV_KEYS) delete process.env[key];
}

describe('AgentsBuilderSettingsService', () => {
	const logger = mock<Logger>();
	const settingsRepository = mock<SettingsRepository>();
	const aiService = mock<AiService>();
	const credentialsService = mock<CredentialsService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const outboundHttp = mock<OutboundHttp>();
	const user = mock<User>({ id: 'user-1' });

	let service: AgentsBuilderSettingsService;

	beforeEach(() => {
		jest.clearAllMocks();
		clearEnvKeys();
		const transport = mock<HttpTransport>();
		transport.asCustomFetch.mockReturnValue(jest.fn() as unknown as CustomFetch);
		outboundHttp.transport.mockReturnValue(transport);
		service = new AgentsBuilderSettingsService(
			logger,
			settingsRepository,
			aiService,
			credentialsService,
			credentialsFinderService,
			outboundHttp,
		);
	});

	afterAll(() => {
		clearEnvKeys();
	});

	function mockPersistedSettings(value: unknown) {
		settingsRepository.findByKey.mockResolvedValue(
			value === null
				? null
				: ({ key: 'agentBuilder.settings', value: JSON.stringify(value) } as never),
		);
	}

	function mockCustomCredential(opts: {
		credentialType?: string;
		apiKey?: string;
		url?: string;
	}) {
		const credential = mock<CredentialsEntity>({
			id: 'cred-1',
			type: opts.credentialType ?? 'anthropicApi',
		});
		credentialsFinderService.findCredentialById.mockResolvedValue(credential);
		credentialsService.decrypt.mockReturnValue({
			apiKey: opts.apiKey ?? 'sk-test',
			...(opts.url ? { url: opts.url } : {}),
		} as never);
		return credential;
	}

	describe('resolveModelConfig', () => {
		it('mode=default + proxy enabled → returns proxy LanguageModel', async () => {
			mockPersistedSettings({ mode: 'default' });
			const proxyToken = makeJwt(Math.floor(Date.now() / 1000) + 600);
			const getBuilderApiProxyToken = jest
				.fn()
				.mockResolvedValue({ accessToken: proxyToken, tokenType: 'Bearer' });
			aiService.isProxyEnabled.mockReturnValue(true);
			aiService.getClient.mockResolvedValue({
				getApiProxyBaseUrl: () => 'https://proxy.example/api',
				getBuilderApiProxyToken,
			} as never);

			const result = await service.resolveModelConfig(user);

			expect(result.isProxied).toBe(true);
			expect(result.config).toBeDefined();
			expect(result.tracingProxyConfig?.apiUrl).toBe('https://proxy.example/api/langsmith');
			await expect(result.tracingProxyConfig?.getAuthHeaders()).resolves.toEqual({
				Authorization: `Bearer ${proxyToken}`,
				'x-n8n-feature': 'agent-builder',
				'x-n8n-version': expect.any(String),
			});
			expect(getBuilderApiProxyToken).toHaveBeenCalledWith(
				{ id: 'user-1' },
				{ userMessageId: expect.any(String) },
			);
		});

		it('mode=default + proxy disabled + env set → returns env-var anthropic config', async () => {
			mockPersistedSettings({ mode: 'default' });
			aiService.isProxyEnabled.mockReturnValue(false);
			process.env.N8N_AI_ANTHROPIC_KEY = 'sk-env';

			const result = await service.resolveModelConfig(user);

			expect(result).toEqual({
				config: {
					id: 'anthropic/claude-sonnet-4-6',
					apiKey: 'sk-env',
				},
				isProxied: false,
			});
		});

		it('mode=default + proxy disabled + env empty → throws BuilderNotConfiguredError', async () => {
			mockPersistedSettings({ mode: 'default' });
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(service.resolveModelConfig(user)).rejects.toBeInstanceOf(
				BuilderNotConfiguredError,
			);
			await expect(service.resolveModelConfig(user)).rejects.toMatchObject({
				code: BUILDER_NOT_CONFIGURED_CODE,
			});
		});

		it('mode=custom with valid credential → returns provider/model config', async () => {
			mockPersistedSettings({
				mode: 'custom',
				provider: 'anthropic',
				credentialId: 'cred-1',
				modelName: 'claude-3-5-sonnet',
			});
			aiService.isProxyEnabled.mockReturnValue(false);
			mockCustomCredential({ apiKey: 'sk-user' });

			const result = await service.resolveModelConfig(user);

			expect(result).toEqual({
				config: {
					id: 'anthropic/claude-3-5-sonnet',
					apiKey: 'sk-user',
				},
				isProxied: false,
			});
		});

		it('mode=custom with base URL → returns config with baseURL field', async () => {
			mockPersistedSettings({
				mode: 'custom',
				provider: 'openai',
				credentialId: 'cred-1',
				modelName: 'gpt-4o',
			});
			aiService.isProxyEnabled.mockReturnValue(false);
			mockCustomCredential({
				credentialType: 'openAiApi',
				apiKey: 'sk-user',
				url: 'https://custom.example/v1',
			});

			const result = await service.resolveModelConfig(user);

			expect(result).toEqual({
				config: {
					id: 'openai/gpt-4o',
					apiKey: 'sk-user',
					baseURL: 'https://custom.example/v1',
				},
				isProxied: false,
			});
		});

		it('mode=custom for aws-bedrock → maps region + access keys', async () => {
			mockPersistedSettings({
				mode: 'custom',
				provider: 'aws-bedrock',
				credentialId: 'cred-1',
				modelName: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
			});
			aiService.isProxyEnabled.mockReturnValue(false);
			credentialsFinderService.findCredentialById.mockResolvedValue(
				mock<CredentialsEntity>({ id: 'cred-1', type: 'aws' }),
			);
			credentialsService.decrypt.mockReturnValue({
				region: 'us-east-1',
				accessKeyId: 'AKIA...',
				secretAccessKey: 'secret',
			} as never);

			const result = await service.resolveModelConfig(user);

			expect(result).toEqual({
				config: {
					id: 'aws-bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0',
					region: 'us-east-1',
					accessKeyId: 'AKIA...',
					secretAccessKey: 'secret',
				},
				isProxied: false,
			});
		});

		it('mode=custom with unsupported provider id → falls through to env-var fallback', async () => {
			mockPersistedSettings({
				mode: 'custom',
				provider: 'definitely-not-a-provider',
				credentialId: 'cred-1',
				modelName: 'foo',
			});
			aiService.isProxyEnabled.mockReturnValue(false);
			process.env.N8N_AI_ANTHROPIC_KEY = 'sk-env';

			const result = await service.resolveModelConfig(user);

			expect(logger.warn).toHaveBeenCalled();
			expect(result).toEqual({
				config: { id: 'anthropic/claude-sonnet-4-6', apiKey: 'sk-env' },
				isProxied: false,
			});
		});

		it('mode=custom with deleted credential → falls through to env-var fallback and warns', async () => {
			mockPersistedSettings({
				mode: 'custom',
				provider: 'anthropic',
				credentialId: 'cred-deleted',
				modelName: 'claude-3-5-sonnet',
			});
			credentialsFinderService.findCredentialById.mockResolvedValue(null);
			aiService.isProxyEnabled.mockReturnValue(false);
			process.env.N8N_AI_ANTHROPIC_KEY = 'sk-env';

			const result = await service.resolveModelConfig(user);

			expect(logger.warn).toHaveBeenCalled();
			expect(result).toEqual({
				config: { id: 'anthropic/claude-sonnet-4-6', apiKey: 'sk-env' },
				isProxied: false,
			});
		});
	});

	describe('getStatus', () => {
		it('mode=custom + resolvable credential → isConfigured: true', async () => {
			mockPersistedSettings({
				mode: 'custom',
				provider: 'anthropic',
				credentialId: 'cred-1',
				modelName: 'claude-3-5-sonnet',
			});
			credentialsFinderService.findCredentialById.mockResolvedValue(
				mock<CredentialsEntity>({ id: 'cred-1', type: 'anthropicApi' }),
			);

			await expect(service.getStatus()).resolves.toEqual({ isConfigured: true });
		});

		it('mode=custom + missing credential → isConfigured: false', async () => {
			mockPersistedSettings({
				mode: 'custom',
				provider: 'anthropic',
				credentialId: 'cred-1',
				modelName: 'claude-3-5-sonnet',
			});
			credentialsFinderService.findCredentialById.mockResolvedValue(null);

			await expect(service.getStatus()).resolves.toEqual({ isConfigured: false });
		});

		it('mode=default + proxy enabled → isConfigured: true', async () => {
			mockPersistedSettings({ mode: 'default' });
			aiService.isProxyEnabled.mockReturnValue(true);

			await expect(service.getStatus()).resolves.toEqual({ isConfigured: true });
		});

		it('mode=default + proxy disabled + env set → isConfigured: true (env-var backstop counts)', async () => {
			mockPersistedSettings({ mode: 'default' });
			aiService.isProxyEnabled.mockReturnValue(false);
			process.env.N8N_AI_ANTHROPIC_KEY = 'sk-env';

			await expect(service.getStatus()).resolves.toEqual({ isConfigured: true });
		});

		it('mode=default + proxy disabled + ANTHROPIC_API_KEY set → isConfigured: true', async () => {
			mockPersistedSettings({ mode: 'default' });
			aiService.isProxyEnabled.mockReturnValue(false);
			process.env.ANTHROPIC_API_KEY = 'sk-env';

			await expect(service.getStatus()).resolves.toEqual({ isConfigured: true });
		});

		it('mode=default + proxy disabled + env empty → isConfigured: false', async () => {
			mockPersistedSettings({ mode: 'default' });
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(service.getStatus()).resolves.toEqual({ isConfigured: false });
		});

		it('no persisted settings → defaults to mode=default', async () => {
			mockPersistedSettings(null);
			aiService.isProxyEnabled.mockReturnValue(true);

			const status = await service.getStatus();
			expect(status).toEqual({ isConfigured: true });
		});
	});

	describe('updateAdminSettings', () => {
		beforeEach(() => {
			settingsRepository.upsert.mockResolvedValue(undefined as never);
		});

		it('persists mode=default', async () => {
			await service.updateAdminSettings({ mode: 'default' });

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					key: 'agentBuilder.settings',
					value: JSON.stringify({ mode: 'default' }),
				}),
				['key'],
			);
		});

		it('persists mode=custom with required fields', async () => {
			await service.updateAdminSettings({
				mode: 'custom',
				provider: 'anthropic',
				credentialId: 'cred-1',
				modelName: 'claude-3-5-sonnet',
			});

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					key: 'agentBuilder.settings',
					value: JSON.stringify({
						mode: 'custom',
						provider: 'anthropic',
						credentialId: 'cred-1',
						modelName: 'claude-3-5-sonnet',
					}),
				}),
				['key'],
			);
		});

		it('accepts mode=custom for cohere (broad provider support)', async () => {
			await expect(
				service.updateAdminSettings({
					mode: 'custom',
					provider: 'cohere',
					credentialId: 'cred-1',
					modelName: 'command-r',
				}),
			).resolves.not.toThrow();
		});

		it('accepts mode=custom for azure-openai', async () => {
			await expect(
				service.updateAdminSettings({
					mode: 'custom',
					provider: 'azure-openai',
					credentialId: 'cred-1',
					modelName: 'gpt-4o',
				}),
			).resolves.not.toThrow();
		});

		it('accepts mode=custom for nvidia', async () => {
			await expect(
				service.updateAdminSettings({
					mode: 'custom',
					provider: 'nvidia',
					credentialId: 'cred-1',
					modelName: 'nvidia/llama-3.3-nemotron-super-49b-v1',
				}),
			).resolves.not.toThrow();
		});

		it('rejects mode=custom with unknown provider', async () => {
			// Provider shape (non-empty string) is enforced upstream by the Zod
			// schema on the controller. The service only checks the runtime
			// mapper compatibility, since api-types intentionally doesn't know
			// the runtime's supported provider list.
			await expect(
				service.updateAdminSettings({
					mode: 'custom',
					provider: 'definitely-not-a-provider',
					credentialId: 'cred-1',
					modelName: 'foo',
				}),
			).rejects.toThrow(UnprocessableRequestError);
		});
	});
});
