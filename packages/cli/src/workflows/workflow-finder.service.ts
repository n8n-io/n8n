import type { SharedWorkflow, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, rolesWithScope, type Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';

@Service()
export class WorkflowFinderService {
	constructor(private readonly sharedWorkflowRepository: SharedWorkflowRepository) {}

	async findWorkflowForUser(
		workflowId: string,
		user: User,
		scopes: Scope[],
		options: {
			includeTags?: boolean;
			includeParentFolder?: boolean;
			em?: EntityManager;
		} = {},
	) {
		let where: FindOptionsWhere<SharedWorkflow> = {};

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = rolesWithScope('project', scopes);
			const workflowRoles = rolesWithScope('workflow', scopes);

			where = {
				role: In(workflowRoles),
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const sharedWorkflow = await this.sharedWorkflowRepository.findWorkflowWithOptions(workflowId, {
			where,
			includeTags: options.includeTags,
			includeParentFolder: options.includeParentFolder,
			em: options.em,
		});

		if (!sharedWorkflow) {
			return null;
		}

		return sharedWorkflow.workflow;
	}

	async findAllWorkflowsForUser(user: User, scopes: Scope[]) {
		let where: FindOptionsWhere<SharedWorkflow> = {};

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = rolesWithScope('project', scopes);
			const workflowRoles = rolesWithScope('workflow', scopes);

			where = {
				...where,
				role: In(workflowRoles),
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where,
			relations: {
				workflow: {
					shared: { project: { projectRelations: { user: true } } },
				},
			},
		});

		return sharedWorkflows.map((sw) => ({ ...sw.workflow, projectId: sw.projectId }));
	}
}
