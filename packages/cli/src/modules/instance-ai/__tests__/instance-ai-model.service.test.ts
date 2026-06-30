import { UNLIMITED_CREDITS } from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';
import type { AiService } from '@/services/ai.service';

import { InstanceAiModelService } from '../instance-ai-model.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';

const fakeUser = { id: 'user-1' } as User;

function createClient() {
	return {
		getBuilderApiProxyToken: vi.fn().mockResolvedValue({ tokenType: 'Bearer', accessToken: 'tok' }),
		getBuilderInstanceCredits: vi.fn().mockResolvedValue({ creditsQuota: 100, creditsClaimed: 5 }),
		getInstanceAiCredits: vi.fn().mockResolvedValue({ creditsQuota: 5700, creditsClaimed: 12 }),
	};
}

describe('InstanceAiModelService', () => {
	const settingsService = mock<InstanceAiSettingsService>();
	const aiService = mock<AiService>();
	const outboundHttp = mock<OutboundHttp>();
	const license = mock<License>();

	let service: InstanceAiModelService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new InstanceAiModelService(settingsService, aiService, outboundHttp, license);
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

		it('should fetch builder credits when feat:instanceAi is absent', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			license.isInstanceAiEnabled.mockReturnValue(false);
			const client = createClient();
			aiService.getClient.mockResolvedValue(client as never);

			await expect(service.getCredits(fakeUser)).resolves.toEqual({
				creditsQuota: 100,
				creditsClaimed: 5,
			});
			expect(client.getBuilderInstanceCredits).toHaveBeenCalledWith({ id: 'user-1' });
			expect(client.getInstanceAiCredits).not.toHaveBeenCalled();
		});

		it('should fetch instance-ai credits when feat:instanceAi is present', async () => {
			aiService.isProxyEnabled.mockReturnValue(true);
			license.isInstanceAiEnabled.mockReturnValue(true);
			const client = createClient();
			aiService.getClient.mockResolvedValue(client as never);

			await expect(service.getCredits(fakeUser)).resolves.toEqual({
				creditsQuota: 5700,
				creditsClaimed: 12,
			});
			expect(client.getInstanceAiCredits).toHaveBeenCalledWith({ id: 'user-1' });
			expect(client.getBuilderInstanceCredits).not.toHaveBeenCalled();
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
