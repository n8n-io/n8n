import { UNLIMITED_CREDITS } from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AiService } from '@/services/ai.service';

import { InstanceAiModelService } from '../instance-ai-model.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';

const fakeUser = { id: 'user-1' } as User;

function createClient() {
	return {
		getBuilderApiProxyToken: vi.fn().mockResolvedValue({ tokenType: 'Bearer', accessToken: 'tok' }),
		getBuilderInstanceCredits: vi.fn().mockResolvedValue({ creditsQuota: 100, creditsClaimed: 5 }),
	};
}

describe('InstanceAiModelService', () => {
	const settingsService = mock<InstanceAiSettingsService>();
	const aiService = mock<AiService>();
	const outboundHttp = mock<OutboundHttp>();

	let service: InstanceAiModelService;

	beforeEach(() => {
		vi.clearAllMocks();
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

		it('should fetch credits from the proxy client when enabled', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			const client = createClient();
			aiService.getClient.mockResolvedValue(client as never);

			await expect(service.getCredits(fakeUser)).resolves.toEqual({
				creditsQuota: 100,
				creditsClaimed: 5,
			});
			expect(client.getBuilderInstanceCredits).toHaveBeenCalledWith({ id: 'user-1' });
		});
	});

	describe('resolveAgentModelConfig', () => {
		it('should fall back to the settings model config when no proxy is active', async () => {
			aiService.isProxyEnabled.mockReturnValue(false);
			settingsService.resolveModelConfig.mockResolvedValue('anthropic/claude' as never);

			await expect(service.resolveAgentModelConfig(fakeUser)).resolves.toBe('anthropic/claude');
		});
	});
});
