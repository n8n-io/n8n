import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { IRunExecutionData } from 'n8n-workflow';
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

	async seed(runExecutionData: IRunExecutionData, token: string, resource: string): Promise<void> {
		const item = runExecutionData.executionData?.nodeExecutionStack?.[0]?.data?.main;
		const metadata: N8NOAuth2ExtractorMetadata = {
			resource,
			authToken: token,
		};

		const encryptedMetadata = await this.cipher.encryptV2(metadata);
		if (item) {
			this.logger.debug('Seeding n8n OAuth identity into trigger execution data.');
			if (item?.[0]?.[0]) {
				item[0][0].encryptedMetadata = encryptedMetadata;
			} else if (item?.[0]) {
				item[0].push({
					encryptedMetadata,
					json: {},
				});
			} else {
				runExecutionData.executionData!.nodeExecutionStack[0].data.main = [
					[
						{
							encryptedMetadata,
							json: {},
						},
					],
				];
			}
		}

		if (runExecutionData.executionData?.nodeExecutionStack?.[0]) {
			this.logger.debug('Seeding n8n OAuth identity into trigger node parameters.');
			runExecutionData.executionData.nodeExecutionStack[0].node = {
				...runExecutionData.executionData?.nodeExecutionStack?.[0].node,
				parameters: {
					...runExecutionData.executionData?.nodeExecutionStack?.[0].node.parameters,
					executionsHooksVersion: 1,
					contextEstablishmentHooks: {
						hooks: [
							{
								hookName: N8N_OAUTH_EXTRACTOR_NAME,
								isAllowedToFail: true,
							},
						],
					},
				},
			};
		}
	}
}
