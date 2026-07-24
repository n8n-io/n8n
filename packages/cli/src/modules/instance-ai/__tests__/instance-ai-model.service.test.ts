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
		getAuthHeaders = vi.fn();
	},
}));

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
		service = new InstanceAiModelService(settingsService, aiService, outboundHttp);
	});

	afterEach(() => {
		vi.useRealTimers();
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

		it('should retry transient failures when fetching credits', async () => {
			vi.useFakeTimers();
			aiService.isProxyEnabled.mockReturnValue(true);
			const transient = Object.assign(new Error('Bad Gateway'), { statusCode: 502 });
			const client = createClient();
			client.getInstanceAiCredits
				.mockRejectedValueOnce(transient)
				.mockResolvedValue({ creditsQuota: 5700, creditsClaimed: 12 });
			aiService.getClient.mockResolvedValue(client as never);

			const promise = service.getCredits(fakeUser);
			await vi.runAllTimersAsync();

			await expect(promise).resolves.toEqual({
				creditsQuota: 5700,
				creditsClaimed: 12,
			});
			expect(client.getInstanceAiCredits).toHaveBeenCalledTimes(2);
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
});
