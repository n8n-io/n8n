import { Service } from '@n8n/di';

import { ICredentialEntriesStorage } from './storage-interface';
import { DynamicCredentialEntry } from '../../database/entities/dynamic-credential-entry';
import { DynamicCredentialEntryRepository } from '../../database/repositories/dynamic-credential-entry.repository';
import { CredentialResolverHandle } from '@n8n/decorators';

@Service()
export class DynamicCredentialEntryStorage implements ICredentialEntriesStorage {
	constructor(
		private readonly dynamicCredentialEntryRepository: DynamicCredentialEntryRepository,
	) {}

	async getCredentialData(
		credentialId: string,
		subjectId: string,
		resolverId: string,
		_: Record<string, unknown>,
	): Promise<string | null> {
		const entry = await this.dynamicCredentialEntryRepository.findOne({
			where: {
				credentialId,
				subjectId,
				resolverId,
			},
		});

		return entry?.data ?? null;
	}

	async setCredentialData(
		credentialId: string,
		subjectId: string,
		resolverId: string,
		data: string,
		_: Record<string, unknown>,
	): Promise<void> {
		let entry = await this.dynamicCredentialEntryRepository.findOne({
			where: { credentialId, subjectId, resolverId },
		});

		if (!entry) {
			entry = new DynamicCredentialEntry();
			entry.credentialId = credentialId;
			entry.subjectId = subjectId;
			entry.resolverId = resolverId;
		}

		entry.data = data;
		await this.dynamicCredentialEntryRepository.save(entry);
	}

	async deleteCredentialData(
		credentialId: string,
		subjectId: string,
		resolverId: string,
		_: Record<string, unknown>,
	): Promise<void> {
		await this.dynamicCredentialEntryRepository.delete({
			credentialId,
			subjectId,
			resolverId,
		});
	}

	async deleteAllCredentialData(handle: CredentialResolverHandle): Promise<void> {
		await this.dynamicCredentialEntryRepository.delete({ resolverId: handle.resolverId });
	}
}
