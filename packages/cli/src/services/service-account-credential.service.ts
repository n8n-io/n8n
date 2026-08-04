import type { ServiceAccountCredential } from '@n8n/db';
import { ServiceAccountCredentialRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { randomBytes } from 'node:crypto';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { PasswordUtility } from '@/services/password.utility';

const DEFAULT_CREDENTIAL_TYPE = 'client_secret';
const CLIENT_SECRET_BYTES = 32;

@Service()
export class ServiceAccountCredentialService {
	constructor(
		private readonly serviceAccountCredentialRepository: ServiceAccountCredentialRepository,
		private readonly passwordUtility: PasswordUtility,
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * Provision a new set of client credentials for `targetUserId`. The raw client
	 * secret is generated here and returned exactly once; only its bcrypt hash is
	 * persisted, so it can never be recovered afterwards.
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
		const clientSecret = await this.passwordUtility.hash(rawClientSecret);

		await this.serviceAccountCredentialRepository.insertCredential(
			{ userId: targetUserId, credentialType, clientId, clientSecret },
			{},
		);

		// Re-read to hydrate the generated id and timestamps.
		const credential = await this.serviceAccountCredentialRepository.findByClientId(clientId, {});
		if (!credential) {
			throw new NotFoundError('Service account credential not found after creation');
		}

		return { credential, rawClientSecret };
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
