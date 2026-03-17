import { Service } from '@n8n/di';
import { DataSource, In, Repository, type EntityManager } from '@n8n/typeorm';

import { CredentialDependency, type CredentialDependencyType } from '../entities';

type DependencyMutationOptions = {
	credentialId: string;
	dependencyType: CredentialDependencyType;
	dependencyIds: string[];
	entityManager?: EntityManager;
};

@Service()
export class CredentialDependencyRepository extends Repository<CredentialDependency> {
	constructor(dataSource: DataSource) {
		super(CredentialDependency, dataSource.manager);
	}

	async findCredentialIdsByDependencyId(
		dependencyType: CredentialDependencyType,
		dependencyId: string,
	): Promise<string[]> {
		const results = await this.find({
			select: ['credentialId'],
			where: { dependencyType, dependencyId },
		});

		return results.map((result) => result.credentialId);
	}

	async upsertDependenciesForCredential({
		credentialId,
		dependencyType,
		dependencyIds,
		entityManager = this.manager,
	}: DependencyMutationOptions): Promise<void> {
		const uniqueIds = Array.from(new Set(dependencyIds));
		if (uniqueIds.length === 0) return;

		await entityManager
			.createQueryBuilder()
			.insert()
			.into(CredentialDependency)
			.values(
				uniqueIds.map((dependencyId) => ({
					credentialId,
					dependencyType,
					dependencyId,
				})),
			)
			.orIgnore()
			.execute();
	}

	async syncDependenciesForCredential({
		credentialId,
		dependencyType,
		dependencyIds,
		entityManager = this.manager,
	}: DependencyMutationOptions): Promise<void> {
		const nextIds = new Set(dependencyIds);

		const existing = await entityManager.findBy(CredentialDependency, {
			credentialId,
			dependencyType,
		});

		const existingIds = new Set(existing.map(({ dependencyId }) => dependencyId));
		const idsToInsert = [...nextIds].filter((id) => !existingIds.has(id));
		const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

		if (idsToDelete.length > 0) {
			await entityManager.delete(CredentialDependency, {
				credentialId,
				dependencyType,
				dependencyId: In(idsToDelete),
			});
		}

		if (idsToInsert.length > 0) {
			await this.upsertDependenciesForCredential({
				credentialId,
				dependencyType,
				dependencyIds: idsToInsert,
				entityManager,
			});
		}
	}
}
