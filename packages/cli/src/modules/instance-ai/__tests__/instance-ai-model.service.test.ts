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

	describe('resolveSubAgentModelConfig', () => {
		it('should return undefined when no sub-agent model is configured', async () => {
			settingsService.resolveSubAgentModelName.mockReturnValue(undefined);
			settingsService.resolveSubAgentModel.mockReturnValue(undefined);

			await expect(service.resolveSubAgentModelConfig(fakeUser)).resolves.toBeUndefined();
			expect(settingsService.resolveModelConfig).not.toHaveBeenCalled();
		});

		it('should resolve the configured sub-agent model via the settings chain off-proxy', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsService.resolveSubAgentModelName.mockReturnValue('claude-haiku-4-5');
			settingsService.resolveSubAgentModel.mockReturnValue('anthropic/claude-haiku-4-5');
			settingsService.resolveModelConfig.mockResolvedValue('anthropic/claude-haiku-4-5' as never);

			await expect(service.resolveSubAgentModelConfig(fakeUser)).resolves.toBe(
				'anthropic/claude-haiku-4-5',
			);
			expect(settingsService.resolveModelConfig).toHaveBeenCalledWith(
				fakeUser,
				'anthropic/claude-haiku-4-5',
			);
		});

		it('should resolve the sub-agent model through the proxy with the bare model name', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			settingsService.resolveSubAgentModelName.mockReturnValue('claude-haiku-4-5');
			settingsService.resolveSubAgentModel.mockReturnValue('anthropic/claude-haiku-4-5');
			const resolveProxyModel = vi
				.spyOn(service, 'resolveProxyModel')
				.mockResolvedValue('proxy-haiku' as never);
			const tokenManager = { getAuthHeaders: vi.fn() } as never;

			await expect(
				service.resolveSubAgentModelConfig(fakeUser, {
					proxyBaseUrl: 'https://proxy',
					tokenManager,
				}),
			).resolves.toBe('proxy-haiku');
			expect(resolveProxyModel).toHaveBeenCalledWith(
				fakeUser,
				'https://proxy',
				tokenManager,
				'claude-haiku-4-5',
			);
		});
	});
});
