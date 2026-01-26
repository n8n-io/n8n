import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectSecretsProviderAccess } from '../entities';

@Service()
export class ProjectSecretsProviderAccessRepository extends Repository<ProjectSecretsProviderAccess> {
	constructor(dataSource: DataSource) {
		super(ProjectSecretsProviderAccess, dataSource.manager);
	}
	async findByProviderKey(providerKey: string): Promise<ProjectSecretsProviderAccess[]> {
		return await this.find({
			where: { providerKey },
			relations: ['project'],
		});
	}

	async findByProjectId(projectId: string): Promise<ProjectSecretsProviderAccess[]> {
		return await this.find({
			where: { projectId },
			relations: ['secretsProviderConnection'],
		});
	}

	async deleteByProviderKey(providerKey: string): Promise<void> {
		await this.delete({ providerKey });
	}

	async setProjectAccess(providerKey: string, projectIds: string[]): Promise<void> {
		// Given we're deleting / re-adding we should probably do it in a single operation
		await this.manager.transaction(async (tx) => {
			await tx.delete(ProjectSecretsProviderAccess, { providerKey });

			if (projectIds.length > 0) {
				const entries = projectIds.map((projectId) =>
					this.create({
						providerKey,
						projectId,
					}),
				);

				await tx.insert(ProjectSecretsProviderAccess, entries);
			}
		});
	}
}
