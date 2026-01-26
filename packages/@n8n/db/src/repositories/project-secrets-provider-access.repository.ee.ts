import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectSecretsProviderAccess } from '../entities';

@Service()
export class ProjectSecretsProviderAccessRepository extends Repository<ProjectSecretsProviderAccess> {
	constructor(dataSource: DataSource) {
		super(ProjectSecretsProviderAccess, dataSource.manager);
	}

	/**
	 * Find all project access entries for a given provider key
	 */
	async findByProviderKey(providerKey: string): Promise<ProjectSecretsProviderAccess[]> {
		return await this.find({
			where: { providerKey },
			relations: ['project'],
		});
	}

	/**
	 * Find all project access entries for a given project ID
	 */
	async findByProjectId(projectId: string): Promise<ProjectSecretsProviderAccess[]> {
		return await this.find({
			where: { projectId },
			relations: ['secretsProviderConnection'],
		});
	}

	/**
	 * Delete all project access entries for a given provider key
	 */
	async deleteByProviderKey(providerKey: string): Promise<void> {
		await this.delete({ providerKey });
	}

	/**
	 * Set project access for a provider (replaces existing entries)
	 */
	async setProjectAccess(providerKey: string, projectIds: string[]): Promise<void> {
		// Delete existing entries
		await this.deleteByProviderKey(providerKey);

		// Create new entries if projectIds provided
		if (projectIds.length > 0) {
			const entries = projectIds.map((projectId) =>
				this.create({
					providerKey,
					projectId,
				}),
			);

			await this.save(entries);
		}
	}
}
