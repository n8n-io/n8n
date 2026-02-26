import type { User } from '@n8n/db';
import { ProjectRepository, SecretsProviderConnectionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';

@Service()
export class SecretsProviderAccessCheckService {
	constructor(
		private readonly connectionRepository: SecretsProviderConnectionRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	async isProviderAvailableInProject(providerKey: string, projectId: string): Promise<boolean> {
		return await this.connectionRepository.isProviderAvailableInProject(providerKey, projectId);
	}

	async userHasGlobalScopeOrAnyProjectScope(user: User, scope: Scope): Promise<boolean> {
		if (hasGlobalScope(user, scope)) return true;

		const count = await this.projectRepository
			.createQueryBuilder('project')
			.innerJoin('project.projectRelations', 'relation')
			.innerJoin('relation.role', 'role')
			.innerJoin('role.scopes', 'scope')
			.where('relation.userId = :userId', { userId: user.id })
			.andWhere('scope.slug = :scope', { scope })
			.getCount();

		return count > 0;
	}
}
