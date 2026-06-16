import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { INode, IWebhookResponseData } from 'n8n-workflow';
import { N8NOAuth2ExtractorMetadata } from './metadata';
import { N8N_OAUTH_EXTRACTOR_NAME } from './n8n-oauth-extractor';
import { TriggerAuthIdentitySeeder } from '@/services/trigger-auth-identity-seeder-proxy.service';

@Service()
export class N8nOAuthIdentitySeeder implements TriggerAuthIdentitySeeder {
	constructor(
		private readonly logger: Logger,
		private readonly cipher: Cipher,
	) {
		this.logger = this.logger.scoped('dynamic-credentials');
	}

	async seed(webhookResultData: IWebhookResponseData, triggerNode: INode): Promise<void> {
		const item = webhookResultData.workflowData?.[0]?.[0];
		if (webhookResultData.triggerAuthIdentity && item) {
			const metadata: N8NOAuth2ExtractorMetadata = {
				resource: webhookResultData.triggerAuthIdentity.resource,
				authToken: webhookResultData.triggerAuthIdentity.token,
			};

			const encryptedMetadata = await this.cipher.encryptV2(metadata);
			item.encryptedMetadata = encryptedMetadata;

			triggerNode.parameters = {
				...triggerNode.parameters,
				executionsHooksVersion: 1,
				contextEstablishmentHooks: {
					hooks: [
						{
							hookName: N8N_OAUTH_EXTRACTOR_NAME,
							isAllowedToFail: true,
						},
					],
				},
			};
		}
	}
}
