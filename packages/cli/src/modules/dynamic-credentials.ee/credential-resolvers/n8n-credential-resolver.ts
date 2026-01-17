import { AuthService } from '@/auth/auth.service';
import {
	CredentialResolver,
	CredentialResolverConfiguration,
	CredentialResolverDataNotFoundError,
	CredentialResolverError,
	CredentialResolverHandle,
	ICredentialResolver,
} from '@n8n/decorators';
import { DynamicCredentialEntryStorage } from './storage/dynamic-credential-entry-storage';
import { Cipher } from 'n8n-core';
import { ICredentialContext, ICredentialDataDecryptedObject, jsonParse } from 'n8n-workflow';
import { Logger } from '@n8n/backend-common';

/**
 * OAuth2 token introspection-based credential resolver.
 * Resolves user identity via OAuth2 token introspection and stores credentials
 * encrypted in the database, keyed by the introspected subject.
 */
@CredentialResolver()
export class N8NCredentialResolver implements ICredentialResolver {
	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly storage: DynamicCredentialEntryStorage,
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

	async validateOptions(_: CredentialResolverConfiguration): Promise<void> {}

	private async resolveIdentifier(
		context: ICredentialContext,
		_: CredentialResolverConfiguration,
	): Promise<string> {
		// TODO: add MFA support, maybe browserId support etc.
		const { user } = await this.authService.validateToken(context.identity);
		return user.id;
	}

	async validateIdentity(identity: string, handle: CredentialResolverHandle): Promise<void> {
		await this.resolveIdentifier(
			{
				identity,
				version: 1,
				metadata: {},
			},
			handle.configuration,
		);
	}
}
