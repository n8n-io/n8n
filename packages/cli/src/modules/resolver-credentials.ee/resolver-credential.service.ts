import { CredentialsRepository } from '@n8n/db';
import { CredentialResolverService } from './credential-resolver.service';
import { Service } from '@n8n/di';
import { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { CredentialsService } from '@/credentials/credentials.service';

@Service()
export class ResolverCredentialService {
	constructor(
		private readonly credentialRepository: CredentialsRepository,
		private readonly credentialService: CredentialsService,
		private readonly credentialResolverService: CredentialResolverService,
	) {}

	async injectData(
		credentialId: string,
		data: ICredentialDataDecryptedObject,
		accessToken: string,
	) {
		// Do we need authorization for the resolver credential itself?
		const credential = await this.credentialRepository.findOneBy({ id: credentialId });
		if (!credential) {
			throw new Error(`Credential with ID ${credentialId} not found`);
		}

		const decryptedCredential = this.credentialService.decrypt(credential);

		await this.credentialResolverService.storeCredentialData(
			credentialId,
			decryptedCredential,
			data,
			accessToken,
		);
	}
}
