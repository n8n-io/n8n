import { Logger } from '@n8n/backend-common';
import {
	CredentialResolver,
	CredentialResolverConfiguration,
	CredentialResolverDataNotFoundError,
	CredentialResolverHandle,
	ICredentialResolver,
} from '@n8n/decorators';
import { Cipher } from 'n8n-core';
import { ICredentialContext, ICredentialDataDecryptedObject, jsonParse } from 'n8n-workflow';

import { SlackIdentifier } from './identifiers/slack-identifier';
import { DynamicCredentialEntryStorage } from './storage/dynamic-credential-entry-storage';

/**
 * Slack-based credential resolver.
 *
 * Uses the `SlackRequestExtractor` context establishment hook which validates
 * the Slack signing secret and extracts user_id from the request body.
 * The identity is used directly as the subject — no external API call needed.
 */
@CredentialResolver()
export class SlackCredentialResolver implements ICredentialResolver {
	constructor(
		private readonly logger: Logger,
		private readonly slackIdentifier: SlackIdentifier,
		private readonly storage: DynamicCredentialEntryStorage,
		private readonly cipher: Cipher,
	) {}

	metadata = {
		name: 'credential-resolver.slack-1.0',
		description: 'Slack based credential resolver',
		displayName: 'Slack Resolver',
		options: [],
	};

	/**
	 * Retrieves stored credential data for the given identity.
	 * @throws {CredentialResolverDataNotFoundError} When no data exists for the key
	 */
	async getSecret(
		credentialId: string,
		context: ICredentialContext,
		handle: CredentialResolverHandle,
	): Promise<ICredentialDataDecryptedObject> {
		const key = this.slackIdentifier.resolve(context);

		const data = await this.storage.getCredentialData(credentialId, key, handle.resolverId, {});

		if (!data) {
			throw new CredentialResolverDataNotFoundError();
		}
		const plaintext = this.cipher.decrypt(data);
		try {
			const secret = jsonParse<ICredentialDataDecryptedObject>(plaintext);
			return secret;
		} catch (error) {
			this.logger.error('Failed to parse decrypted credential data', { error });
			throw new CredentialResolverDataNotFoundError();
		}
	}

	/** Stores credential data for the given identity */
	async setSecret(
		credentialId: string,
		context: ICredentialContext,
		data: ICredentialDataDecryptedObject,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const key = this.slackIdentifier.resolve(context);
		const encryptedData = this.cipher.encrypt(data);

		await this.storage.setCredentialData(credentialId, key, handle.resolverId, encryptedData, {});
	}

	/** Deletes credential data for the given identity. Succeeds silently if not found. */
	async deleteSecret(
		credentialId: string,
		context: ICredentialContext,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const key = this.slackIdentifier.resolve(context);
		await this.storage.deleteCredentialData(credentialId, key, handle.resolverId, {});
	}

	async deleteAllSecrets(handle: CredentialResolverHandle): Promise<void> {
		await this.storage.deleteAllCredentialData(handle);
	}

	async validateOptions(_options: CredentialResolverConfiguration): Promise<void> {
		// No configurable options — validation is a no-op.
	}

	async validateIdentity(
		context: ICredentialContext,
		_handle: CredentialResolverHandle,
	): Promise<void> {
		this.slackIdentifier.resolve(context);
	}
}
