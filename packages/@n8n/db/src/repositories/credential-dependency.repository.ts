import { Service } from '@n8n/di';
import {
	DataSource,
	In,
	Repository,
	type EntityManager,
	type SelectQueryBuilder,
} from '@n8n/typeorm';

import {
	CredentialDependency,
	CredentialsEntity,
	type CredentialDependencyType,
} from '../entities';

export type CredentialDependencyFilter = {
	dependencyType: CredentialDependencyType;
	dependencyId: string;
};

/**
 * Apply dependency filter to a credential query.
 * Expects outer query builder alias to be "credential".
 */
export function addCredentialDependencyExistsFilter(
	qb: SelectQueryBuilder<CredentialsEntity>,
	filter: CredentialDependencyFilter,
) {
	return qb.andWhere(
		`EXISTS (
			SELECT 1
			FROM credential_dependency cd
			WHERE cd."credentialId" = credential.id
				AND cd."dependencyType" = :dependencyType
				AND cd."dependencyId" = :dependencyId
		)`,
		filter,
	);
}

type DependencyMutationOptions = {
	credentialId: string;
	dependencyType: CredentialDependencyType;
	dependencyIds: string[];
	entityManager?: EntityManager;
};

type DeleteByDependencyOptions = {
	dependencyType: CredentialDependencyType;
	dependencyId: string;
	entityManager?: EntityManager;
};

type DeleteByDependenciesOptions = {
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
		if (dependencyIds.length === 0) return;

		const uniqueDependencyIds = Array.from(new Set(dependencyIds));

		await entityManager
			.createQueryBuilder()
			.insert()
			.into(CredentialDependency)
			.values(
				uniqueDependencyIds.map((dependencyId) => ({
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

	async deleteByDependency({
		dependencyType,
		dependencyId,
		entityManager = this.manager,
	}: DeleteByDependencyOptions): Promise<void> {
		await entityManager.delete(CredentialDependency, {
			dependencyType,
			dependencyId,
		});
	}

	async deleteByDependencies({
		dependencyType,
		dependencyIds,
		entityManager = this.manager,
	}: DeleteByDependenciesOptions): Promise<void> {
		if (dependencyIds.length === 0) return;

		await entityManager.delete(CredentialDependency, {
			dependencyType,
			dependencyId: In(dependencyIds),
		});
	}
}
