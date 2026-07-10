import { CredentialResolverHandle } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { ICredentialEntriesStorage } from './storage-interface';
import { DynamicCredentialUserEntry } from '../../database/entities/dynamic-credential-user-entry';
import { DynamicCredentialUserEntryRepository } from '../../database/repositories/dynamic-credential-user-entry.repository';

/**
 * Storage implementation for user-specific dynamic credential entries.
 * Stores credential data linked to individual users via credential resolvers.
 */
@Service()
export class DynamicCredentialUserEntryStorage implements ICredentialEntriesStorage {
	constructor(
		private readonly dynamicCredentialUserEntryRepository: DynamicCredentialUserEntryRepository,
	) {}

	/**
	 * Retrieves credential data for a specific user from storage.
	 *
	 * @param credentialId - The ID of the credential
	 * @param userId - The ID of the user who owns the credential data
	 * @param resolverId - The ID of the resolver that resolved this credential
	 * @returns The credential data string, or null if not found
	 */
	async getCredentialData(
		credentialId: string,
		userId: string,
		resolverId: string,
		_: Record<string, unknown>,
	): Promise<string | null> {
		const entry = await this.dynamicCredentialUserEntryRepository.findOne({
			where: {
				credentialId,
				userId,
				resolverId,
			},
		});

		return entry?.data ?? null;
	}

	/**
	 * Stores or updates credential data for a specific user.
	 * Creates a new entry if one doesn't exist, otherwise updates the existing entry.
	 *
	 * @param credentialId - The ID of the credential
	 * @param userId - The ID of the user who owns the credential data
	 * @param resolverId - The ID of the resolver that resolved this credential
	 * @param data - The credential data to store (typically encrypted)
	 */
	async setCredentialData(
		credentialId: string,
		userId: string,
		resolverId: string,
		data: string,
		_: Record<string, unknown>,
	): Promise<void> {
		let entry = await this.dynamicCredentialUserEntryRepository.findOne({
			where: { credentialId, userId, resolverId },
		});

		if (!entry) {
			entry = new DynamicCredentialUserEntry();
			entry.credentialId = credentialId;
			entry.userId = userId;
			entry.resolverId = resolverId;
		}

		entry.data = data;
		await this.dynamicCredentialUserEntryRepository.save(entry);
	}

	/**
	 * Deletes credential data for a specific user from storage.
	 *
	 * @param credentialId - The ID of the credential
	 * @param userId - The ID of the user who owns the credential data
	 * @param resolverId - The ID of the resolver that resolved this credential
	 */
	async deleteCredentialData(
		credentialId: string,
		userId: string,
		resolverId: string,
		_: Record<string, unknown>,
	): Promise<void> {
		await this.dynamicCredentialUserEntryRepository.delete({
			credentialId,
			userId,
			resolverId,
		});
	}

	/**
	 * Deletes all credential entries associated with a specific resolver.
	 * Used when a resolver is removed to clean up all related user credential data.
	 *
	 * @param handle - The resolver handle containing the resolver ID
	 */
	async deleteAllCredentialData(handle: CredentialResolverHandle): Promise<void> {
		await this.dynamicCredentialUserEntryRepository.delete({ resolverId: handle.resolverId });
	}
}
