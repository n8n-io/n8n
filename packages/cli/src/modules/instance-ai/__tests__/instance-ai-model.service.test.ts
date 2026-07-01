import { UNLIMITED_CREDITS } from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AiService } from '@/services/ai.service';

const capturedTokenGetters: Array<() => Promise<unknown>> = [];
vi.mock('@/services/proxy-token-manager', () => ({
	ProxyTokenManager: class {
		constructor(fetchToken: () => Promise<unknown>) {
			capturedTokenGetters.push(fetchToken);
		}
		getAuthHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer ia-tok' });
	},
}));

// Capture the `fetch` wrapper handed to `createAnthropic` so we can assert on the
// headers it injects into proxied model requests.
const capturedAnthropicOptions: Array<{ fetch: typeof fetch }> = [];
vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: (options: { fetch: typeof fetch }) => {
		capturedAnthropicOptions.push(options);
		return (modelName: string) => `model:${modelName}`;
	},
}));

// The proxy fetch just records what it was called with; return a minimal Response.
const proxyFetchCalls: Array<{ init?: RequestInit }> = [];
vi.mock('@/utils/ai-proxy-fetch', () => ({
	createAiProxyFetch: () => async (_input: unknown, init?: RequestInit) => {
		proxyFetchCalls.push({ init });
		return await Promise.resolve(new Response(null, { status: 200 }));
	},
}));

import { ProxyTokenManager } from '@/services/proxy-token-manager';

import { InstanceAiModelService } from '../instance-ai-model.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';

const fakeUser = { id: 'user-1' } as User;

function createClient() {
	return {
		getApiProxyBaseUrl: vi.fn(() => 'https://proxy.base'),
		getInstanceAiApiProxyToken: vi
			.fn()
			.mockResolvedValue({ tokenType: 'Bearer', accessToken: 'ia-tok' }),
		getInstanceAiCredits: vi.fn().mockResolvedValue({ creditsQuota: 5700, creditsClaimed: 12 }),
	};
}

describe('InstanceAiModelService', () => {
	const settingsService = mock<InstanceAiSettingsService>();
	const aiService = mock<AiService>();
	const outboundHttp = mock<OutboundHttp>();

	let service: InstanceAiModelService;

	beforeEach(() => {
		vi.clearAllMocks();
		capturedTokenGetters.length = 0;
		capturedAnthropicOptions.length = 0;
		proxyFetchCalls.length = 0;
		service = new InstanceAiModelService(settingsService, aiService, outboundHttp);
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

	describe('resolveProxyModel', () => {
		async function invokeCapturedFetch() {
			const options = capturedAnthropicOptions.at(-1);
			if (!options) throw new Error('createAnthropic was not called');
			await options.fetch('https://proxy.base/anthropic/v1/messages', { headers: {} });
			const call = proxyFetchCalls.at(-1);
			if (!call) throw new Error('proxy fetch was not called');
			return new Headers(call.init?.headers);
		}

		beforeEach(() => {
			settingsService.resolveModelName.mockReturnValue('claude-sonnet-4-6');
		});

		it('sends the x-n8n-thread-id header on proxied requests when a threadId is given', async () => {
			const tokenManager = new ProxyTokenManager(() => Promise.resolve({}) as never);

			await service.resolveProxyModel(fakeUser, 'https://proxy.base', tokenManager, 'thread-9');

			const headers = await invokeCapturedFetch();
			expect(headers.get('x-n8n-thread-id')).toBe('thread-9');
			expect(headers.get('x-n8n-feature')).toBe('instance-ai');
			expect(headers.get('Authorization')).toBe('Bearer ia-tok');
		});

		it('omits the x-n8n-thread-id header when no threadId is given', async () => {
			const tokenManager = new ProxyTokenManager(() => Promise.resolve({}) as never);

			await service.resolveProxyModel(fakeUser, 'https://proxy.base', tokenManager);

			const headers = await invokeCapturedFetch();
			expect(headers.get('x-n8n-thread-id')).toBeNull();
			expect(headers.get('x-n8n-feature')).toBe('instance-ai');
		});
	});
});
