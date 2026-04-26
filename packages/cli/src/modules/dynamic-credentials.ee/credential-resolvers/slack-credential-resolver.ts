import { Logger } from '@n8n/backend-common';
import {
	CredentialResolver,
	type CredentialResolverConfiguration,
	CredentialResolverDataNotFoundError,
	type CredentialResolverHandle,
	CredentialResolverValidationError,
	type ICredentialResolver,
} from '@n8n/decorators';
import { Cipher } from 'n8n-core';
import {
	type ICredentialContext,
	type ICredentialDataDecryptedObject,
	jsonParse,
} from 'n8n-workflow';
import {
	SlackSignatureIdentifier,
	SlackSignatureOptionsSchema,
} from './identifiers/slack-signature-identifier';
import { DynamicCredentialEntryStorage } from './storage/dynamic-credential-entry-storage';

const SlackCredentialResolverOptionsSchema = SlackSignatureOptionsSchema;

/**
 * Slack-based credential resolver.
 *
 * Uses Slack request signing to verify caller identity and stores per-user
 * credentials keyed by Slack user_id (or team_id:user_id for multi-workspace).
 *
 * Flow:
 * 1. SlackSignatureExtractor hook verifies the Slack signature at trigger time
 *    and sets identity = user_id in the execution context
 * 2. This resolver looks up stored credentials by that identity
 * 3. For authorization, the Slack app calls POST /credentials/:id/authorize
 *    with Slack-signed payload, which triggers OAuth and stores the result
 */
@CredentialResolver()
export class SlackCredentialResolver implements ICredentialResolver {
	constructor(
		private readonly logger: Logger,
		private readonly slackSignatureIdentifier: SlackSignatureIdentifier,
		private readonly storage: DynamicCredentialEntryStorage,
		private readonly cipher: Cipher,
	) {}

	metadata = {
		name: 'credential-resolver.slack-1.0',
		description: 'Slack-based credential resolver using request signatures',
		displayName: 'Slack Resolver',
		options: [
			{
				displayName: 'Slack Signing Secret',
				name: 'signingSecret',
				type: 'string' as const,
				typeOptions: { password: true },
				required: true,
				default: '',
				description:
					'The signing secret from your Slack App (Basic Information → App Credentials → Signing Secret)',
			},
			{
				displayName: 'Subject Claim',
				name: 'subjectClaim',
				type: 'options' as const,
				options: [
					{
						name: 'User ID',
						value: 'user_id',
						description: 'Use Slack user ID as the unique credential key',
					},
					{
						name: 'Team ID + User ID',
						value: 'team_user',
						description:
							'Use team_id:user_id as the key (recommended for Enterprise Grid / multi-workspace)',
					},
				],
				default: 'user_id',
				description: 'How to identify unique credential holders',
			},
		],
	};

	async getSecret(
		credentialId: string,
		context: ICredentialContext,
		handle: CredentialResolverHandle,
	): Promise<ICredentialDataDecryptedObject> {
		const parsedOptions = this.parseOptions(handle.configuration);
		const key = await this.slackSignatureIdentifier.resolve(context, parsedOptions);

		const data = await this.storage.getCredentialData(
			credentialId,
			key,
			handle.resolverId,
			parsedOptions,
		);

		if (!data) {
			throw new CredentialResolverDataNotFoundError();
		}

		try {
			const plaintext = this.cipher.decrypt(data);
			return jsonParse<ICredentialDataDecryptedObject>(plaintext);
		} catch (error) {
			this.logger.error('Failed to decrypt or parse credential data');
			throw new CredentialResolverDataNotFoundError();
		}
	}

	async setSecret(
		credentialId: string,
		context: ICredentialContext,
		data: ICredentialDataDecryptedObject,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const parsedOptions = this.parseOptions(handle.configuration);
		// setSecret is called from the OAuth callback where the identity was already
		// verified during the authorize step and carried via encrypted CSRF state.
		// Use resolveKey() which only derives the storage key without re-verifying.
		const key = this.slackSignatureIdentifier.resolveKey(context, parsedOptions);

		const encryptedData = this.cipher.encrypt(data);

		await this.storage.setCredentialData(
			credentialId,
			key,
			handle.resolverId,
			encryptedData,
			parsedOptions,
		);
	}

	async deleteSecret(
		credentialId: string,
		context: ICredentialContext,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const parsedOptions = this.parseOptions(handle.configuration);
		const key = await this.slackSignatureIdentifier.resolve(context, parsedOptions);
		await this.storage.deleteCredentialData(credentialId, key, handle.resolverId, parsedOptions);
	}

	async deleteAllSecrets(handle: CredentialResolverHandle): Promise<void> {
		await this.storage.deleteAllCredentialData(handle);
	}

	async validateOptions(options: CredentialResolverConfiguration): Promise<void> {
		this.parseOptions(options);
	}

	async validateIdentity(
		context: ICredentialContext,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const parsedOptions = this.parseOptions(handle.configuration);
		// This re-verifies the Slack signature if verification data is in metadata
		await this.slackSignatureIdentifier.resolve(context, parsedOptions);
	}

	private parseOptions(options: CredentialResolverConfiguration) {
		const result = SlackCredentialResolverOptionsSchema.safeParse(options);
		if (!result.success) {
			this.logger.error('Invalid options provided to SlackCredentialResolver', {
				error: result.error,
			});
			throw new CredentialResolverValidationError(
				`Invalid options for SlackCredentialResolver: ${result.error.message}`,
			);
		}
		return result.data;
	}
}
