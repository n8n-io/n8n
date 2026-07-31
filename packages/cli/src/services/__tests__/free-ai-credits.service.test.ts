import type { LicenseState } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { FREE_AI_CREDITS_CREDENTIAL_NAME } from '@/constants';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { AiService } from '@/services/ai.service';
import type { UserService } from '@/services/user.service';

import { FreeAiCreditsService } from '../free-ai-credits.service';

describe('FreeAiCreditsService', () => {
	const licenseState = mock<LicenseState>();
	const globalConfig = mock<GlobalConfig>({
		aiAssistant: { baseUrl: 'https://ai-assistant.n8n.io' },
	});
	const aiService = mock<AiService>();
	const credentialsService = mock<CredentialsService>();
	const userService = mock<UserService>();

	const service = new FreeAiCreditsService(
		licenseState,
		globalConfig,
		aiService,
		credentialsService,
		userService,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		licenseState.isAiCreditsLicensed.mockReturnValue(true);
		licenseState.isAiGatewayLicensed.mockReturnValue(false);
		globalConfig.aiAssistant.baseUrl = 'https://ai-assistant.n8n.io';
	});

	describe('isEligible', () => {
		it('returns true when AI credits are licensed, the base URL is set, the gateway is not licensed, and the user has not claimed', () => {
			const user = { settings: {} } as User;

			expect(service.isEligible(user)).toBe(true);
		});

		it('returns false when AI credits are not licensed', () => {
			licenseState.isAiCreditsLicensed.mockReturnValue(false);
			const user = { settings: {} } as User;

			expect(service.isEligible(user)).toBe(false);
		});

		it('returns false when the AI assistant base URL is not configured', () => {
			globalConfig.aiAssistant.baseUrl = '';
			const user = { settings: {} } as User;

			expect(service.isEligible(user)).toBe(false);

			globalConfig.aiAssistant.baseUrl = 'https://ai-assistant.n8n.io';
		});

		it('returns false when the AI gateway is licensed', () => {
			licenseState.isAiGatewayLicensed.mockReturnValue(true);
			const user = { settings: {} } as User;

			expect(service.isEligible(user)).toBe(false);
		});

		it('returns false when the user already claimed free credits', () => {
			const user = { settings: { userClaimedAiCredits: true } } as User;

			expect(service.isEligible(user)).toBe(false);
		});
	});

	describe('claim', () => {
		it('generates credits, creates a managed credential, and marks the user as claimed', async () => {
			const user = { id: 'user123', settings: {} } as User;
			aiService.createFreeAiCredits.mockResolvedValue({
				apiKey: 'sk-test',
				url: 'https://proxy.n8n.io',
			});
			const credential = mock<Awaited<ReturnType<CredentialsService['createManagedCredential']>>>();
			credentialsService.createManagedCredential.mockResolvedValue(credential);

			const result = await service.claim(user, 'project123');

			expect(aiService.createFreeAiCredits).toHaveBeenCalledWith(user);
			expect(credentialsService.createManagedCredential).toHaveBeenCalledWith(
				{
					name: FREE_AI_CREDITS_CREDENTIAL_NAME,
					type: 'openAiApi',
					data: { apiKey: 'sk-test', url: 'https://proxy.n8n.io' },
					projectId: 'project123',
				},
				user,
			);
			expect(userService.updateSettings).toHaveBeenCalledWith('user123', {
				userClaimedAiCredits: true,
			});
			expect(result).toBe(credential);
		});
	});
});
