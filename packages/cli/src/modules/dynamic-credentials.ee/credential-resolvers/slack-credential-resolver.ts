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

import { SlackIdentifier, SlackOptionsSchema } from './identifiers/slack-identifier';
import { DynamicCredentialEntryStorage } from './storage/dynamic-credential-entry-storage';

/**
 * Slack-based credential resolver.
 *
 * Supports two validation modes:
 *
 * 1. **Slack Request** (`slack-request`): For Slack slash commands and interactions.
 *    Use with the `SlackRequestExtractor` context establishment hook which validates
 *    the Slack signing secret and extracts user_id from the request body.
 *    The identity is used directly as the subject — no external API call needed.
 *
 * 2. **Slack Auth Test** (`slack-auth-test`): For Slack API tokens passed as Bearer
 *    tokens. Use with the `BearerTokenExtractor` hook. Validates the token by calling
 *    Slack's `auth.test` API and extracts a configurable subject claim (default: user_id).
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
		options: [
			{
				displayName: 'Validation Method',
				name: 'validation',
				type: 'options' as const,
				options: [
					{
						name: 'Slack Request (Slash Commands / Interactions)',
						value: 'slack-request',
						description:
							'Use with SlackRequestExtractor hook. Identity is extracted from Slack request body and verified via signing secret.',
					},
					{
						name: 'Slack Auth Test (API Token)',
						value: 'slack-auth-test',
						description:
							'Use with BearerTokenExtractor hook. Validates Slack API token via auth.test API.',
					},
				],
				default: 'slack-request',
				description: 'How to validate the user identity from Slack',
			},
			{
				displayName: 'Subject Claim',
				name: 'subjectClaim',
				type: 'string' as const,
				default: 'user_id',
				description:
					'Field from Slack auth.test response to use as subject identifier (e.g., user_id, team_id, user)',
				displayOptions: {
					show: {
						validation: ['slack-auth-test'],
					},
				},
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
		const parsedOptions = this.parseOptions(handle.configuration);
		const key = await this.slackIdentifier.resolve(context, parsedOptions);

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
		const parsedOptions = this.parseOptions(handle.configuration);
		const key = await this.slackIdentifier.resolve(context, parsedOptions);

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
		const parsedOptions = this.parseOptions(handle.configuration);
		const key = await this.slackIdentifier.resolve(context, parsedOptions);
		await this.storage.deleteCredentialData(credentialId, key, handle.resolverId, parsedOptions);
	}

	async deleteAllSecrets(handle: CredentialResolverHandle): Promise<void> {
		await this.storage.deleteAllCredentialData(handle);
	}

	private parseOptions(options: CredentialResolverConfiguration) {
		const result = SlackOptionsSchema.safeParse(options);
		if (result.error) {
			this.logger.error('Invalid options provided to SlackCredentialResolver', {
				error: result.error,
			});
			throw new CredentialResolverValidationError(
				`Invalid options for SlackCredentialResolver: ${result.error.message}`,
			);
		}
		return result.data;
	}

	async validateOptions(options: CredentialResolverConfiguration): Promise<void> {
		const parsedOptions = this.parseOptions(options);
		await this.slackIdentifier.validateOptions(parsedOptions);
	}

	async validateIdentity(
		context: ICredentialContext,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const parsedOptions = this.parseOptions(handle.configuration);
		await this.slackIdentifier.resolve(context, parsedOptions);
	}
}
