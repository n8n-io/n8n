import { UNLIMITED_CREDITS } from '@n8n/api-types';
import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { MockedFunction } from 'vitest';
import { UserError } from 'n8n-workflow';

import type { AiService } from '@/services/ai.service';

const capturedTokenGetters: Array<() => Promise<unknown>> = [];
vi.mock('@/services/proxy-token-manager', () => ({
	ProxyTokenManager: class {
		constructor(
			private readonly fetchToken: () => Promise<{ tokenType: string; accessToken: string }>,
		) {
			capturedTokenGetters.push(fetchToken);
		}
		async getAuthHeaders() {
			const token = await this.fetchToken();
			return { Authorization: `${token.tokenType} ${token.accessToken}` };
		}
	},
}));

import { InstanceAiModelService } from '../instance-ai-model.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';

vi.mock('@n8n/backend-network', () => ({
	OutboundHttp: class OutboundHttp {},
}));

vi.mock('@/services/ai.service', () => ({
	AiService: class AiService {},
}));

vi.mock('../instance-ai-settings.service', () => ({
	InstanceAiSettingsService: class InstanceAiSettingsService {},
}));

vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic:
		(opts?: { apiKey?: string; baseURL?: string; fetch?: typeof fetch }) => (modelId: string) => ({
			provider: 'anthropic',
			modelId,
			apiKey: opts?.apiKey,
			baseURL: opts?.baseURL,
			fetch: opts?.fetch,
			specificationVersion: 'v2',
			doGenerate: vi.fn(),
			doStream: vi.fn(),
		}),
}));

vi.mock('@ai-sdk/openai', () => ({
	createOpenAI:
		(opts?: { apiKey?: string; baseURL?: string; fetch?: typeof fetch }) => (modelId: string) => ({
			provider: 'openai',
			modelId,
			apiKey: opts?.apiKey,
			baseURL: opts?.baseURL,
			fetch: opts?.fetch,
			specificationVersion: 'v2',
			doGenerate: vi.fn(),
			doStream: vi.fn(),
		}),
}));

const fakeUser = { id: 'user-1' } as User;
const originalEnv = process.env;

function makeJwt(exp: number): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
	const payload = Buffer.from(JSON.stringify({ sub: 'test', exp })).toString('base64url');
	return `${header}.${payload}.fake-sig`;
}

function createClient({
	proxyBaseUrl = 'https://proxy.example/api',
	accessToken = makeJwt(Math.floor(Date.now() / 1000) + 600),
} = {}) {
	return {
		getApiProxyBaseUrl: vi.fn(() => proxyBaseUrl),
		getInstanceAiApiProxyToken: vi.fn().mockResolvedValue({ tokenType: 'Bearer', accessToken }),
		getInstanceAiCredits: vi.fn().mockResolvedValue({ creditsQuota: 5700, creditsClaimed: 12 }),
	};
}

describe('InstanceAiModelService', () => {
	const settingsService = mock<InstanceAiSettingsService>();
	const aiService = mock<AiService>();
	const outboundHttp = mock<OutboundHttp>();

	let service: InstanceAiModelService;
	let customFetch: MockedFunction<CustomFetch>;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.HTTP_PROXY;
		delete process.env.HTTPS_PROXY;
		vi.clearAllMocks();
		const transport = mock<HttpTransport>();
		customFetch = vi.fn<CustomFetch>(async () => new Response(null, { status: 200 }));
		transport.asCustomFetch.mockReturnValue(customFetch);
		outboundHttp.transport.mockReturnValue(transport);
		capturedTokenGetters.length = 0;
		service = new InstanceAiModelService(settingsService, aiService, outboundHttp);
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('isProxyEnabled', () => {
		it('should mirror the AI service proxy state', () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			expect(service.isProxyEnabled()).toBe(true);

			aiService.isProxyEnabled.mockReturnValue(false);
			expect(service.isProxyEnabled()).toBe(false);
		});
	});

	describe('getCredits', () => {
		it('should return unlimited credits when the proxy is disabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);

			await expect(service.getCredits(fakeUser)).resolves.toEqual({
				creditsQuota: UNLIMITED_CREDITS,
				creditsClaimed: 0,
			});
			expect(aiService.getClient).not.toHaveBeenCalled();
		});

		it('should fetch instance-ai credits from the proxy client when enabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			const client = createClient();
			aiService.getClient.mockResolvedValue(client as never);

			await expect(service.getCredits(fakeUser)).resolves.toEqual({
				creditsQuota: 5700,
				creditsClaimed: 12,
			});
			expect(client.getInstanceAiCredits).toHaveBeenCalledWith({ id: 'user-1' });
		});
	});

	describe('resolveAgentModelConfig', () => {
		it('should fall back to the settings model config when no proxy is active', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsService.resolveModelConfig.mockResolvedValue('anthropic/claude' as never);

			await expect(service.resolveAgentModelConfig(fakeUser)).resolves.toBe('anthropic/claude');
		});

		it('should route proxied Anthropic models through the Anthropic proxy base URL', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			aiService.getClient.mockResolvedValue(createClient() as never);
			settingsService.resolveProxyModelParts.mockReturnValue({
				provider: 'anthropic',
				modelName: 'claude-sonnet-4-6',
				modelId: 'anthropic/claude-sonnet-4-6',
			});

			const result = (await service.resolveAgentModelConfig(fakeUser)) as unknown as Record<
				string,
				unknown
			>;

			expect(result.provider).toBe('anthropic');
			expect(result.modelId).toBe('claude-sonnet-4-6');
			expect(result.baseURL).toBe('https://proxy.example/api/anthropic/v1');
			expect(result.apiKey).toBe('proxy-managed');
		});

		it('should route proxied OpenAI models through the OpenAI proxy base URL', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			aiService.getClient.mockResolvedValue(
				createClient({ proxyBaseUrl: 'https://proxy.example/api/' }) as never,
			);
			settingsService.resolveProxyModelParts.mockReturnValue({
				provider: 'openai',
				modelName: 'gpt-5.5',
				modelId: 'openai/gpt-5.5',
			});

			const result = (await service.resolveAgentModelConfig(fakeUser)) as unknown as Record<
				string,
				unknown
			>;

			expect(result.provider).toBe('openai');
			expect(result.modelId).toBe('gpt-5.5');
			expect(result.baseURL).toBe('https://proxy.example/api/openai/v1');
			expect(result.apiKey).toBe('proxy-managed');
		});

		it('should add proxy auth and feature headers through the model fetch', async () => {
			const accessToken = makeJwt(Math.floor(Date.now() / 1000) + 600);
			aiService.isProxyEnabled.mockReturnValue(true);
			aiService.getClient.mockResolvedValue(createClient({ accessToken }) as never);
			settingsService.resolveProxyModelParts.mockReturnValue({
				provider: 'openai',
				modelName: 'gpt-5.5',
				modelId: 'openai/gpt-5.5',
			});

			const result = (await service.resolveAgentModelConfig(fakeUser)) as unknown as {
				fetch: CustomFetch;
			};
			await result.fetch('https://proxy.example/api/openai/v1/chat/completions', {
				headers: { Authorization: 'Bearer placeholder' },
			});

			expect(customFetch).toHaveBeenCalledTimes(1);
			const init = customFetch.mock.calls[0]?.[1];
			const headers = new Headers(init?.headers);
			expect(headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
			expect(headers.get('x-n8n-feature')).toBe('instance-ai');
			expect(headers.get('x-n8n-version')).toEqual(expect.any(String));
		});

		it('should not let stale user model preferences override the proxy model', async () => {
			const userWithStalePreferences = {
				id: 'user-1',
				settings: { instanceAi: { modelName: 'claude-stale' } },
			} as User;
			aiService.isProxyEnabled.mockReturnValue(true);
			aiService.getClient.mockResolvedValue(createClient() as never);
			settingsService.resolveProxyModelParts.mockReturnValue({
				provider: 'openai',
				modelName: 'gpt-5.5',
				modelId: 'openai/gpt-5.5',
			});

			const result = (await service.resolveAgentModelConfig(
				userWithStalePreferences,
			)) as unknown as Record<string, unknown>;

			expect(result.provider).toBe('openai');
			expect(result.modelId).toBe('gpt-5.5');
			expect(settingsService.resolveModelName).not.toHaveBeenCalled();
		});

		it('should surface unsupported proxy model providers as user errors', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			aiService.getClient.mockResolvedValue(createClient() as never);
			settingsService.resolveProxyModelParts.mockImplementation(() => {
				throw new UserError('Unsupported Instance AI proxy model provider "google".');
			});

			await expect(service.resolveAgentModelConfig(fakeUser)).rejects.toThrow(
				/Unsupported Instance AI proxy model provider/,
			);
		});

		it('should mint proxy tokens via the instance-ai endpoint when the proxy is active', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			const client = createClient();
			aiService.getClient.mockResolvedValue(client as never);
			vi.spyOn(service, 'resolveProxyModel').mockResolvedValue('model' as never);

			await service.resolveAgentModelConfig(fakeUser);

			expect(capturedTokenGetters).toHaveLength(1);
			await capturedTokenGetters[0]();

			expect(client.getInstanceAiApiProxyToken).toHaveBeenCalledWith(
				{ id: fakeUser.id },
				expect.objectContaining({ userMessageId: expect.any(String) }),
			);
		});
	});
});
