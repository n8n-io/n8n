import type { ProjectRuntimeCredentialRule } from '@n8n/api-types';
import { Container, Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { ProjectService } from '@/services/project.service.ee';

import { RuntimeCredentialRulesService } from './runtime-credential-rules.service';

/** Reads the run-time input rules with their effective access in one project. */
@Service()
export class ProjectRuntimeCredentialRulesService {
	constructor(
		private readonly rulesService: RuntimeCredentialRulesService,
		private readonly projectService: ProjectService,
	) {}

	/**
	 * A rule is `blocked` when the request-fed credential type policy of the instance or of the
	 * project denies the credential type of the rule. The caller checks that the user may read the project.
	 */
	async listForProject(projectId: string): Promise<ProjectRuntimeCredentialRule[]> {
		if (!(await this.projectService.findProject(projectId))) {
			throw new NotFoundError(`Project with ID "${projectId}" not found`);
		}

		const rules = this.rulesService.list();
		const blocked = await this.getBlockedTypes(
			[...new Set(rules.map((r) => r.credentialType))],
			projectId,
		);

		return rules.map((rule) => {
			const blockedBy = blocked.get(rule.credentialType) ?? null;
			return {
				alias: rule.alias,
				path: rule.path,
				credentialType: rule.credentialType,
				...(rule.allowedDomains !== undefined && { allowedDomains: rule.allowedDomains }),
				access: blockedBy ? 'blocked' : 'allowed',
				blockedBy,
			};
		});
	}

	/** The type policy module loads on demand. Without it nothing is blocked. */
	private async getBlockedTypes(credentialTypes: string[], projectId: string) {
		const { RequestFedCredentialTypePolicy } = await import(
			'@/modules/type-availability-policies/request-fed-credential-type-policy.js'
		);
		if (!RequestFedCredentialTypePolicy.isActive) {
			return new Map<string, 'instance' | 'project'>();
		}
		return await Container.get(RequestFedCredentialTypePolicy).getBlockedTypes(
			credentialTypes,
			projectId,
		);
	}
}
