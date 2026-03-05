import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectSecretsProviderAccess } from '../entities';

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

	async deleteByConnectionId(secretsProviderConnectionId: number): Promise<void> {
		await this.delete({ secretsProviderConnectionId });
	}

	async setProjectAccess(secretsProviderConnectionId: number, projectIds: string[]): Promise<void> {
		// Given we're deleting / re-adding we should probably do it in a single operation
		await this.manager.transaction(async (tx) => {
			await tx.delete(ProjectSecretsProviderAccess, { secretsProviderConnectionId });

			if (projectIds.length > 0) {
				const entries = projectIds.map((projectId) =>
					this.create({
						secretsProviderConnectionId,
						projectId,
					}),
				);

				await tx.insert(ProjectSecretsProviderAccess, entries);
			}
		});
	}
}
