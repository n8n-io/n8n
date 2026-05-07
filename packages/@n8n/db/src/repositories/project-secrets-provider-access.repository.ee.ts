import { Service } from '@n8n/di';
import { DataSource, EntityManager, In, Repository } from '@n8n/typeorm';

import { ProjectSecretsProviderAccess } from '../entities';
import type { SecretsProviderAccessRole } from '../entities';

@Service()
export class ProjectSecretsProviderAccessRepository extends Repository<ProjectSecretsProviderAccess> {
	constructor(dataSource: DataSource) {
		super(ProjectSecretsProviderAccess, dataSource.manager);
	}
	async findByConnectionId(
		secretsProviderConnectionId: number,
	): Promise<ProjectSecretsProviderAccess[]> {
		return await this.find({
			where: { secretsProviderConnectionId },
			relations: ['project'],
		});
	}

	async findByProjectId(projectId: string): Promise<ProjectSecretsProviderAccess[]> {
		return await this.find({
			where: { projectId },
			relations: ['secretsProviderConnection'],
		});
	}

	async deleteByConnectionId(
		secretsProviderConnectionId: number,
		entityManager: EntityManager = this.manager,
	): Promise<void> {
		await entityManager.delete(this.target, { secretsProviderConnectionId });
	}

	async updateProjectAccess(
		secretsProviderConnectionId: number,
		projectIdsToRemove: string[],
		entriesToAdd: Array<{
			projectId: string;
			role: SecretsProviderAccessRole;
		}>,
	): Promise<void> {
		await this.manager.transaction(async (tx) => {
			if (projectIdsToRemove.length > 0) {
				await tx.delete(ProjectSecretsProviderAccess, {
					secretsProviderConnectionId,
					projectId: In(projectIdsToRemove),
				});
			}

			if (entriesToAdd.length > 0) {
				await tx.insert(
					ProjectSecretsProviderAccess,
					entriesToAdd.map((e) => this.create({ ...e, secretsProviderConnectionId })),
				);
			}
		});
	}
}
