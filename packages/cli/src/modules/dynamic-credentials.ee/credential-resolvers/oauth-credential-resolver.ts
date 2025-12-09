import { Logger } from '@n8n/backend-common';
import {
	CredentialResolver,
	CredentialResolverConfiguration,
	CredentialResolverDataNotFoundError,
	CredentialResolverHandle,
	CredentialResolverValidationError,
	ICredentialResolver,
} from '@n8n/decorators';
import { Cipher } from 'n8n-core';
import { ICredentialContext, ICredentialDataDecryptedObject, jsonParse } from 'n8n-workflow';
import z from 'zod';

import {
	OAuth2IntrospectionOptionsSchema,
	OAuth2TokenIntrospectionIdentifier,
} from './identifiers/oauth2-introspection-identifier';
import { DynamicCredentialEntryStorage } from './storage/dynamic-credential-entry-storage';

const OAuthCredentialResolverOptionsSchema = z.object({
	...OAuth2IntrospectionOptionsSchema.shape,
});

/**
 * OAuth2 token introspection-based credential resolver.
 * Resolves user identity via OAuth2 token introspection and stores credentials
 * encrypted in the database, keyed by the introspected subject.
 */
@CredentialResolver()
export class OAuthCredentialResolver implements ICredentialResolver {
	constructor(
		private readonly logger: Logger,
		private readonly oAuth2TokenIntrospectionIdentifier: OAuth2TokenIntrospectionIdentifier,
		private readonly storage: DynamicCredentialEntryStorage,
		private readonly cipher: Cipher,
	) {}

	metadata = {
		name: 'credential-resolver.oauth2-1.0',
		description: 'OAuth2 token introspection-based credential resolver',
		displayName: 'OAuth2 Introspection',
		options: [
			{
				displayName: 'Metadata URL',
				name: 'metadataUri',
				type: 'string' as const,
				required: true,
				default: '',
				placeholder: 'https://auth.example.com/.well-known/openid-configuration',
				description: 'OAuth2 server metadata endpoint URL',
			},
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string' as const,
				default: '',
				required: true,
				description: 'OAuth2 client ID for introspection',
			},
			{
				displayName: 'Client Secret',
				name: 'clientSecret',
				type: 'string' as const,
				default: '',
				required: true,
				typeOptions: { password: true },
				description: 'OAuth2 client secret for introspection',
			},
			{
				displayName: 'Subject Claim',
				name: 'subjectClaim',
				type: 'string' as const,
				default: 'sub',
				description: 'Token claim to use as subject identifier',
			},
		],
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
		const parsedOptions = await this.parseOptions(handle.configuration);
		const key = await this.oAuth2TokenIntrospectionIdentifier.resolve(context, parsedOptions);

		const data = await this.storage.getCredentialData(
			credentialId,
			key,
			handle.resolverId,
			parsedOptions,
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
		const parsedOptions = await this.parseOptions(handle.configuration);
		const key = await this.oAuth2TokenIntrospectionIdentifier.resolve(context, parsedOptions);

		const encryptedData = this.cipher.encrypt(data);

		await this.storage.setCredentialData(
			credentialId,
			key,
			handle.resolverId,
			encryptedData,
			parsedOptions,
		);
	}

	/** Deletes credential data for the given identity. Succeeds silently if not found. */
	async deleteSecret(
		credentialId: string,
		context: ICredentialContext,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const parsedOptions = await this.parseOptions(handle.configuration);
		const key = await this.oAuth2TokenIntrospectionIdentifier.resolve(context, parsedOptions);
		await this.storage.deleteCredentialData(credentialId, key, handle.resolverId, parsedOptions);
	}

	private async parseOptions(options: CredentialResolverConfiguration) {
		const result = await OAuthCredentialResolverOptionsSchema.safeParseAsync(options);
		if (result.error) {
			this.logger.error('Invalid options provided to OAuthCredentialResolver', {
				error: result.error,
			});
			throw new CredentialResolverValidationError(
				`Invalid options for OAuthCredentialResolver: ${result.error.message}`,
			);
		}
		return result.data;
	}

	async validateOptions(options: CredentialResolverConfiguration): Promise<void> {
		const parsedOptions = await this.parseOptions(options);
		await this.oAuth2TokenIntrospectionIdentifier.validateOptions(parsedOptions);
	}
}
