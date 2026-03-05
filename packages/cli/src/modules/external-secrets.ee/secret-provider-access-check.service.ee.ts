import {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { RoleService } from '@/services/role.service';

@Service()
export class SecretsProviderAccessCheckService {
	constructor(
		private readonly connectionRepository: SecretsProviderConnectionRepository,
		private readonly projectAccessRepository: ProjectSecretsProviderAccessRepository,
		private readonly roleService: RoleService,
	) {}

	async isProviderAvailableInProject(providerKey: string, projectId: string): Promise<boolean> {
		return await this.connectionRepository.isProviderAvailableInProject(providerKey, projectId);
	}

	/**
	 * Asserts that the project's sharing role on a connection grants all the required scopes.
	 * Throws ForbiddenError if the project's access role does not have the required scopes.
	 */
	async assertConnectionAccess(
		providerKey: string,
		projectId: string,
		requiredScopes: Scope[],
	): Promise<void> {
		const access = await this.projectAccessRepository.findOne({
			where: {
				secretsProviderConnection: { providerKey },
				projectId,
			},
		});

		if (!access) {
			throw new NotFoundError(
				`Connection with key "${providerKey}" not found in project "${projectId}"`,
			);
		}

		const validRoles = await this.roleService.rolesWithScope(
			'secretsProviderConnection',
			requiredScopes,
		);

		if (!validRoles.includes(access.role)) {
			throw new ForbiddenError(
				'Project does not have the required access level for this connection',
			);
		}
	}
}
