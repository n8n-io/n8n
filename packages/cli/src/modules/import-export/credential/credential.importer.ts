import { CredentialsEntity, CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Credentials } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import type {
	ImportScope,
	ManifestEntry,
	PackageCredentialRequirement,
} from '../import-export.types';
import { CredentialResolver } from './credential.resolver';
import type { SerializedCredential } from './credential.types';

/**
 * Creates empty credential stubs during package import.
 *
 * For each credential entry in the package:
 * - If a credential with the same name + type already exists in the target
 *   project, reuse it (add to credentialBindings map).
 * - Otherwise, create a new CredentialsEntity with empty encrypted data
 *   and share it to the target project.
 *
 * Returns a sourceId → targetId map to be merged into credential bindings
 * so that the workflow importer can remap credential references.
 */
@Service()
export class CredentialImporter {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly credentialResolver: CredentialResolver,
	) {}

	async import(
		scope: ImportScope,
		entries: ManifestEntry[],
		existingBindings: Map<string, string>,
	): Promise<Map<string, string>> {
		const credentialBindings = new Map(existingBindings);
		if (entries.length === 0) return credentialBindings;

		for (const entry of entries) {
			const content = scope.reader.readFile(`${entry.target}/credential.json`);
			const serialized: SerializedCredential = jsonParse(content);

			await this.createStub(
				serialized.id,
				serialized.name,
				serialized.type,
				scope.targetProjectId,
				credentialBindings,
				scope.entityManager,
			);
		}

		return credentialBindings;
	}

	/**
	 * Create credential stubs from requirement data directly, without reading
	 * from the package. Used when unresolved credential requirements need stubs.
	 */
	async createStubsFromRequirements(
		scope: ImportScope,
		requirements: PackageCredentialRequirement[],
		existingBindings: Map<string, string>,
	): Promise<Map<string, string>> {
		const credentialBindings = new Map(existingBindings);
		if (requirements.length === 0) return credentialBindings;

		for (const req of requirements) {
			await this.createStub(
				req.id,
				req.name,
				req.type,
				scope.targetProjectId,
				credentialBindings,
				scope.entityManager,
			);
		}

		return credentialBindings;
	}

	/**
	 * Find an existing credential with the same name + type in the target project,
	 * or create an empty stub. Either way, record the sourceId → targetId mapping.
	 */
	private async createStub(
		sourceId: string,
		name: string,
		type: string,
		targetProjectId: string,
		credentialBindings: Map<string, string>,
		entityManager?: import('@n8n/typeorm').EntityManager,
	): Promise<void> {
		const existing = await this.credentialResolver.findInProject(name, type, targetProjectId);

		if (existing) {
			credentialBindings.set(sourceId, existing.id);
			return;
		}

		// Create an empty credential stub with encrypted empty data
		const credentials = new Credentials({ id: null, name }, type);
		credentials.setData({});
		const encryptedData = credentials.getDataToSave();

		const manager = entityManager ?? this.credentialsRepository.manager;
		const saved = await manager.transaction(async (tx) => {
			const entity = this.credentialsRepository.create({
				name,
				type,
				data: encryptedData.data as string,
			});

			const savedEntity = await tx.save<CredentialsEntity>(entity);

			const sharedCredential = this.sharedCredentialsRepository.create({
				role: 'credential:owner',
				credentials: savedEntity,
				projectId: targetProjectId,
			});

			await tx.save(sharedCredential);

			return savedEntity;
		});

		credentialBindings.set(sourceId, saved.id);
	}
}
