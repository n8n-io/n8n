import { Logger } from '@n8n/backend-common';
import type { OperationContext, ServiceAccountCredential } from '@n8n/db';
import { ServiceAccountCredentialRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { Cipher } from 'n8n-core';
import { randomBytes } from 'node:crypto';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

const DEFAULT_CREDENTIAL_TYPE = 'client_secret';
const CLIENT_SECRET_BYTES = 32;

@Service()
export class ServiceAccountCredentialService {
	constructor(
		private readonly serviceAccountCredentialRepository: ServiceAccountCredentialRepository,
		private readonly cipher: Cipher,
		private readonly userRepository: UserRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Provision a new set of client credentials for `targetUserId`. The raw client
	 * secret is generated here and returned exactly once. The stored value is
	 * reversibly encrypted with the instance `Cipher` (the same AES helper used for
	 * all n8n credential encryption) so the runtime can recover it to mint tokens.
	 *
	 * `label` is accepted for API-shape parity but has no storage column yet, so it
	 * is not persisted.
	 */
	async createForUser(
		targetUserId: string,
		_label: string | undefined,
		credentialType = DEFAULT_CREDENTIAL_TYPE,
	): Promise<{ credential: ServiceAccountCredential; rawClientSecret: string }> {
		const user = await this.userRepository.findOneBy({ id: targetUserId });
		if (!user) {
			throw new NotFoundError(`User ${targetUserId} not found`);
		}

		const clientId = generateNanoId();
		const rawClientSecret = randomBytes(CLIENT_SECRET_BYTES).toString('hex');
		const clientSecret = this.cipher.encrypt(rawClientSecret);

		await this.serviceAccountCredentialRepository.insertCredential(
			{ userId: targetUserId, credentialType, clientId, clientSecret },
			{},
		);

		// Re-read to hydrate the generated id and timestamps.
		const credential = await this.serviceAccountCredentialRepository.findByClientId(clientId, {});
		if (!credential) {
			throw new NotFoundError('Service account credential not found after creation');
		}

		// Trace: which service-account user got which client credential. Never the secret.
		this.logger.info('Issued service-account client credential', {
			userId: targetUserId,
			clientId,
		});

		return { credential, rawClientSecret };
	}

	/**
	 * Resolve a credential by client id and decrypt its stored secret. Used by the
	 * inbound `client_credentials` verify path (which then compares constant-time).
	 * Returns `null` when no credential matches the client id.
	 */
	async getDecryptedByClientId(
		clientId: string,
		ctx: OperationContext = {},
	): Promise<{ credential: ServiceAccountCredential; clientSecret: string } | null> {
		const credential = await this.serviceAccountCredentialRepository.findByClientId(clientId, ctx);
		if (!credential) {
			return null;
		}

		return { credential, clientSecret: this.cipher.decrypt(credential.clientSecret) };
	}

	/**
	 * Resolve the service-account credential for `userId` and decrypt its secret.
	 * Used by the outbound mint path. When a user owns multiple credentials the most
	 * recently created one wins. Returns `null` when the user has no credential.
	 */
	async getDecryptedForUser(
		userId: string,
		ctx: OperationContext = {},
	): Promise<{ clientId: string; clientSecret: string } | null> {
		const credentials = await this.serviceAccountCredentialRepository.findByUserId(userId, ctx);
		if (credentials.length === 0) {
			return null;
		}

		const credential = credentials.reduce((latest, candidate) =>
			candidate.createdAt > latest.createdAt ? candidate : latest,
		);

		return {
			clientId: credential.clientId,
			clientSecret: this.cipher.decrypt(credential.clientSecret),
		};
	}

	async list(): Promise<ServiceAccountCredential[]> {
		return await this.serviceAccountCredentialRepository.find();
	}

	async listForUser(targetUserId: string): Promise<ServiceAccountCredential[]> {
		return await this.serviceAccountCredentialRepository.findByUserId(targetUserId, {});
	}

	async delete(id: string): Promise<void> {
		await this.serviceAccountCredentialRepository.deleteById(id, {});
	}
}
