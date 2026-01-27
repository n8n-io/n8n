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

import { N8NIdentifier } from './identifiers/n8n-identifier';
import { DynamicCredentialUserEntryStorage } from './storage/dynamic-credential-user-entry-storage';

/**
 * N8N JWT-based credential resolver.
 * Resolves user identity via n8n JWT authentication and stores credentials
 * encrypted in the database per user.
 */
@CredentialResolver()
export class N8NCredentialResolver implements ICredentialResolver {
	constructor(
		private readonly logger: Logger,
		private readonly n8nIdentifier: N8NIdentifier,
		private readonly storage: DynamicCredentialUserEntryStorage,
		private readonly cipher: Cipher,
	) {}

	metadata = {
		name: 'credential-resolver.n8n-1.0',
		description: 'N8N based credential resolver',
		displayName: 'N8N Resolver',
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
		const key = await this.resolveIdentifier(context, handle.configuration);

		const data = await this.storage.getCredentialData(
			credentialId,
			key,
			handle.resolverId,
			handle.configuration,
		);

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
		const key = await this.resolveIdentifier(context, handle.configuration);

		const encryptedData = this.cipher.encrypt(data);

		await this.storage.setCredentialData(
			credentialId,
			key,
			handle.resolverId,
			encryptedData,
			handle.configuration,
		);
	}

	/** Deletes credential data for the given identity. Succeeds silently if not found. */
	async deleteSecret(
		credentialId: string,
		context: ICredentialContext,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const key = await this.resolveIdentifier(context, handle.configuration);
		await this.storage.deleteCredentialData(
			credentialId,
			key,
			handle.resolverId,
			handle.configuration,
		);
	}

	async deleteAllSecrets(handle: CredentialResolverHandle): Promise<void> {
		await this.storage.deleteAllCredentialData(handle);
	}

	async validateOptions(configuration: CredentialResolverConfiguration): Promise<void> {
		return await this.n8nIdentifier.validateOptions(configuration);
	}

	private async resolveIdentifier(
		context: ICredentialContext,
		configuration: CredentialResolverConfiguration,
	): Promise<string> {
		return await this.n8nIdentifier.resolve(context, configuration);
	}

	async validateIdentity(identity: string, handle: CredentialResolverHandle): Promise<void> {
		await this.resolveIdentifier(
			{
				identity,
				version: 1,
				metadata: {
					// Skip browserId check for identity validation only
					// Full session validation happens during actual credential resolution
					browserId: false,
				},
			},
			handle.configuration,
		);
	}
}
