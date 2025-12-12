import { Logger } from '@n8n/backend-common';
import {
	CredentialResolver,
	CredentialResolverConfiguration,
	CredentialResolverDataNotFoundError,
	CredentialResolverHandle,
	CredentialResolverValidationError,
	ICredentialResolver,
} from '@n8n/decorators';
import { ICredentialContext, ICredentialDataDecryptedObject } from 'n8n-workflow';
import z from 'zod';

const StubOptionsSchema = z.object({
	prefix: z.string().default(''),
});

type StubOptions = z.infer<typeof StubOptionsSchema>;

/**
 * Simple in-memory credential resolver for testing purposes.
 * Stores credentials by identity without authentication or external storage.
 */
@CredentialResolver()
export class StubCredentialResolver implements ICredentialResolver {
	private secretsStore: Map<string, ICredentialDataDecryptedObject> = new Map();

	constructor(private readonly logger: Logger) {}

	metadata = {
		name: 'credential-resolver.stub-1.0',
		description: 'A stub credential resolver for testing purposes',
		displayName: 'Stub Resolver',
		options: [
			{
				displayName: 'Prefix',
				name: 'prefix',
				type: 'string' as const,
				default: '',
				placeholder: 'Optional prefix for stored credentials',
				description: 'An optional prefix to namespace stored credentials (useful for testing)',
			},
		],
	};

	/** Generates storage key from credential ID, identity, and optional prefix */
	private generateKey(
		credentialId: string,
		context: ICredentialContext,
		options: StubOptions,
	): string {
		return `${options.prefix}:${credentialId}:${context.identity}`;
	}

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
		const key = this.generateKey(credentialId, context, parsedOptions);
		const secret = this.secretsStore.get(key);
		if (!secret) {
			throw new CredentialResolverDataNotFoundError();
		}
		return secret;
	}

	/** Stores credential data for the given identity */
	async setSecret(
		credentialId: string,
		context: ICredentialContext,
		data: ICredentialDataDecryptedObject,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const parsedOptions = await this.parseOptions(handle.configuration);
		const key = this.generateKey(credentialId, context, parsedOptions);
		this.secretsStore.set(key, data);
	}

	/** Deletes credential data for the given identity. Succeeds silently if not found. */
	async deleteSecret(
		credentialId: string,
		context: ICredentialContext,
		handle: CredentialResolverHandle,
	): Promise<void> {
		const parsedOptions = await this.parseOptions(handle.configuration);
		const key = this.generateKey(credentialId, context, parsedOptions);
		this.secretsStore.delete(key);
	}

	private async parseOptions(options: CredentialResolverConfiguration) {
		const result = await StubOptionsSchema.safeParseAsync(options);
		if (result.error) {
			this.logger.error('Invalid options provided to StubCredentialResolver', {
				error: result.error,
			});
			throw new CredentialResolverValidationError(
				`Invalid options for StubCredentialResolver: ${result.error.message}`,
			);
		}
		return result.data;
	}

	async validateOptions(options: CredentialResolverConfiguration): Promise<void> {
		await this.parseOptions(options);
	}

	async validateIdentity(_identity: string, _handle: CredentialResolverHandle): Promise<void> {
		return;
	}
}
