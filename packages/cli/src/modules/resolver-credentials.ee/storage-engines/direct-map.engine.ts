import { jsonParse, type ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { IStorageEngine } from './interface';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { ResolverCredentialsRepository } from '@n8n/db';

@Service()
export class DirectMapEngine implements IStorageEngine<ICredentialDataDecryptedObject> {
	private readonly map: Map<string, Record<string, ICredentialDataDecryptedObject>> = new Map([
		[
			'gri24y4jkeUT5NRu',
			{
				'supersecrettoken-plus-code-part': {
					token: 'token_from_engine',
				},
			},
		],
	]);

	constructor(
		private readonly logger: Logger,
		private readonly resolverRepository: ResolverCredentialsRepository,
	) {}

	async getSecret(
		credentialId: string,
		accessToken: string,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		if (!credentialId || !accessToken) {
			return;
		}

		const resolved = await this.resolverRepository.findOneBy({
			credentialsId: credentialId,
			key: accessToken,
		});

		if (!resolved) {
			return;
		}

		return jsonParse<ICredentialDataDecryptedObject>(resolved.data);
	}

	async setSecret(
		credentialId: string,
		data: Record<string, string>,
		accessToken: string,
	): Promise<void> {
		this.logger.info(
			`Setting secret for credential ${credentialId} with access token ${accessToken}: ${JSON.stringify(data)}`,
		);

		await this.resolverRepository.save({
			credentialsId: credentialId,
			key: accessToken,
			data: JSON.stringify(data),
		});
	}
}
