import { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';

import { FREE_AI_CREDITS_CREDENTIAL_NAME } from '@/constants';
import { CredentialsService } from '@/credentials/credentials.service';
import { AiService } from '@/services/ai.service';
import { UserService } from '@/services/user.service';

/**
 * Provisions the free OpenAI credits managed credential. Backs both the
 * `POST /ai/free-credits` route (browser-initiated claim) and the agent
 * builder's `resolve_llm` tool (server-initiated silent claim).
 */
@Service()
export class FreeAiCreditsService {
	constructor(
		private readonly licenseState: LicenseState,
		private readonly globalConfig: GlobalConfig,
		private readonly aiService: AiService,
		private readonly credentialsService: CredentialsService,
		private readonly userService: UserService,
	) {}

	/** Whether this user can claim free OpenAI credits right now. */
	isEligible(user: User): boolean {
		return (
			this.licenseState.isAiCreditsLicensed() &&
			!!this.globalConfig.aiAssistant.baseUrl &&
			!this.licenseState.isAiGatewayLicensed() &&
			!user.settings?.userClaimedAiCredits
		);
	}

	/** Claims free credits: provisions the managed openAiApi credential and marks the user as claimed. */
	async claim(user: User, projectId?: string) {
		const aiCredits = await this.aiService.createFreeAiCredits(user);

		const credential = await this.credentialsService.createManagedCredential(
			{
				name: FREE_AI_CREDITS_CREDENTIAL_NAME,
				type: OPEN_AI_API_CREDENTIAL_TYPE,
				data: {
					apiKey: aiCredits.apiKey,
					url: aiCredits.url,
				},
				projectId,
			},
			user,
		);

		await this.userService.updateSettings(user.id, { userClaimedAiCredits: true });

		return credential;
	}
}
