import { Logger } from '@n8n/backend-common';
import { CredentialsFinderService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';

import { BOT_CREDENTIAL_TYPE } from './teams-entra-provisioning.service';
import { stringProperty } from '../../integration-helpers';

/**
 * Keeps what n8n did with the channel's Teams app on the channel credential,
 * the only record that outlives the dialog. Each note is a convenience, so a
 * failed write is logged and never fails the action it describes.
 */
@Service()
export class TeamsCredentialNotesService {
	constructor(
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly logger: Logger,
	) {}

	async write(user: User, credentialId: string, notes: Record<string, string>): Promise<void> {
		try {
			const credential = await this.credentialsFinderService.findCredentialForUser(
				credentialId,
				user,
				['credential:update'],
			);
			if (credential?.type !== BOT_CREDENTIAL_TYPE) return;
			// Raw: a redacted read written back would store the blanking sentinel.
			const current = await this.credentialsService.decrypt(credential, true);
			// Decrypt answers `{}` when it fails, and writing that back would erase the secret.
			if (!stringProperty(current, 'clientId')) return;
			if (Object.entries(notes).every(([key, value]) => current[key] === value)) return;

			const updated = { ...current, ...notes };
			const encrypted = await this.credentialsService.createEncryptedData({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				data: updated,
			});
			await this.credentialsService.update(
				credential.id,
				encrypted,
				{ kind: 'user', user },
				updated,
			);
		} catch (error) {
			this.logger.warn('[Teams] Could not write a note on the channel credential', {
				credentialId,
				notes: Object.keys(notes),
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
